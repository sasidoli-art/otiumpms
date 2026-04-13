# Remote Management del device in struttura cliente

> **Stato**: architettura validata (2026-04-13). Otium PMS controlla il device in sede del cliente tramite outbound polling HTTPS + safety net auto-revert.
> **Contesto**: documentazione tecnica per il business plan "Otium Wi-Fi" — gestione remota di router Comfast + AP in strutture ricettive clienti.

---

## Il problema

Il router che Otium installa in sede cliente è **dietro NAT** (o CGNAT) nella connessione del cliente. Non ha IP pubblico raggiungibile. Otium cloud deve comunque:

- Generare credenziali guest quando arriva una prenotazione
- Cambiare Wi-Fi password / SSID / branding su richiesta del cliente
- Diagnosticare problemi da remoto
- Inviare aggiornamenti firmware / patch
- Vedere log accessi per compliance Pisanu/GDPR
- Ricevere heartbeat + metriche health

Tutto senza che il cliente (B&B di Sardegna o simile) debba aprire porte, installare software, o chiamare l'elettricista.

## I 4 modelli possibili

### 1. ⭐ HTTP polling outbound *(canale primario raccomandato)*

Un piccolo agente sul router fa `curl` ogni 30-60 secondi verso un endpoint Otium cloud:

```
# Sul router (otium-agent.sh)
curl -s -H "Authorization: Bearer $DEVICE_TOKEN" \
     https://api.otium.cloud/v1/devices/$DEVICE_ID/pending-commands
```

La risposta è una lista JSON di comandi pendenti. L'agente:
1. Parsa la risposta
2. Per ogni comando, esegue l'azione locale (es. `curl -X POST ... http://172.16.0.1/cgi-bin/mbox-config?method=SET&section=portal_account_config ...`)
3. POSTa il risultato indietro: `POST /v1/devices/$DEVICE_ID/command-results`
4. Manda un heartbeat periodico: `POST /v1/devices/$DEVICE_ID/heartbeat` con CPU/mem/uptime/client count

**Pro**:
- ✅ Funziona ovunque (CGNAT, firewall aziendali, VPN, captive portal hotel)
- ✅ Sicuro: nessun servizio esposto sul router, solo richieste in uscita
- ✅ TLS nativo via curl
- ✅ Resiliente: se la rete del cliente cade, l'agent riparte automaticamente
- ✅ Stateless lato router: nessuna sessione persistente da mantenere
- ✅ Scalabile: 1000 device che pollano ogni 30s = 33 req/s sul backend, banale per un qualsiasi VPS

**Contro**:
- ⚠️ Latenza max 30-60 secondi tra "comando emesso" e "comando eseguito". **Irrilevante** per Wi-Fi guest management (i check-in avvengono ore prima dell'arrivo ospite).

**Implementation complexity**: bassa. L'agent può essere uno shell script di ~100 righe su router + 4 endpoint REST lato backend (Next.js API route per Otium).

### 2. 🔧 Reverse SSH tunnel *(canale "service mode" per support tecnico)*

Il router avvia un `autossh` persistente in uscita verso `ssh.otium.cloud`:

```bash
autossh -M 0 -N -R 22000:localhost:22 otium-bot@ssh.otium.cloud
```

Dal cloud Otium, un operatore (tu o supporto tecnico) può:

```bash
ssh -p 22000 root@ssh.otium.cloud
# → arriva DENTRO al router del cliente
```

Usato solo in modalità "service mode": quando serve debug interattivo, diagnosi problema specifico, patch manuale d'emergenza.

**Pro**:
- ✅ Accesso shell completo remoto al device
- ✅ Funziona dietro qualsiasi NAT
- ✅ Cifrato via SSH

**Contro**:
- ❌ Tunnel persistente consuma risorse sul VPS Otium (RAM + un processo per ogni device attivo)
- ❌ Sicurezza concentrata: se `ssh.otium.cloud` viene compromesso, **tutti** i router clienti sono esposti. **MUST** essere hardened con jump host dedicato, 2FA, fail2ban, audit logging
- ❌ Scalabilità limitata: dopo ~500-1000 device simultanei, il VPS diventa un collo di bottiglia

**Raccomandazione**: abilitare per default ma **silenzioso** (tunnel up, ma nessun login avviene normalmente). Usato solo quando l'operatore ha necessità dichiarata. Auditare tutti i login via log + notifica al cliente.

### 3. 🌐 WireGuard VPN *(futuro — quando hardware lo permette)*

Ogni router avvia un client WireGuard verso `vpn.otium.cloud`. Dal cloud Otium, ogni device risulta raggiungibile via un IP privato dedicato (es. `10.100.X.Y`).

**Pro**:
- ✅ Modern cryptography, performance eccellente
- ✅ Rete "piatta" lato Otium: puoi mandare traffic a qualsiasi device come se fosse local
- ✅ Può supportare anche la **propagazione di update firmware** via semplice HTTP/SCP dentro la VPN

**Contro**:
- ❌ WireGuard è in kernel mainline dal 5.6 (2020). I Comfast CF-AC300 hanno kernel 3.18 (2015) → serve backport WireGuard (fattibile ma non banale)
- ❌ Su hardware Comfast, richiede ricompilare il modulo — e dobbiamo evitare modifiche al firmware base del Comfast per il primo prodotto

**Quando adottarlo**: quando passerai a hardware con kernel moderno (Mikrotik hAP ax3, Raspberry Pi, mini-PC x86 con OpenWrt 22.03+), puoi standardizzare su WireGuard al posto di polling HTTP. Resta compatibile con Fase 1 se l'agent implementa entrambi i modelli.

### 4. 📡 MQTT broker *(real-time per scale)*

Otium deploya un broker MQTT (es. EMQ X, VerneMQ, Mosquitto cluster). Ogni router pubblica e sottoscrive topic:

```
otium/devices/<device_id>/commands        → subscribe (riceve ordini)
otium/devices/<device_id>/results         → publish (manda risultati)
otium/devices/<device_id>/heartbeat       → publish (metriche)
otium/structures/<struct_id>/broadcast    → subscribe (eventi broadcast per struttura)
```

**Pro**:
- ✅ Real-time: comandi recapitati in millisecondi
- ✅ Broadcast efficiente: 1 messaggio → N device ricevono
- ✅ Ecosistema maturo (EMQ X scala a 10M+ client, ci sono SaaS broker)
- ✅ Il router usa 1 sola connessione TCP persistente (non ricrea ogni 30s come il polling)

**Contro**:
- ❌ Broker MQTT è un SPOF se non replicato (aggiunge complessità SRE)
- ❌ Serve un agent MQTT sul router (esiste `mosquitto_sub`/`mosquitto_pub` come binary statici, <1MB, può essere incluso)
- ❌ State management più complesso lato backend

**Quando adottarlo**: **Fase 3** quando hai 500+ clienti e la latenza del polling diventa un problema concreto (es. promozioni real-time, analytics istantanee). Per l'MVP è overkill.

## Auto-revert: la rete di sicurezza obbligatoria

**Ogni volta** che Otium cloud invia un comando che modifica config a rischio (network, firewall, auth, wireless), l'agent **DEVE** implementare un "dead man's switch" prima di applicare la modifica:

```bash
# pseudocodice otium-agent.sh

apply_risky_change() {
    local cmd="$1"

    # 1. Salva backup config corrente
    cp /etc/config/network /tmp/rollback/network.before
    cp /etc/config/firewall /tmp/rollback/firewall.before
    # ... (tutte le sezioni potenzialmente toccate)

    # 2. Schedula auto-revert tra 5 minuti
    echo "*/1 * * * * /usr/bin/otium-check-alive.sh" > /tmp/cron_deadman
    crontab /tmp/cron_deadman
    touch /tmp/rollback/.armed
    echo "$(date +%s)" > /tmp/rollback/.arm_time

    # 3. Applica il comando
    eval "$cmd"

    # 4. Post-check: router è ancora raggiungibile dopo il comando?
    if ! ping -c 3 -W 2 1.1.1.1 >/dev/null; then
        # Internet morto → revert immediato
        rollback_now
        report_to_cloud "command_failed_network_unreachable"
        return 1
    fi

    # 5. Segnala successo al cloud (entro 5 min)
    report_to_cloud "command_applied"
}

# Questo script gira ogni 1 minuto via cron
otium-check-alive() {
    if [ -f /tmp/rollback/.armed ]; then
        local arm_time=$(cat /tmp/rollback/.arm_time)
        local now=$(date +%s)
        local elapsed=$((now - arm_time))
        
        if [ $elapsed -gt 300 ]; then
            # 5 minuti scaduti senza "disarm" dal cloud → auto-revert
            rollback_now
            reboot  # garanzia extra di pulizia
        fi
        
        # Prova a raggiungere Otium cloud: se OK e il cloud ci manda "disarm" → OK
        if curl -s --max-time 5 -f https://api.otium.cloud/v1/devices/$DEVICE_ID/disarm-check; then
            rm -f /tmp/rollback/.armed
        fi
    fi
}

rollback_now() {
    cp /tmp/rollback/network.before /etc/config/network
    cp /tmp/rollback/firewall.before /etc/config/firewall
    # ...
    /etc/init.d/network restart
    /etc/init.d/firewall restart
    rm -f /tmp/rollback/.armed
}
```

**Semantica**:
1. Otium cloud manda comando rischioso → agent "arma" il deadman + applica
2. L'agent verifica che dopo il comando Internet funziona ancora
3. Otium cloud rileva via polling che il device è ancora online dopo 30s-60s
4. Otium cloud chiama endpoint `disarm-check` → agent cancella il timer → comando confermato
5. **Se qualcosa va storto** (router non raggiungibile, Internet morto, agent loop, ecc.) → dopo 5 min si auto-revert → router torna online come prima → Otium notificato

**Questo meccanismo rende safe al 99.99% qualsiasi remote operation**. L'unico scenario in cui il cliente resta offline a lungo è quando: (a) il firmware si corrompe in modo irreversibile, (b) l'hardware si guasta. Entrambi gli scenari richiedono intervento fisico comunque.

## Il modello operativo finale per Otium

```
┌──────────────────────────────────────────────────────────────┐
│ OTIUM CLOUD                                                  │
│  - REST API /v1/devices/*                                    │
│  - Queue comandi per ogni device                             │
│  - Dashboard operatore per monitoring + generazione manuale │
│  - Integrazione PMS (prenotazioni → comandi)                 │
│  - Logging GDPR compliant 6 mesi                             │
│  - (opzionale) Bastion SSH per service mode                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTPS polling 30s (stateless)
                         │ (+ reverse SSH tunnel passive)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ ROUTER IN STRUTTURA CLIENTE                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ otium-agent (shell script /usr/bin/otium-agent.sh)     │ │
│  │  + cron ogni 30s → polling + heartbeat                 │ │
│  │  + cron ogni 1 min → check deadman switch              │ │
│  │  + autossh persistent tunnel (silent)                  │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │ localhost curl                     │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Controller Comfast webmgnt (http://localhost)           │ │
│  │  POST /cgi-bin/mbox-config?method=SET&section=...      │ │
│  │   ├→ wifilith_config (captive portal)                  │ │
│  │   ├→ portal_account_config (guest users)              │ │
│  │   ├→ ac_group_config (SSID propagation)                │ │
│  │   └→ ... altre 85 sezioni                              │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │ CAPWAP push                         │
│                         ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Access Point 1, AP 2, AP N (gestiti via wtpd)          │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Checklist sicurezza minima del modello

- [ ] **TLS obbligatorio** su tutti gli endpoint Otium cloud (no HTTP)
- [ ] **Bearer token per device** univoco, ruotabile, revocabile da cloud
- [ ] **Certificati TLS rinnovati automaticamente** (Let's Encrypt / acme.sh)
- [ ] **Rate limiting** per device sul backend (previene agent impazzito che batte il cloud)
- [ ] **Audit log** di ogni comando inviato (chi, quando, che device, che risultato)
- [ ] **Dead man's switch** attivo per tutte le modifiche rischiose (network/firewall/auth)
- [ ] **Separazione permessi operatore** (non tutti gli operatori vedono tutti i device)
- [ ] **Encryption at rest** per i log accessi GDPR sul cloud (obbligo legale)
- [ ] **Backup automatico** della config di ogni device ogni giorno sul cloud
- [ ] **Alert** se un device è offline per >15 min → notify operatore
- [ ] **Staging environment**: prima di pushare un comando a 100 device, testarlo su 1 device di staging per validazione

## Cosa abbiamo già validato tecnicamente (2026-04-13)

- ✅ **API REST del controller** è accessibile via `POST /cgi-bin/mbox-config`
- ✅ **Login IP-based** funziona (no cookie persistenti necessari)
- ✅ **90 sezioni di config** raggiungibili via API
- ✅ **Propagazione SSID** via `ac_group_config` funziona in real-time su tutti gli AP del gruppo (testato con Otium_Guest)
- ✅ **Portal_account_config** è l'endpoint per gestione utenti mode "hotel"
- ✅ **Modifica `ac_group_config` SAFE per operazioni remote** (no network restart)
- ⚠️ **Modifica `vlan_config` + `network_config` NON SAFE** per operazioni remote senza auto-revert (triggera `network restartall`)
- ✅ **Backup/restore via Manage Config** è affidabile (se tar costruito con perms corrette)

## Todo per il primo prototipo funzionante

1. Scrivere `otium-agent.sh` (~200 righe di shell)
2. Scrivere `otium-check-alive.sh` (deadman switch) (~100 righe)
3. Implementare i 4 endpoint REST lato Otium backend (Next.js + Prisma)
4. Test end-to-end: creo prenotazione in Otium → 30s dopo l'agent esegue → ospite si collega a Otium_Guest → captive portal → credenziali → navigo
5. Test auto-revert: invio comando volutamente rotto → verifico che dopo 5 min torna come prima
6. Test scalabilità: simulo 100 device paralleli che pollano → misuro backend load
7. Prima installazione in struttura pilota → reale validazione end-to-end su cliente esterno
