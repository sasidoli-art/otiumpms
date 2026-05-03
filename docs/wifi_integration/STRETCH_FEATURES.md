# Stretch Features — design pronto, implementazione futura

> Doc che mappa le 4 feature che NON ho potuto implementare a fondo
> in una sola sessione, con architettura pronta + scaffolding TypeScript.
> Quando hai tempo, riprendi da qui.

---

## 1. Bandwidth Plans (QoS)

**Obiettivo**: piani di banda differenziati FREE / PREMIUM / VIP applicati per MAC al login.

### Componenti già pronti

| File | Contenuto |
|---|---|
| `lib/wifi/types.ts` | `WifiBandwidthPlan` type + `WIFI_BANDWIDTH_PROFILES` constants |
| `lib/wifi/types.ts` | `SetQosLimitParams` + `ApplyQosPlanParams` payload types |
| Agent action types | `set_qos_limit`, `clear_qos_limit`, `apply_qos_plan` |

```typescript
// lib/wifi/types.ts (già committato)
export const WIFI_BANDWIDTH_PROFILES = {
  FREE: { downloadKbps: 5000, uploadKbps: 1000 },     // 5 Mbps / 1 Mbps
  PREMIUM: { downloadKbps: 30000, uploadKbps: 10000 },// 30 Mbps / 10 Mbps
  VIP: { downloadKbps: null, uploadKbps: null },      // illimitato
  STAFF: { downloadKbps: null, uploadKbps: null },    // illimitato
}
```

### Da implementare

#### Lato agent (router_comfast/otium_agent/otium-agent.sh)

Aggiungere case nel dispatch:

```sh
action_set_qos_limit() {
    params="$1"
    mac=$(echo "$params" | jsonfilter -e '@.macClient')
    dl_kbps=$(echo "$params" | jsonfilter -e '@.downloadKbps')
    ul_kbps=$(echo "$params" | jsonfilter -e '@.uploadKbps')

    # Translate to tc/htb commands per il MAC
    # Trovare interfaccia: br-lan o eth0.10 (VLAN guest)
    iface="br-lan"

    # Add ingress qdisc + filter on MAC
    tc qdisc add dev "$iface" root handle 1: htb default 30 2>/dev/null
    tc class add dev "$iface" parent 1: classid 1:10 htb rate "${dl_kbps}kbit"
    tc filter add dev "$iface" protocol ip parent 1:0 prio 1 \
        u32 match ether dst "$mac" flowid 1:10

    printf '{"applied":true,"mac":"%s","dl":%s,"ul":%s}' "$mac" "$dl_kbps" "$ul_kbps"
}
```

#### Lato backend (Gestionale_otium)

API endpoint `POST /api/host/wifi/sessions/<id>/set-plan`:
- Body: `{ plan: 'FREE' | 'PREMIUM' | 'VIP' }`
- Look up `WifiSession` → `macClient`
- Crea `WifiDeviceCommand` con `action='apply_qos_plan'` + params
- Agent al prossimo tick lo esegue

#### Lato UI

Nella pagina `/host/wifi/sessions` (esiste, è un client component):
- Per ogni sessione attiva, dropdown "Piano: FREE/PREMIUM/VIP"
- On change → POST endpoint sopra

### Effort stimato: mezza giornata

---

## 2. AP Firmware Update Workflow

**Obiettivo**: aggiornare firmware degli AP collegati al controller, da Gestionale_otium, senza toccare fisicamente.

### Architettura

```
1. Otium uploads new firmware to CDN (Vercel Blob, S3, ecc.)
   → URL HTTPS pubblico
2. Operator triggers via UI: "Aggiorna firmware AP <MAC>"
3. Backend crea WifiDeviceCommand:
   {
     action: 'upgrade_ap_firmware',
     params: {
       apMac: "20:0d:b0:74:da:5a",
       firmwareUrl: "https://cdn.otium.cloud/firmware/cf-e385ac-v2.6.1.bin",
       expectedSha256: "abc123..."
     }
   }
4. Agent al prossimo tick scarica firmware in /tmp,
   verifica SHA256, chiama controller cluster_upgrade API:
     POST /cgi-bin/mbox-config?method=SET&section=cluster_upgrade
       { ap_mac: "...", firmware_path: "/tmp/firmware.bin", action: "upgrade" }
5. Controller pusha via CAPWAP all'AP target
6. AP scarica via HTTP locale (non Internet),
   verifica, flash, reboot. Tipicamente 60-120s.
7. Agent monitora `cluster_status` + heartbeat dell'AP via wtpd
8. Successo → notifica backend via command-results
9. Failure entro 5 min → controller fa rollback automatico
   (`cluster_upgrade --revert`)
```

### Da implementare

| Componente | Effort |
|---|---|
| Vercel Blob storage o equiv per ospitare firmware | 1h |
| Pagina superadmin `/superadmin/wifi/firmware` con upload + selezione AP | 4h |
| Action `upgrade_ap_firmware` nell'agent | 3h |
| Verifica SHA256 + rollback automatico | 2h |
| Test su CF-E385AC reale (controller di lab) | 4h |

**Effort totale**: ~2 giornate. Critical path: testing su HW reale.

---

## 3. Reverse SSH Service Mode

**Obiettivo**: permettere al supporto Otium di entrare via SSH dentro un router cliente (dietro NAT/CGNAT) per debug interattivo, on-demand, auditato.

### Architettura

```
[VPS Otium pubblico]                    [Router cliente dietro NAT]
ssh.otium.cloud                         pubblicato dal cliente
    │  port 22 (operatori SSH)              │  no porte aperte
    │  port 2200-2299 (jump per router)     │  outbound only
    │
    │ ◄───── reverse tunnel autossh ────────┤
    │     (router → VPS port 22042)         │
    │
    │ Operator: ssh -p 22042 root@ssh.otium.cloud
    │     → arriva DENTRO al router
```

### Setup VPS

1. **DigitalOcean droplet €5/mese** (1 vCPU, 1 GB RAM) → ssh.otium.cloud
2. Crea utente `otium-bot` (nessuno shell, solo `/usr/sbin/nologin`)
3. `sshd_config` con:
   - `AllowTcpForwarding remote`
   - `PermitOpen localhost:*`
   - `GatewayPorts no` (privacy: solo tunnel locali)
4. `~otium-bot/.ssh/authorized_keys` con la pubkey degli agent
   - Una key per device, comando forzato:
     `command="echo 'tunnel-only';sleep 86400",no-pty,no-X11-forwarding,no-user-rc`
5. Range port 22000-22999 riservato per i tunnel reverse

### Setup Router (action service_mode_on)

Agent quando riceve `service_mode_on` con params:
```sh
ttl="${TTL:-3600}"
port="$JUMP_PORT" # assegnato dal backend, unico per device

autossh -M 0 -f -N \
    -o "ServerAliveInterval 30" \
    -o "ServerAliveCountMax 3" \
    -o "ExitOnForwardFailure yes" \
    -o "StrictHostKeyChecking no" \
    -i /etc/otium/jump.key \
    -R "$port:localhost:22" \
    "otium-bot@ssh.otium.cloud"

# Auto-close dopo TTL secondi
echo "(sleep $ttl && killall autossh) &" | at now
```

### Setup Operator (chi entra)

```sh
# Su Gestionale_otium superadmin: click "Apri service mode" su un device
# → backend issue command, agent crea tunnel, backend mostra:
#
#     ssh -i ~/.ssh/otium-jump -p 22042 root@ssh.otium.cloud
#     (TTL: 60 min, audit log enabled, tunnel auto-close al timeout)

ssh -i ~/.ssh/otium-jump -p 22042 root@ssh.otium.cloud
# → sei dentro al router
```

### Audit & Sicurezza

Ogni invocazione genera audit log:
- `who` (operator superadmin)
- `when`
- `device id`
- `customer host id`
- `motivo` (campo obbligatorio nel form "Apri service mode")

Notifica email all'host del cliente: "Otium ha aperto un canale di debug remoto sul router della tua struttura il <data>".

### Da implementare

| Componente | Effort |
|---|---|
| Provisioning VPS DigitalOcean | 30 min |
| sshd_config hardened + key per device | 2h |
| Action `service_mode_on/off` nell'agent | 3h |
| Pagina superadmin con button + audit log | 4h |
| Notifica email cliente | 1h |
| Test e2e da remoto reale | 2h |

**Effort totale**: ~1.5 giornate + €5/mese ricorrente VPS.

---

## 4. Analytics Dashboard

**Obiettivo**: dashboard per host che mostra metriche Wi-Fi cross-struttura.

### Metriche target

- **Connessioni nel tempo** (giorno/settimana/mese): line chart
- **Top 10 device per traffico** (MAC + bytes_in/out se tracciato)
- **Distribuzione per metodo auth**: PMS / CODICE / COMPLIMENTARY / EMAIL / USER_FORM (donut chart)
- **Picchi di carico**: heatmap per ora del giorno × giorno della settimana
- **Durata media sessione**
- **Conversion rate**: % di device che vede captive portal e si autentica

### Da implementare

| Componente | Effort |
|---|---|
| Aggregazioni SQL su `wifi_sessions` (con GROUP BY data + LAG window) | 4h |
| API endpoint `/api/host/wifi/analytics?range=7d&strutturaId=X` | 3h |
| Pagina `/host/wifi/analytics` con Recharts (già nel PMS per altro) | 6h |
| Filter UI: range + struttura + metodo auth | 2h |
| Export CSV per richieste autorità (compliance Pisanu) | 2h |

**Effort totale**: ~2 giornate.

### Schema da estendere (nice-to-have)

WifiSession non traccia oggi `bytes_in / bytes_out`. Aggiungerli (NULLABLE int) dal counter wifidog `/wifidog/auth?stage=counters`. Migration Prisma necessaria.

---

## Priorità raccomandata

1. **Bandwidth plans** (½ gg) — primo cliente che chiede premium = monetizzazione
2. **Reverse SSH** (1.5 gg) — ti sblocca manutenzione remota per i prossimi 50 clienti
3. **AP firmware** (2 gg) — necessario quando esce vulnerabilità su firmware AP
4. **Analytics** (2 gg) — vendibile ma non blocking
