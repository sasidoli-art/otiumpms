# API Reference — Comfast Controller (OrangeOS V2.6.x)

> Catalogazione completa dell'API del controller Comfast, scoperta via reverse engineering del firmware 2026-04-13.
> Vale per tutta la linea: CF-AC50, CF-AC100, CF-AC101, CF-AC200, CF-AC300 (famiglia V2.6.x firmware).

> **⚠️ Nota su segreti**: questo documento contiene esempi JSON con **placeholder generici** (`<WIFI_PSK>`, `<ADMIN_PSK>`, ecc.). I valori reali del lab di sviluppo sono in `_LOCAL_NOTES.md` (escluso da git via `.gitignore`). I valori reali in produzione sono nel DB Otium o nella password manager dedicato.

---

## Endpoint base

Tutte le API seguono questo schema:

```
POST /cgi-bin/mbox-config?method=GET&section=<nome>     → READ
POST /cgi-bin/mbox-config?method=SET&section=<nome>     → WRITE
POST /cgi-bin/system-status?method=GET&section=<nome>   → READ status
POST /cgi-bin/system-status?method=SET&section=<nome>   → WRITE status/action
POST /cgi-bin/login                                     → auth (IP-based session)
POST /cgi-bin/logout                                    → end session
```

**Auth model**: dopo login con `{"username":"admin","password":"..."}`, la sessione è **IP-based**. Le successive chiamate da quell'IP non richiedono header di sessione.

**Format**: body della request è JSON, risposta è JSON con sempre `{"errCode":0,"errMsg":"OK","configDone":false,...}` in caso di successo.

**Errori comuni**:
- `errCode: 0` → successo
- `errCode: -32601` → "Method not found" / sezione non supporta GET a corpo vuoto (spesso azioni one-shot)
- `errCode: -32002` → "Access denied" (sessione scaduta → ri-login)
- `errCode: -32014` → "Parameters error" (payload struttura non valida)

---

## ⚠️ Asimmetria GET vs SET

**Fondamentale**: la risposta di GET **non è** direttamente un payload valido per SET. Molte sezioni hanno questa pattern:

```js
// GET response
{ "group0": {...}, "group1": {...}, "meta": {...}, "errCode": 0 }

// SET payload expected
{ "action": "modify", "list": [ ...singolo_elemento_normalizzato... ] }
```

**Regola aurea**: prima di ogni implementazione SET di una sezione nuova, leggere il corrispondente file `/www-comfast/common/<section>.js` sul controller per vedere come `saveConfig()` costruisce il payload `arg`.

---

## Sezioni CRITICHE per Otium (con struttura payload nota)

### 🎯 `ac_group_config` — SSID management via gruppi di AP

**Probabilmente la sezione più importante per Otium**. Gestisce i gruppi di AP + la config SSID che viene pushata a tutti gli AP del gruppo via CAPWAP/wtpd.

**GET response** (read):
```json
{
  "group0": { /* template default */ },
  "group1": {
    "group_id": "2",
    "group_name": "homenet",
    "member_mac": "20:0d:b0:71:20:b4 20:0d:b0:74:da:5a 20:0d:b0:74:dd:fc",
    "enable": "1",
    "timing_enable": "1",
    "timing_weeks": "1,2,3,4,5,6,0",
    "timing_time": "03:00",
    "kickout_disable": "0",
    "kickout_check_period": "5",
    "kickout_kickout_period": "600",
    "kickout_signal_flag": "65",
    "wlan_hidden_24g": "0",
    "wlan_hidden_5g": "0",
    "wlan_maxassoc_24g": "256",
    "wlan_maxassoc_5g": "256",
    "wlan_beacon_int": "100",
    "wlan_dtim_period": "2",
    "wlan_isolate": "0",
    "radio_rts": "2347",
    "ssid_vid_sup": "1",
    "radio": [
      {"phyname":"radio0","htmode":"HT40","country":"GB","is_5g":"0","wpa_group_rekey":"86400",...},
      {"phyname":"radio1","htmode":"VHT80","country":"GB","is_5g":"1","wpa_group_rekey":"86400",...}
    ],
    "vif": [
      {"name":"wlan0","ssid":"homenet","encryp_way":"psk2","key":"<WIFI_PSK>","vid":"1","is_5g":"0","disabled":"0",...},
      {"name":"wlan1","ssid":"homenet_dom",...},
      {"name":"wlan_admin_2g","ssid":"COMFAST","disabled":"1",...},
      {"name":"wlan8","ssid":"homenet_5g","is_5g":"1",...},
      {"name":"wlan_admin_5g","ssid":"COMFAST","disabled":"1","is_5g":"1",...}
    ]
  },
  "group_sum": {"group_sum":2,"group_id_new":"3"},
  "ssid_vid_min": 4,
  "ssid_vid_max": 127,
  "errCode": 0
}
```

**SET payload** (write) — **struttura DIVERSA**:
```json
{
  "group_action": "modify",
  "group_config": [
    {
      "group_id": 2,
      "group_name": "homenet",
      "timing_enable": "1",
      "timing_weeks": "1,2,3,4,5,6,0",
      "timing_time": "03:00",
      "interval_enable": "0",
      "interval_time": "",
      "ssid_vid_sup": 1,
      "uptime": 23200,
      "led_state": 1,
      "radio_rts": 2347,
      "wlan_beacon_int": 100,
      "wlan_dtim_period": 2,
      "wlan_short_preamble": 0,
      "wlan_isolate": 0,
      "wlan_hidden_24g": 0,
      "wlan_hidden_5g": 0,
      "wlan_maxassoc_24g": 256,
      "wlan_maxassoc_5g": 256,
      "radio": [
        {"phyname":"radio0","htmode":"HT40","country":"GB","channel":0,"shortgi":1,"txpower_level":1000,"wpa_group_rekey":86400,"is_5g":0},
        {"phyname":"radio1","htmode":"VHT80","country":"GB","channel":0,"shortgi":1,"txpower_level":1000,"wpa_group_rekey":86400,"is_5g":1}
      ],
      "vif": [
        {"name":"wlan0","phyname":"radio0","ssid":"homenet","encryp_way":"psk2","key":"<WIFI_PSK>","disabled":0,"is_5g":0,"vid":1},
        {"name":"wlan1","phyname":"radio0","ssid":"homenet_dom","encryp_way":"psk2","key":"<WIFI_PSK>","disabled":0,"is_5g":0,"vid":1},
        {"name":"wlan_admin_2g","phyname":"radio0","ssid":"COMFAST","encryp_way":"psk2","key":"<ADMIN_PSK>","disabled":1,"is_5g":0,"vid":1},
        {"name":"wlan8","phyname":"radio1","ssid":"homenet_5g","encryp_way":"psk2","key":"<WIFI_PSK>","disabled":0,"is_5g":1,"vid":1},
        {"name":"wlan9","phyname":"radio1","ssid":"Otium_Guest","encryp_way":"none","key":"","disabled":0,"is_5g":1,"vid":10},
        {"name":"wlan_admin_5g","phyname":"radio1","ssid":"COMFAST","encryp_way":"psk2","key":"<ADMIN_PSK>","disabled":1,"is_5g":1,"vid":1}
      ]
    }
  ]
}
```

**Regole critiche**:
1. **Tipi**: `disabled`, `is_5g`, `vid`, `wlan_*` come **integer**, non stringa. JSON `"vid":"1"` fallisce; `"vid":1` funziona.
2. **Ordine vif**: il vif `wlan_admin_*` deve essere **alla fine del proprio gruppo radio**. Inserire un vif dopo l'admin causa `errCode:-32014 "Parameters error"`.
3. **Stats**: rimuovere campi di statistiche (rx_bytes, tx_bytes, staCount, rx_packets, ecc.) dai vif. Sono presenti nella GET ma non accettati in SET.
4. **Naming vif slot**: wlan0-wlan6 = user slot 2.4G, wlan7 = wlan_admin_2g, wlan8-wlan14 = user slot 5G, wlan15 = wlan_admin_5g.
5. **Propagazione**: dopo SET, wtpd push automatica via CAPWAP a tutti gli AP del gruppo (in base a `member_mac`). Tempo di propagazione: <5 secondi.
6. **SAFE per operazioni remote**: testato live, non triggera network restart.

**Uso tipico in Otium**:
- Modificare SSID guest (es. dal rebranding struttura)
- Rotazione password Wi-Fi guest
- Attivazione/disattivazione temporanea di un SSID (es. disabilitare guest Wi-Fi in bassa stagione)
- Push di un nuovo SSID (aggiunta vif)

---

### 🎯 `portal_account_config` — gestione utenti captive portal mode "hotel"

Gestisce la lista utenti autorizzati quando il captive portal (`wifilith_config`) è in mode `hotel` (username + password per ospite).

**GET response**:
```json
{
  "list": [ /* array di oggetti user */ ],
  "errCode": 0,
  "errMsg": "OK"
}
```

**SET payload**:
```json
{
  "list": [
    {"username":"cam1-20260510","password":"a7b8c9","valid_from":"2026-05-10T14:00","valid_to":"2026-05-12T11:00","desc":"Rossi, cam 1"},
    {"username":"cam3-20260511","password":"k2m4n6","valid_from":"2026-05-11T14:00","valid_to":"2026-05-13T11:00","desc":"Bianchi, cam 3"},
    ...
  ]
}
```

**⚠️ Nota**: è un **replace-all**, non incrementale. La lista che mandi sostituisce integralmente la lista esistente. Quindi per aggiungere un utente, devi:
1. GET la lista corrente
2. Append il nuovo utente
3. SET la lista completa

**Uso tipico in Otium**:
- Al check-in creato nel PMS, aggiungere utente alla lista
- Al check-out, rimuovere l'utente
- Bulk: importare lista da Excel per walk-in giornalieri

**Probabilmente SAFE per operazioni remote** (da confermare con test, modifica DB utenti non dovrebbe triggerare network restart).

---

### 🎯 `wifilith_config` — captive portal config

**GET response**:
```json
{
  "localauth": {
    "type": "local",
    "enable": "0",
    "extauth": "portal",
    "extiface": "lan1",
    "timeout": "43200",
    "guest_ipaddr": "",
    "guest_netmask": "",
    "guest_ssid": "",
    "appid": "",
    "shop_id": "",
    "secretkey": "",
    "wxpay_appid": "",
    "wxpay_mch_id": "",
    "wxpay_key": "",
    "wxpay_body": "",
    "wxpay_total_fee": "",
    "rate": "",
    "whitemac": ""
  },
  "errCode": 0
}
```

**Campi chiave**:
- `enable`: "0"=off, "1"=on
- `type`: `close`, `hotel`, `code`, `user`, `password`, `weixin`, `wxpay`, `onekey`, `traffic`
- `extiface`: interfaccia su cui bindare il portale (⭐ campo "Bind local interface" della UI). In AC mode è scelto da dropdown di interfacce esistenti; in non-AC mode è hardcoded "guest".
- `timeout`: durata sessione utente, in secondi (default 43200 = 12 ore)
- `whitemac`: MAC list esclusi dall'auth (CSV)
- `rate`: bandwidth limit per client (0 = illimitato)

**Modalità supportate** dal campo `type`:
- `hotel`: username + password (un account per ospite/camera) — **target per Otium**
- `code`: singolo PIN/password per tutti
- `user`: username + password (simile a hotel ma diverso backend)
- `password`: solo password
- `weixin`: WeChat login (Cina, irrilevante per IT)
- `wxpay`: WeChat Pay (idem)
- `onekey`: 1-click accept T&C, no auth
- `traffic`: limit by data consumption

**Modalità AC vs non-AC**:
- In **AC mode** (il nostro caso, CF-AC300 gestisce AP): `extiface` è un dropdown di interfacce esistenti. Serve prima creare una VLAN (`vlan_config`) per avere un'interfaccia "guest" dedicata.
- In **non-AC mode** (controller standalone): il firmware crea in autonomia una guest subnet con `guest_ipaddr/netmask/ssid`.

**⚠️ Potenzialmente UNSAFE per operazioni remote**: ha un proprio `procd reload trigger` (in `/etc/init.d/wifilith`) che richiama `wifidog restart` quando cambia la config → breve flap della gestione portale. Dovrebbe NON triggerare network restart globale. **Da validare con test**.

---

### 🎯 `wifidog_config` — config di basso livello del captive portal

È il "motore" sotto `wifilith_config`. Normalmente gestito automaticamente dal firmware quando cambi `wifilith_config`, ma modificabile direttamente per casi avanzati.

**GET response**:
```json
{
  "wifidog": {
    "enabled": "0",
    "gateway_id": "",
    "hostname": "c.weifeinet.com",
    "httpport": "80",
    "path": "/",
    "httpd_max_conn": "32",
    "trusted_mac_list": "",
    "trusted_web_list": ""
  },
  "errCode": 0
}
```

**Campi**:
- `enabled`: "0"=off, "1"=on
- `hostname`: server auth esterno (default `c.weifeinet.com` = server Comfast Cina). **DEVE ESSERE CAMBIATO** a `api.otium.cloud` per usare Otium come auth server.
- `httpport`: porta wifidog gateway (default 2060, non 80)
- `httpd_max_conn`: max connessioni simultanee al portale
- `trusted_mac_list`: MAC che bypassano captive portal (es. operatore struttura) - CSV con `;` separator
- `trusted_web_list`: URL che bypassano captive portal (es. servizi di check-in del PMS) - CSV con `;`

**Uso tipico in Otium**:
- Impostare `hostname` = server Otium cloud (redirect auth)
- Aggiornare `trusted_mac_list` quando cliente vuole dispositivi staff esclusi dal portale
- Aggiornare `trusted_web_list` per permettere accesso diretto a URL specifici senza auth (es. sito struttura)

---

### 🎯 `vlan_config` — gestione VLAN 802.1q

Consente di creare VLAN tagged sulle interfacce fisiche/logiche del controller.

**GET response** (quando vuota):
```json
{
  "mport": "1",
  "vlan_min": "2",
  "vlan_max": "4094",
  "vlan_itype": "line",
  "double_support": "1",
  "errCode": 0
}
```

**SET payload** (creazione VLAN):
```json
{
  "action": "add",
  "list": [
    {
      "action": "add",
      "id": "10",
      "ipaddr": "172.17.0.1",
      "netmask": "255.255.255.0",
      "desc": "Otium Guest",
      "port": "lan1"
    }
  ]
}
```

**Campi**:
- `id`: VLAN ID 802.1q (range `vlan_min`-`vlan_max` = 2-4094)
- `ipaddr`: IP del gateway della VLAN
- `netmask`: netmask, valori supportati dal dropdown UI (/30 fino a /9)
- `desc`: descrizione max 32 char
- `port`: nome della "designate LAN" (lowercase) — es. `"lan1"` = tutta la designate LAN1

**🔴 UNSAFE per operazioni remote**: la creazione/modifica di VLAN probabilmente triggera `/etc/init.d/network restartall` che **cancella i lease DHCP** e restarta i bridge → downtime 10-30 secondi → remote desktop cade. **MUST use auto-revert wrapper**.

**Uso tipico in Otium**:
- **Setup iniziale** di una nuova struttura cliente (creazione VLAN guest una tantum)
- Generalmente non modificato dopo il primo setup

---

### 🎯 `network_config` — config network read-only (overview)

**GET response**: overview completo di WAN, LAN, DHCP status, connessioni attive, working mode.

```json
{
  "wanlist": [
    {"proto":"dhcp","wan_ipaddr":"192.168.8.116","iface":"wan","ifname":"eth0","name":"wan1"},
    {"proto":"dhcp","wan_ipaddr":"","iface":"wan1","ifname":"eth1","name":"wan2"}
  ],
  "lanlist": [
    {"iface":"lan","ifname":"eth5 eth3 eth2 eth4","ipaddr":"172.16.0.1","name":"lan1"}
  ],
  "workmode": {"workmode":"router"},
  "dhcp": {"num":13},
  "wireless_num": {"wireless_num_sum":0},
  "device": {"tcp":"21","udp":"7","total":"28"},
  "ac_ap_status": {"ac_type":"cascade"},
  "wwan_status": {"wwan_status":"0"},
  "ip_wds_info": {"wan_ipaddr":"192.168.8.116","wan_netmask":"255.255.255.0","wan_gateway":"192.168.8.1"},
  "bridge_status": {"bridge_status":"0"},
  "errCode": 0
}
```

**Uso**: diagnostica rapida dallo stato del controller.

---

### 🎯 `ac_list_get` — elenco completo AP gestiti con stato live

**GET response** (~8KB): elenco di tutti gli AP registrati con il controller, con stato corrente, traffic stats, client count, firmware, uptime, ecc.

È la versione "cotta" (read-only) di `ubus call wtpd list_all` che avevamo visto via SSH.

**Uso in Otium**: polling periodico dall'agent per heartbeat → `POST /v1/devices/X/ap-status` al cloud con il payload.

---

### 🎯 `lan_dhcp_config` — pool DHCP della LAN

**GET response**:
```json
{
  "lanlist": [
    {
      "iface": "lan",
      "ifname": "eth5 eth3 eth2 eth4",
      "macaddr": "40:a5:ef:e2:3f:7f",
      "proto": "static",
      "ipaddr": "172.16.0.1",
      "netmask": "255.255.0.0",
      "gateway": "",
      "dns": "",
      "otherlanaccess": "1",
      "name": "lan1",
      "dhcp": {
        "enable": "1",
        "start": "100",
        "limit": "5000",
        "leasetime": "7200",
        "domain": "COMFAST",
        "dns": ""
      }
    }
  ],
  "errCode": 0
}
```

**🔴 UNSAFE per operazioni remote**: modifica di DHCP probabilmente triggera restart dhcpd → possibile breve disservizio. Usare auto-revert.

---

### `radius_config` — RADIUS client config

**GET response**:
```json
{
  "radius": {
    "enable": "",
    "server": "",
    "nas_iden": "",
    "secret_key": "",
    "auth_port": "1812",
    "acct_port": "1813",
    "hb_time": "120",
    "timeout": "43200",
    "extiface": "lan1",
    "whitemac": ""
  },
  "errCode": 0
}
```

**Uso futuro**: in Fase 2 del business plan, quando Otium supporterà RADIUS vendor-agnostic, questo è l'endpoint per configurare il controller come **RADIUS client** verso Otium cloud. Utile per scenario ibrido: Comfast AP gestiti localmente, ma auth federata via RADIUS cloud.

---

## Altre sezioni disponibili (90 totali)

Vedere file di dump completo: `router_comfast/controller_dump/snapshot_YYYYMMDD_HHMMSS/api_full/*.json`.

Elenco sezioni per categoria:

### AC / AP
- `ac_enable_get` / `ac_enable_set`: abilita/disabilita AC controller
- `ac_group_config`: ⭐ gruppi AP + SSID
- `ac_list_get`: ⭐ stato live AP
- `ac_list_sta_mac`: lista client connessi per AP (action method)
- `ap_detail_config`: config dettaglio singolo AP
- `ap_led_action`: accendi/spegni LED AP (action)
- `ap_reboot_action`: riavvia AP (action)
- `add_default_group_config`: crea gruppo default

### Wireless
- `wifi_config`: config Wi-Fi generale
- `wireless_filter_config`: MAC filter wireless
- `wireless_roam`: parametri 802.11r fast roaming (10 slot configurabili)
- `wireless_schedule_config` / `_info_get`: scheduling Wi-Fi on/off
- `wireless_assoc_client_info`: client associati

### Network / VLAN / Routing
- `network_config`: overview network
- `vlan_config`: ⭐ gestione VLAN 802.1q
- `wan_config`: config WAN
- `multi_pppoe`: PPPoE multi
- `lan_dhcp_config`: pool DHCP
- `dhcp_list` / `dhcp_static_list` / `static_dhcp`: lease
- `static_route`: route statiche
- `direction_routing`: policy routing
- `dns_config`: override DNS
- `mwan_*`: multi-WAN config (balance, bind, capability, ISP detect, policy, QoS, port rules)
- `timing_redial`: PPPoE redial schedule

### Firewall
- `dmz_config`: DMZ host
- `ddos_config`: DDoS protection
- `filter_rbl_config`: RBL filter
- `portfw_config` / `portft_config`: port forwarding
- `ipft_config` / `macft_config` / `urlft_config`: IP/MAC/URL filters
- `arp_bind_list` / `arp_list` / `arp_static_bind`: ARP management
- `remote` / `remote_control`: remote management

### Captive Portal / Auth
- `wifilith_config`: ⭐ config captive portal
- `wifilith_pic_desc` / `wifilith_delete_pic_file`: gestione immagini splash
- `wifidog_config`: wifidog low-level
- `portal_account_config`: ⭐ utenti portale mode hotel
- `portal_passwd_config`: utenti portale mode code
- `radius_config`: RADIUS client

### QoS
- `qos_ip_limit`: limit banda per IP

### Sistema
- `firmware_info`: versione firmware
- `fota_status` / `system_fota_upgrade`: update firmware
- `system_reboot` / `system_reset`: azioni sistema (action method)
- `system_timing_reboot`: scheduled reboot (cron-like)
- `system_upload_file`: upload file (per restore backup)
- `system_usage`: CPU/mem/disk
- `systemlog_get`: system log (18KB+ di output)
- `uptime_get`: uptime
- `update_cpu_png` / `update_interface_png`: grafici PNG
- `ntp_timezone`: NTP + timezone
- `ping_config`: ping utility (action)
- `guide_config`: wizard setup

### Cluster (multi-controller)
- `cluster_list` / `cluster_delete` / `cluster_remark` / `cluster_filter`: gestione cluster
- `cluster_upgrade` / `cluster_upgrade_file`: upgrade coordinato

### VPN
- `l2tp_client_config`: L2TP client
- `pptp_client_config` / `pptpd_config` / `pptpd_user`: PPTP

### Altri
- `udisk_list`: lista USB disk
- `upnp_config` / `upnp_list`: UPnP
- `ddns_config`: Dynamic DNS
- `probe_server`: ping server
- `wifi_scan`: scan Wi-Fi site survey

---

## Classificazione SAFE vs UNSAFE per remote operations

**SAFE** (nessun network restart, può essere chiamato da remoto con basso rischio):
- ✅ `ac_group_config` (SET)
- ✅ `portal_account_config` / `portal_passwd_config` (SET)
- ✅ Tutti i GET (read-only)
- ✅ `system_timing_reboot` (cron change, no immediate effect)
- ✅ `ap_led_action`, `ap_reboot_action`, `ac_list_sta_mac` (azioni CAPWAP lato AP, non controller)

**MEDIO-UNSAFE** (probabile reload parziale, ha proprio procd trigger):
- 🟡 `wifilith_config`: restart di wifilith service → breve interruzione del captive portal
- 🟡 `wifidog_config`: idem
- 🟡 `radius_config`: restart radius service
- 🟡 `firewall.*_config` (ipft, macft, urlft, portfw): firewall reload → breve flush iptables

**UNSAFE** (triggera `/etc/init.d/network restartall` → wipe DHCP, restart network):
- 🔴 `vlan_config`
- 🔴 `network_config` 
- 🔴 `wan_config`
- 🔴 `multi_pppoe`
- 🔴 `lan_dhcp_config`

**Best practice**: per tutte le sezioni MEDIO-UNSAFE e UNSAFE, usare **auto-revert wrapper** (vedi `REMOTE_MANAGEMENT.md` sezione "Auto-revert").

---

## File di dump completo

Backup offline di tutte le 90 sezioni API è in:
```
router_comfast/controller_dump/snapshot_20260413_145508/api_full/
```

1 file JSON per sezione. Totale ~50 KB, referenziabile per esplorazione futura senza dover nuovamente interrogare il controller.
