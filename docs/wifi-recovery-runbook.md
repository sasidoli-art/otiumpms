# Otium WiFi — Recovery Runbook

> **Scopo**: ricostruire/riprendere il sistema Wi-Fi Otium da un PC nuovo,
> dopo migrazione DB, o per onboarding di un nuovo dev.
>
> **Repo correlato**: `router_comfast/` (script firmware router + provisioning).
> Da clonare separatamente — non versionato in questo repo.
>
> Ultimo aggiornamento: 2026-05-24 (post migrazione Neon → Supabase)

---

## Stato corrente del sistema

### Database

- **Provider**: Supabase (EU Central, AWS)
- **Connection string**: in `.env` locale (NON committata in repo)
  ```
  postgresql://postgres.eabpgxprelbsfikhjdru:****@aws-1-eu-central-1.pooler.supabase.com:6543/postgres
  ```
- **Migrazione precedente**: Neon → Supabase (avvenuta intorno al 2026-05-23/24)

### Router lab (Mastroberardino — dev environment)

- **Hardware**: Comfast CF-AC101 (MT7621 dual-core MIPS, 256 MB RAM, 16 MB flash)
- **MAC**: `E0:E1:A9:0E:2D:CF` (normalizzato: `E0E1A90E2DCF`)
- **IP LAN**: `172.20.0.1`
- **WAN**: collegato a modem 4G LTE upstream (subnet `192.168.8.0/24`, gateway `192.168.8.1`)
- **Host nel DB**: `cmpiufw6l000514atvybrjunm` (nome: "Agriturismo Il Poggio")
- **WifiDevice ID**: `cmootmwxp0001b1a6rr6hncas` (URL portale: `/superadmin/wifi/<id>`)
- **Agent version**: v0.6 (con `list_ssids`, fix AP_COUNT/clientCount, fix sync race)

### Token API agent

- ⚠️ **Mai committare in git** (è un segreto). Visibile UNA VOLTA al provisioning.
- Ultimo token rigenerato: 2026-05-24 (vedi `scripts/gen-wifi-device.ts` per rigenerare)
- Persistito sul router in `/etc/otium-agent.conf` (`TOKEN=...`)

### Console seriale

- **COM port**: COM3 (Windows) o `/dev/ttyUSB0` (Linux/Mac)
- **Adapter**: USB-TTL FTDI FT232R (qualsiasi compatibile va bene)
- **Connettore**: esterno sul CF-AC101 (no apertura case necessaria)
- **Baud**: 115200 8N1
- **Login**: `root` / `cecilia` (default Comfast)
- **Script utility**: `serial_shell.py`, `serial_upload.py`, `serial_monitor.py` (nel repo `router_comfast/`)

---

## Procedure di ripristino

### Caso 1: Migrazione DB (= Token agent invalidato)

**Sintomo**: agent fa `heartbeat failed` continuo, sync `http=000`.

**Diagnosi**: il nuovo DB non ha il vecchio `apiTokenHash` per quel MAC.

**Soluzione**:
```bash
# 1. Sul PC (con DATABASE_URL nuovo in .env):
cd Gestionale_otium
npx tsx scripts/gen-wifi-device.ts <hostId> E0E1A90E2DCF "CF-AC101 Mastroberardino" CF-AC101
# Salva il NUOVO TOKEN che stampa

# 2. Sul router (via SSH o console seriale):
sed -i "s|^TOKEN=.*|TOKEN=<NUOVO_TOKEN>|" /etc/otium-agent.conf

# 3. Kill agent stale e ricomincia
rm -f /var/run/otium-agent.pid
kill -9 $(pgrep otium-agent) 2>/dev/null
/usr/sbin/otium-agent.sh
```

### Caso 2: Router non raggiungibile via SSH LAN

**Soluzioni** (in ordine di tentativo):
1. **Console seriale**: `python serial_shell.py` (nel repo router_comfast)
2. **Verifica Internet WAN**: `ping 8.8.8.8` dal router
3. **Verifica gateway** del modem upstream raggiungibile

### Caso 3: Nuovo PC dev

```bash
# 1. Clone repo
git clone https://github.com/sasidoli-art/otiumpms.git Gestionale_otium
git clone <url-router-comfast-repo-se-esiste> router_comfast

# 2. Setup .env (sintassi da .env.example)
cp Gestionale_otium/.env.example Gestionale_otium/.env
# Edita .env, aggiungi DATABASE_URL = (chiedi a un altro dev o leggi da password manager)

# 3. Install deps
cd Gestionale_otium
pnpm install

# 4. Test connessione DB
npx tsx scripts/check-wifi-state.ts

# 5. (Opzionale) Install pyserial per console seriale router
pip install pyserial
```

### Caso 4: Modem 4G upstream perde connessione

**Sintomo**: `ping 192.168.8.1` OK ma `ping 8.8.8.8` fallisce.

**Diagnosi**: il modem 4G LTE in sede ha perso lock cellulare o credito SIM.

**Soluzione**: riavvio modem 4G (l'utente fisicamente in sede), aspetta 30-90s.

---

## Comandi diagnostici utili

```bash
# Sul PC dev — check stato DB router
cd Gestionale_otium
npx tsx scripts/check-wifi-state.ts        # heartbeat + lista device
npx tsx scripts/find-mastro-host.ts        # trova hostId Mastroberardino
npx tsx scripts/gen-wifi-device.ts ...     # crea/aggiorna device + nuovo token

# Sul router (via SSH o seriale)
cat /etc/otium-agent.conf                  # vedi config corrente
tail -10 /tmp/otium-sync.log               # stato sync recenti
logread | grep otium-agent | tail -10      # log syslog agent
ubus call wtpd list_all | head -50         # AP CAPWAP gestiti
md5sum /usr/sbin/otium-agent.sh            # versione agent installata
```

---

## File chiave per chi arriva nuovo

| File | Cosa |
|---|---|
| `Gestionale_otium/lib/wifi/agent-template.sh` | Template agent (source of truth, deployato via `/api/wifi/agent/bundle`) |
| `Gestionale_otium/lib/wifi/types.ts` | Schema TS WifiAgentAction |
| `Gestionale_otium/app/superadmin/wifi/[id]/page.tsx` | UI dettaglio device + invio comandi + renderer |
| `Gestionale_otium/app/api/wifi/agent/[mac]/*` | Endpoint API agent (heartbeat, pending-commands, command-results) |
| `Gestionale_otium/app/api/superadmin/wifi/[id]/commands/*` | Endpoint UI per emettere comandi |
| `Gestionale_otium/scripts/gen-wifi-device.ts` | CLI per creare/aggiornare device + generare token |
| `router_comfast/INSTALL_NEW_ROUTER.md` | Procedura provisioning nuovo router (v7) |
| `router_comfast/KNOWN_ISSUES.md` | 41 gotcha tracciate |
| `router_comfast/TEST_PLAN_RF105_E593AX.md` | Test plan validazione Tier S |
| `router_comfast/serial_shell.py` | Console seriale tooling |

---

## Roadmap pending

- [ ] Stage B SSID management (CRUD via `ubus call wtpd add_list`) — stage A read-only deployato 2026-05-22
- [ ] Test E2E CF-RF105 + CF-E593AX quando arrivano dal corriere AliExpress (~giugno 2026)
- [ ] Multi-tenancy hardening (rate limit, 2FA superadmin) quando avrai 3°-5° cliente
- [ ] Tariffario pubblico + landing page Otium WiFi

---

## Contatti emergenza

- Vercel project: `otium-pms` (account GitHub `sasidoli-art`)
- Custom domain Vercel: `otiumpms.duckdns.org` (DuckDNS account legato a stesso GitHub)
- Supabase project: `eabpgxprelbsfikhjdru` (EU Central)
