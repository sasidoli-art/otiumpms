# Self-Service Onboarding di un nuovo router Otium Wi-Fi

> **Stato**: feature live in `feat/wifi-self-service-fleet` (PR pending)
> **Ultimo aggiornamento**: 2026-05-03

Procedura completa per aggiungere un nuovo router Comfast (CF-AC50/100/101/300) a una struttura cliente, **senza dipendenza da CLI/Git Bash/SSH**. Tutto via UI superadmin del PMS.

---

## Quadro architetturale

```
┌──────────────────────────────────────────────────────────────────┐
│ SUPERADMIN su otium-pms.vercel.app                               │
│                                                                  │
│   /superadmin/wifi/onboard                                       │
│   ├─ scegli host + struttura                                     │
│   ├─ digita password Wi-Fi staff                                 │
│   ├─ (opzionale) URL post-login + override SSID                  │
│   └─ click "Genera kit"                                          │
│        ▼                                                         │
│   POST /api/superadmin/wifi/onboard                              │
│   ├─ crea WifiDevice (mac="PENDING-XXXXXXXX" + apiToken)         │
│   ├─ build tar.gz patchato in memoria (lib/wifi/backup-builder)  │
│   └─ ritorna { backup.base64, apiToken (one-time), config, ... } │
│        ▼                                                         │
│   UI mostra:                                                     │
│   ├─ pulsante "Scarica .file"                                    │
│   ├─ token API (mostrato solo una volta, copiabile)              │
│   ├─ password Wi-Fi staff (per consegnare al cliente)            │
│   └─ istruzioni step-by-step per il tecnico                      │
└──────────────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ TECNICO INSTALLATORE (sul posto del cliente)                     │
│                                                                  │
│   1. Connette router Comfast factory alla corrente               │
│   2. Cavo Ethernet PC ↔ porta LAN del router                     │
│   3. Browser su http://192.168.10.1 (o factory IP del modello)   │
│   4. Login admin/admin                                           │
│   5. System Tools → Manage Config → Restore                      │
│   6. Carica il .file scaricato dal superadmin                    │
│   7. Conferma → router reboota in 60-90s                         │
│   8. Collega WAN del router al modem ISP del cliente             │
└──────────────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ ROUTER (post-restore)                                            │
│                                                                  │
│   IP gateway:        172.20.0.1/24                               │
│   Hostname:          COMFAST-<struttura-slug>                    │
│   SSID guest:        <Nome Struttura>           (open + captive) │
│   SSID staff:        <Nome Struttura>-Staff     (WPA2-PSK)       │
│   Wifidog:           enabled, target otium-pms.vercel.app        │
│   Auth metodi:       Codice + Prenotazione + (PIN/Email/Walk-in) │
│   Walled garden:     domini probe iOS/Android/Win + Otium        │
│   SSH:               port 22, key + password 'cecilia'           │
│   Otium agent:       installato in /usr/bin/, cron OFF da default│
│                                                                  │
│   Al primo heartbeat → backend riconosce token, binda MAC reale, │
│   stato WifiDevice passa da PENDING a ONLINE                     │
└──────────────────────────────────────────────────────────────────┘
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│ /superadmin/wifi → device appare ONLINE in 1 minuto              │
│   - alias, host, struttura, modello, MAC reale, last seen, IP    │
│   - linkato alla struttura giusta automaticamente                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Step-by-step lato Operatore Otium

### 1. Apri il wizard

```
otium-pms.vercel.app → SuperAdmin → sidebar "WI-FI" → "Nuovo router"
```

URL diretto: `/superadmin/wifi/onboard`

### 2. Compila il form

| Campo | Default | Note |
|---|---|---|
| Host cliente | (nessuno) | Solo host con modulo `wifi` attivo nel piano |
| Struttura | (auto-popolata dall'host) | Solo strutture `attiva: true` |
| Modello router | CF-AC101 | CF-AC50 / CF-AC100 / CF-AC101 / CF-AC300 |
| Alias | `<Struttura> - <Modello>` | Editabile (es. "Reception ground floor") |
| Password Wi-Fi staff | random 16-char alphanum | Pulsante "Genera" per rigenerare |
| URL post-login (splash) | (vuoto) | Dove finisce l'ospite dopo il captive portal |
| **Avanzate**: SSID guest override | `<Struttura sanitizzata>` | Es. `Mastroberardino`, `Priamare` |
| **Avanzate**: SSID staff override | `<SSID guest>-Staff` | |

### 3. Click "Genera kit di onboarding"

Il backend in ~1 secondo:
- crea record `WifiDevice` in DB con MAC placeholder
- builda tar.gz patchato in memoria (~100 KB)
- ritorna 3 pezzi:

#### a) File `.file` da scaricare
Nome: `otium-wifi-<slug>-<modello>-<id6>.file`. Click → download.

#### b) API Token (mostrato UNA VOLTA SOLA)
Salva o copia. Serve per debug futuro / recovery. Il DB salva solo l'hash.

#### c) Password Wi-Fi staff
Quella che hai inserito (o auto-generato). Da consegnare al cliente.

### 4. Consegna il kit al tecnico installatore

Cosa serve al tecnico:
- Il file `.file`
- (opzionale) le credenziali staff Wi-Fi per testare la connessione dopo il restore

---

## Step-by-step lato Tecnico Installatore

### 1. Setup fisico
- Router Comfast nuovo, factory state
- Alimentatore + cavo ethernet
- PC con browser

### 2. Accesso Web UI factory
1. Collega un capo del cavo a una porta LAN del router
2. Altro capo nel PC
3. PC prende DHCP dal router (IP tipico assegnato: 172.16.0.x o 192.168.10.x)
4. Apri il browser sull'**IP gateway** che hai ricevuto via DHCP (di solito `172.16.0.1` o `192.168.10.1`)
5. Login: `admin` / `admin`

### 3. Restore del kit
1. **System Tools → Manage Config**
2. Sezione **Restore Configuration** → **Choose File** → seleziona il `.file` ricevuto
3. Click **Upload & Restore** → conferma
4. Attendi 60-90 secondi del reboot del router

### 4. Verifica post-restore
- Il router cambia IP a `172.20.0.1/24`
- Il PC prende un nuovo lease DHCP da quel range
- Web UI a `http://172.20.0.1`, login `admin` / **`cecilia`** (NUOVA password)
- SSID broadcastati dall'AP collegato:
  - `<Nome Struttura>` aperta (per ospiti)
  - `<Nome Struttura>-Staff` WPA2 con la password ricevuta

### 5. Collega al modem ISP del cliente
- Cavo dalla porta **WAN** del router al modem/router del cliente
- Internet up entro pochi secondi
- Agent fa heartbeat → in `/superadmin/wifi` il device passa a **ONLINE**

---

## Cosa succede sotto il cofano

### Backup patched contenuto

I file modificati/aggiunti dal `backup-builder.ts`:

| Path nel router | Cosa fa |
|---|---|
| `/etc/shadow` | hash root → `cecilia` (mode 600) |
| `/etc/config/login` | password Web UI → `cecilia` |
| `/etc/config/network` | LAN 172.16.0.1/16 → 172.20.0.1/24 |
| `/etc/config/dhcp` + `/etc/config/dhcpd` | dnsmasq + ISC dhcpd domain → `<hostname>` |
| `/etc/config/system` | hostname + 4 vif: dual SSID guest/staff con password staff |
| `/etc/config/upnpd` | UPnP + NAT-PMP off (security A1) |
| `/etc/config/mwan3` | track_ip → Cloudflare 1.1.1.1 + Quad9 9.9.9.9 (A7) |
| `/etc/config/wifidog` | enabled=1, hostname `otium-pms.vercel.app`, walled garden default |
| `/etc/otium/agent.conf` | API_URL prod + token + DEVICE_ID = placeholder MAC |
| `/usr/bin/otium-agent.sh` | shell script v0.2 (MAC auto-detect + health) |
| `/usr/bin/otium-check-alive.sh` | deadman switch (cron-based health monitor) |
| `/etc/crontabs/root` | entry agent + check-alive **commentate** (da abilitare manualmente) |
| `/root/.ssh/authorized_keys` + `/etc/dropbear/authorized_keys` | SSH key operator (mode 600) |

### Bootstrap del MAC reale

Il backup ha `DEVICE_ID="PENDING-XXXXXXXX"` (placeholder), perché al momento dell'onboarding NON sappiamo il MAC del nuovo router.

Al primo boot:
1. Agent legge `agent.conf` → `DEVICE_ID="PENDING-..."`
2. Agent rileva il proprio MAC reale via `cat /sys/class/net/br-lan/address`
3. Agent usa il MAC reale come `DEVICE_ID` runtime
4. Agent fa `POST /api/wifi/agent/<MAC_REALE>/heartbeat`
5. Backend `requireWifiDeviceWithBootstrap()`:
   - Cerca `WifiDevice` con `mac=<MAC_REALE>` → non trovato
   - Fallback: cerca con `mac` like `PENDING-*` AND `apiTokenHash=hash(token)` → trovato
   - Aggiorna `mac=<MAC_REALE>`, `stato=ONLINE`, `ultimoHeartbeatAt=now`
6. Da quel momento subsequent calls usano il MAC reale normalmente

Codice: [`lib/wifi/auth.ts`](../../lib/wifi/auth.ts) → `requireWifiDeviceWithBootstrap()`

---

## Sicurezza & Best Practice

### Cosa è OK lasciare di default

- Password root SSH `cecilia` durante installazione → la rotazione si fa dopo, da remoto, via UCI command sull'agent
- Web UI admin/cecilia → stesso discorso
- SSH password auth ON → da disabilitare DOPO aver verificato che la chiave funzioni
- API token in `agent.conf` plaintext → l'utente del router è root, l'unico che lo legge

### Cosa rotare appena possibile

- Cambia password root SSH appena hai SSH-key working: `passwd root` da remoto, poi commit `/etc/shadow` in un nuovo backup
- Disabilita Password auth Dropbear (UCI: `dropbear.@dropbear[0].PasswordAuth=off`)
- Cambia password Web UI `/etc/config/login` se vuoi separazione di ruoli
- (futuro) ruota apiToken: nuovo onboarding → nuovo backup → restore

### Token API & recovery

L'`apiToken` è mostrato **UNA SOLA VOLTA** dopo la generazione. Il DB salva `apiTokenHash` (sha256). Se perdi il token:
- Il router con quel token continua a funzionare (l'agent lo ha in agent.conf)
- Ma se devi RIGENERARE/recuperare un nuovo backup → genera un nuovo WifiDevice tramite il wizard, restora il file nuovo sul router. Il vecchio device record resta in DB (puoi marcarlo REVOCATO o eliminarlo).

---

## Multi-tenancy: come gestire N strutture

Il sistema è multi-tenant by design. Ogni `WifiDevice`:
- Ha un `apiToken` unico (256 bit random)
- È legato a `hostId` (azienda cliente, es. "Masseria MastroBerardino")
- Opzionalmente legato a `strutturaId` (location specifica, es. "Masseria MastroBerardino" struttura singola)
- L'agent del device chiama il backend con quel token → backend risolve `hostId` + `strutturaId` → tutti i comandi/log/sessioni segregati

Vedi [`memory/project_router_multitenancy.md`](C:\Users\admin\.claude\projects\c--PROGETTI-router-comfast\memory\project_router_multitenancy.md) e [`REMOTE_MANAGEMENT.md`](./REMOTE_MANAGEMENT.md).

---

## Troubleshooting

### Il router non appare ONLINE dopo 5 min

**Verifiche**:
1. `/superadmin/wifi` → cerca il record con MAC `PENDING-XXXXXXXX`. Esiste? → backup è stato registrato OK.
2. Il router ha Internet? Modem ISP up? Cavo WAN ok?
3. SSH al router (se hai accesso fisico): `tail -f /tmp/otium-agent.log`
4. Cron è abilitato? Default è OFF: `crontab -l` deve avere `*/1 * * * * /usr/bin/otium-agent.sh tick`
5. Forza un tick manuale: `/usr/bin/otium-agent.sh tick` → guarda errori

### Errore "Module Wi-Fi non attivo" durante onboarding

L'host del cliente non ha il modulo `wifi` nel piano. Vai su `/superadmin/host/<id>/moduli` e attivalo prima.

### Lo script di test buildPatchedBackup fallisce

```bash
cd Gestionale_otium
npx tsx scripts/test-wifi-backup-builder.ts
```

Output atteso: 5+ check verdi + "🎉 All smoke tests passed."

Se fallisce:
- Verifica che `lib/wifi/_templates/factory-bak.b64.ts` sia tracciato in git (gitignore può catturarlo se cambi nome)
- Verifica che tar-stream sia installato (`npm ls tar-stream`)
- Verifica che `~/.ssh/id_router.pub` esista (lo script di test legge questa per il SSH key embed)

### Restore Web UI fallisce con errore "Invalid backup format"

Il file `.file` è gzip + tar. Se Windows lo ha alterato durante il download (es. ricodificato come testo), si rompe. Sempre scaricare in modalità binary.

---

## File chiave del feature branch

| File | Cosa fa |
|---|---|
| `lib/wifi/backup-builder.ts` | TS-based tar.gz builder con tar-stream, embedda template + script |
| `lib/wifi/auth.ts` | `requireWifiDeviceWithBootstrap()` per primo heartbeat token-based |
| `lib/wifi/auto-provision.ts` | helper per auto-creare WifiAccessCode da prenotazione |
| `lib/wifi/_templates/*.b64.ts` | factory backup + agent.sh + check-alive.sh embedded |
| `app/api/superadmin/wifi/onboard/route.ts` | endpoint POST per il wizard |
| `app/superadmin/wifi/page.tsx` + `wifi-fleet-client.tsx` | UI lista cross-host |
| `app/superadmin/wifi/onboard/page.tsx` + `onboard-client.tsx` | UI form wizard |
| `app/api/wifi/wifidog/login/route.ts` | splash login con MAC persistence + multilingua |
| `app/api/wifi/wifidog/portal/route.ts` | post-auth con VIP recognition |
| `components/superadmin/sidebar.tsx` | sidebar con sezione "WI-FI" |
| `scripts/test-wifi-backup-builder.ts` | smoke test del builder |

Sui router:
| File | Cosa fa |
|---|---|
| `router_comfast/otium_agent/otium-agent.sh` | agent v0.2 con MAC auto-detect + health.json + body fix |
| `router_comfast/otium_agent/otium-check-alive.sh` | deadman switch monitor |
