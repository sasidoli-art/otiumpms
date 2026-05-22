#!/bin/sh
# Otium Wi-Fi Agent v0.5
# Cron: */1 * * * * /usr/sbin/otium-agent.sh
# Config device: /etc/otium-agent.conf

AGENT_VERSION="0.5"
BASE="http://127.0.0.1:80"
# IMPORTANTE: usiamo otiumpms.duckdns.org NON otium-pms.vercel.app.
# Vercel ha Deployment Protection / Bot Detection sul dominio default che
# ritorna 403 a GET /api/wifi/agent/.../pending-commands. Il custom domain
# (DuckDNS CNAME al project Vercel) bypassa la protezione.
HOST="otiumpms.duckdns.org"
PIDFILE="/var/run/otium-agent.pid"
CONF="/etc/otium-agent.conf"

[ -f "$CONF" ] || { logger -t otium-agent "CONF mancante: $CONF"; exit 1; }
. "$CONF"
[ -z "$MAC" ] || [ -z "$TOKEN" ] && { logger -t otium-agent "MAC/TOKEN mancanti in $CONF"; exit 1; }

# ── Single-instance guard ─────────────────────────────────────────────────
if [ -f "$PIDFILE" ]; then
  OLD=$(cat "$PIDFILE")
  kill -0 "$OLD" 2>/dev/null && exit 0
fi
echo $$ > "$PIDFILE"
trap 'rm -f "$PIDFILE"' EXIT INT TERM

log() { logger -t otium-agent "$*"; }

api_get() {
  curl -s --max-time 15 \
    -H "Host: $HOST" \
    -H "Authorization: Bearer $TOKEN" \
    "${BASE}${1}"
}

api_post() {
  curl -s --max-time 15 \
    -H "Host: $HOST" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$2" \
    "${BASE}${1}"
}

# ── 1. Sync Vercel IP in stunnel ──────────────────────────────────────────
sync_vercel_ip() {
  LOCK=/tmp/sync-vercel.lock
  [ -f "$LOCK" ] && return
  touch "$LOCK"
  # Mantengo entry /etc/hosts per ENTRAMBI gli hostname (stunnel + agent
  # devono trovare 127.0.0.1 per il nostro hostname custom)
  sed -i '/otiumpms.duckdns.org/d' /etc/hosts
  sed -i '/otium-pms.vercel.app/d' /etc/hosts
  NEW_IP=$(nslookup "$HOST" 1.1.1.1 2>/dev/null \
    | awk '/^Address / && $3 != "1.1.1.1" {print $3}' | head -1)
  echo "127.0.0.1 otiumpms.duckdns.org" >> /etc/hosts
  echo "127.0.0.1 otium-pms.vercel.app" >> /etc/hosts
  rm -f "$LOCK"
  [ -z "$NEW_IP" ] && return
  CURRENT=$(grep -E '^connect = ' /etc/stunnel/otium.conf | awk -F'= ' '{print $2}')
  [ "$CURRENT" = "$NEW_IP:443" ] && return
  sed -i "s|^connect = .*|connect = $NEW_IP:443|" /etc/stunnel/otium.conf
  /etc/init.d/otium-stunnel restart >/dev/null 2>&1
  log "stunnel IP: $CURRENT -> $NEW_IP:443"
}
sync_vercel_ip

# ── 2. Watchdog stunnel ───────────────────────────────────────────────────
if ! pgrep stunnel >/dev/null 2>&1; then
  log "stunnel down, riavvio"
  /etc/init.d/otium-stunnel start >/dev/null 2>&1
  sleep 2
fi

# ── 3. Heartbeat ──────────────────────────────────────────────────────────
UPTIME=$(awk '{printf "%d", $1}' /proc/uptime)
FW=$(awk -F= '/DISTRIB_REVISION/{gsub(/"/, "", $2); print $2; exit}' /etc/openwrt_release 2>/dev/null)
api_post "/api/wifi/agent/${MAC}/heartbeat" \
  "{\"agentVersion\":\"${AGENT_VERSION}\",\"firmware\":\"${FW}\",\"uptimeSec\":${UPTIME}}" \
  > /dev/null || { log "heartbeat failed"; exit 1; }

# ── 4. Poll pending commands ──────────────────────────────────────────────
RESP=$(api_get "/api/wifi/agent/${MAC}/pending-commands")
CMD0=$(echo "$RESP" | jsonfilter -e '@.commands[0].id' 2>/dev/null)
[ -z "$CMD0" ] && exit 0

# ── 5. Execute & collect results ──────────────────────────────────────────
RESULTS="["
SEP=""
i=0
while true; do
  ID=$(echo "$RESP" | jsonfilter -e "@.commands[$i].id" 2>/dev/null)
  [ -z "$ID" ] && break
  ACTION=$(echo "$RESP" | jsonfilter -e "@.commands[$i].action")
  PARAMS=$(echo "$RESP" | jsonfilter -e "@.commands[$i].params" 2>/dev/null || echo '{}')
  NOW=$(date '+%Y-%m-%dT%H:%M:%SZ')
  OK="true"
  OUT="{}"
  ERR=""

  log "cmd $ID: $ACTION"

  case "$ACTION" in

    ping)
      OUT='{"pong":true}'
      ;;

    get_status)
      WDOG=$(pgrep wifidog > /dev/null && echo true || echo false)
      STUN=$(pgrep stunnel > /dev/null && echo true || echo false)
      # jsonfilter OpenWrt 15.05.1 NON supporta length() - usiamo array iteration + wc -l
      AP_COUNT=$(ubus call wtpd list_all 2>/dev/null | jsonfilter -e '@.list_all[*].mac' 2>/dev/null | wc -l)
      [ -z "$AP_COUNT" ] && AP_COUNT=0
      STUNNEL_IP=$(grep -E '^connect = ' /etc/stunnel/otium.conf | awk -F'= ' '{print $2}')
      OUT="{\"wifidog\":$WDOG,\"stunnel\":$STUN,\"stunnel_ip\":\"$STUNNEL_IP\",\"uptimeSec\":$UPTIME,\"apCount\":$AP_COUNT}"
      ;;

    get_ap_list)
      AP_RAW=$(ubus call wtpd list_all 2>/dev/null || echo '[]')
      OUT="{\"aps\":$AP_RAW}"
      ;;

    list_guest_users)
      MACS=$(uci get wifidog.wifidog.trusted_mac_list 2>/dev/null || echo "")
      OUT="{\"trusted_macs\":\"$MACS\"}"
      ;;

    add_guest_user)
      NEW_MAC=$(echo "$PARAMS" | jsonfilter -e '@.mac' 2>/dev/null)
      if [ -z "$NEW_MAC" ]; then
        OK="false"; ERR="missing mac param"
      else
        CURRENT=$(uci get wifidog.wifidog.trusted_mac_list 2>/dev/null || echo "")
        if echo "$CURRENT" | grep -qi "$NEW_MAC"; then
          OUT="{\"info\":\"already present\",\"mac\":\"$NEW_MAC\"}"
        else
          uci set "wifidog.wifidog.trusted_mac_list=${CURRENT:+$CURRENT }${NEW_MAC}"
          uci commit wifidog
          /etc/init.d/wifidog restart
          OUT="{\"added\":\"$NEW_MAC\"}"
        fi
      fi
      ;;

    revoke_guest_user)
      DEL_MAC=$(echo "$PARAMS" | jsonfilter -e '@.mac' 2>/dev/null)
      if [ -z "$DEL_MAC" ]; then
        OK="false"; ERR="missing mac param"
      else
        CURRENT=$(uci get wifidog.wifidog.trusted_mac_list 2>/dev/null || echo "")
        NEW_LIST=$(echo "$CURRENT" | sed "s/${DEL_MAC}//Ig" | tr -s ' ' | sed 's/^ //;s/ $//')
        uci set "wifidog.wifidog.trusted_mac_list=${NEW_LIST}"
        uci commit wifidog
        /etc/init.d/wifidog restart
        OUT="{\"removed\":\"$DEL_MAC\"}"
      fi
      ;;

    update_agent)
      NEW_URL=$(echo "$PARAMS" | jsonfilter -e '@.url' 2>/dev/null)
      NEW_VER=$(echo "$PARAMS" | jsonfilter -e '@.version' 2>/dev/null || echo "?")
      if [ -z "$NEW_URL" ]; then
        OK="false"; ERR="missing url param"
      else
        TMP=$(mktemp /tmp/otium-agent-XXXXXX)
        HTTP=$(curl -s -o "$TMP" -w "%{http_code}" --max-time 30 \
          -H "Host: $HOST" "$NEW_URL" 2>/dev/null)
        if [ "$HTTP" != "200" ]; then
          rm -f "$TMP"; OK="false"; ERR="download failed: HTTP $HTTP"
        elif ! head -1 "$TMP" | grep -q '^#!'; then
          rm -f "$TMP"; OK="false"; ERR="invalid script (no shebang)"
        else
          cp /usr/sbin/otium-agent.sh /usr/sbin/otium-agent.sh.bak
          chmod +x "$TMP"
          mv "$TMP" /usr/sbin/otium-agent.sh
          OUT="{\"updated\":\"$NEW_VER\"}"
          log "aggiornato a $NEW_VER"
        fi
      fi
      ;;

    # ─── Estensione v0.5 (2026-05-18): remote management ─────────────────

    reboot)
      # Reboot grace 5s per permettere POST result al backend prima del reset
      OUT="{\"scheduled\":\"reboot in 5s\"}"
      ( sleep 5; reboot ) >/dev/null 2>&1 &
      log "reboot scheduled"
      ;;

    restart_wifidog)
      WDOG_OUT=$(/etc/init.d/wifidog restart 2>&1 | head -5)
      OUT="{\"output\":\"$(echo "$WDOG_OUT" | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
      ;;

    reapply_firewall)
      FF_OUT=$(/usr/sbin/otium-firewall-fix.sh 2>&1 | head -10)
      NAT_COUNT=$(iptables -t nat -L WiFiDog_br-lan_AuthWhite -n 2>/dev/null | grep -cE "76\.76|151\.101|216\.198|199\.36|64\.29")
      OUT="{\"vercelIpsInAuthWhite\":$NAT_COUNT,\"output\":\"$(echo "$FF_OUT" | sed 's/"/\\"/g' | tr '\n' ' ')\"}"
      ;;

    pull_logs)
      # Restituisce ultimi 100 righe dei principali log Otium + syslog wifidog
      AGENT_LOG=$(logread 2>/dev/null | grep -i otium-agent | tail -30 | sed 's/"/\\"/g' | tr '\n' '|')
      WIFIDOG_LOG=$(logread 2>/dev/null | grep -i wifidog | tail -30 | sed 's/"/\\"/g' | tr '\n' '|')
      PRUNE_LOG=$(tail -30 /tmp/otium-prune.log 2>/dev/null | sed 's/"/\\"/g' | tr '\n' '|')
      QOS_LOG=$(tail -30 /tmp/otium-qos.log 2>/dev/null | sed 's/"/\\"/g' | tr '\n' '|')
      SYNC_LOG=$(tail -30 /tmp/otium-sync.log 2>/dev/null | sed 's/"/\\"/g' | tr '\n' '|')
      OUT="{\"agent\":\"$AGENT_LOG\",\"wifidog\":\"$WIFIDOG_LOG\",\"prune\":\"$PRUNE_LOG\",\"qos\":\"$QOS_LOG\",\"sync\":\"$SYNC_LOG\"}"
      ;;

    pull_iptables)
      NAT=$(iptables -t nat -S 2>/dev/null | head -80 | sed 's/"/\\"/g' | tr '\n' '|')
      MANGLE=$(iptables -t mangle -S 2>/dev/null | head -60 | sed 's/"/\\"/g' | tr '\n' '|')
      FILTER=$(iptables -S 2>/dev/null | head -60 | sed 's/"/\\"/g' | tr '\n' '|')
      OUT="{\"nat\":\"$NAT\",\"mangle\":\"$MANGLE\",\"filter\":\"$FILTER\"}"
      ;;

    get_extended_status)
      # CPU + RAM + AC mode + interfacce + AP count + client count
      CPU_IDLE=$(top -bn1 2>/dev/null | head -2 | tail -1 | awk '{for(i=1;i<=NF;i++) if($i ~ /idle/) {gsub("%","",$(i-1)); print $(i-1); exit}}')
      [ -z "$CPU_IDLE" ] && CPU_IDLE=100
      CPU_USE=$((100 - CPU_IDLE))
      MEM_TOTAL=$(awk '/MemTotal/{print $2}' /proc/meminfo)
      MEM_FREE=$(awk '/MemAvailable/{print $2}' /proc/meminfo)
      [ -z "$MEM_FREE" ] && MEM_FREE=$(awk '/MemFree/{print $2}' /proc/meminfo)
      MEM_USE_PCT=$(( (MEM_TOTAL - MEM_FREE) * 100 / MEM_TOTAL ))
      WAN_IP=$(ifstatus wan 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)
      LAN_IP=$(ifstatus lan 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)
      GUEST_IP=$(ifstatus guest 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)
      # jsonfilter OpenWrt 15.05.1 NON supporta length() - usiamo array iteration + wc -l
      AP_COUNT=$(ubus call wtpd list_all 2>/dev/null | jsonfilter -e '@.list_all[*].mac' 2>/dev/null | wc -l)
      [ -z "$AP_COUNT" ] && AP_COUNT=0
      # clientCount = somma staCount di tutti i VIF di tutti gli AP (utile dashboard live)
      CLIENT_COUNT=$(ubus call wtpd list_all 2>/dev/null | jsonfilter -e '@.list_all[*].vif[*].staCount' 2>/dev/null | awk '{s+=$1} END {print s+0}')
      [ -z "$CLIENT_COUNT" ] && CLIENT_COUNT=0
      WDOG=$(pgrep wifidog > /dev/null && echo true || echo false)
      STUN=$(pgrep stunnel > /dev/null && echo true || echo false)
      AC_MODE=$(uci get wtpd.@wtpd[0].ac_mode 2>/dev/null || echo unknown)
      OUT="{\"cpuPercent\":$CPU_USE,\"memPercent\":$MEM_USE_PCT,\"memTotalKb\":$MEM_TOTAL,\"uptimeSec\":$UPTIME,\"wanIp\":\"${WAN_IP:-}\",\"lanIp\":\"${LAN_IP:-}\",\"guestIp\":\"${GUEST_IP:-}\",\"apCount\":$AP_COUNT,\"clientCount\":$CLIENT_COUNT,\"wifidog\":$WDOG,\"stunnel\":$STUN,\"acMode\":\"$AC_MODE\"}"
      ;;

    *)
      OK="false"; ERR="unknown action: $ACTION"
      ;;

  esac

  if [ "$OK" = "true" ]; then
    RESULTS="${RESULTS}${SEP}{\"id\":\"$ID\",\"success\":true,\"output\":$OUT,\"executedAt\":\"$NOW\"}"
  else
    RESULTS="${RESULTS}${SEP}{\"id\":\"$ID\",\"success\":false,\"error\":\"$ERR\",\"executedAt\":\"$NOW\"}"
  fi
  SEP=","
  i=$((i + 1))
done

RESULTS="${RESULTS}]"
RES=$(api_post "/api/wifi/agent/${MAC}/command-results" "{\"results\":$RESULTS}")
if [ $? -ne 0 ] || [ -z "$RES" ]; then
  log "command-results failed"
else
  log "done: $RES"
fi
