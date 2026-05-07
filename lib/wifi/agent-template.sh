#!/bin/sh
# Otium Wi-Fi Agent v0.4
# Cron: */1 * * * * /usr/sbin/otium-agent.sh
# Config device: /etc/otium-agent.conf

AGENT_VERSION="0.4"
BASE="http://127.0.0.1:80"
HOST="otium-pms.vercel.app"
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
  sed -i '/otium-pms.vercel.app/d' /etc/hosts
  NEW_IP=$(nslookup "$HOST" 1.1.1.1 2>/dev/null \
    | awk '/^Address / && $3 != "1.1.1.1" {print $3}' | head -1)
  echo "127.0.0.1 $HOST" >> /etc/hosts
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
      AP_COUNT=$(ubus call wtpd list_all 2>/dev/null | jsonfilter -e 'length(@)' 2>/dev/null || echo 0)
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
