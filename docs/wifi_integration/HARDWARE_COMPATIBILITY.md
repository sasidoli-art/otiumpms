# Compatibilità Hardware — scelte e strategia vendor

> **Domanda aperta critica per il business model**: possiamo supportare hardware di marche diverse (es. Cisco esistente del cliente), o dobbiamo vendere il bundle Comfast obbligatorio?
>
> **Risposta corta**: per Fase 1 → bundle Comfast obbligatorio. Fase 2+ → ibrido con supporto RADIUS vendor-agnostic.

---

## Il problema di fondo

I produttori di "Wi-Fi as a Service" per hospitality si dividono in 2 scuole:

1. **Vendor-locked**: sellano hardware + software come bundle inseparabile. Meraki, Aruba Central, Cisco DNA, TP-Link Omada, Ubiquiti UniFi. **Margine alto, complessità bassa, barriera ingresso alta**.

2. **Vendor-agnostic**: operano su hardware esistente del cliente via protocolli standard (RADIUS, WPA2-Enterprise, captive portal HTTP redirect). Cucumber Tony, Purple WiFi, SocialWiFi, Guest Internet. **Margine più basso, complessità alta, barriera ingresso bassa**.

## CAPWAP: lo standard che non è mai davvero uno standard

**RFC 5415/5416** definiscono CAPWAP come protocollo standard per il control plane tra AP e controller WLAN. In teoria, qualunque AP CAPWAP-compatibile dovrebbe parlare con qualunque controller CAPWAP-compatibile.

**In pratica** ogni vendor implementa CAPWAP con **proprietary message elements** che lo rendono de facto incompatibile cross-vendor:

| Vendor | Protocollo di control | Cross-vendor? |
|---|---|---|
| **Cisco** (Aironet 1700/2700/3700/9100 series, Catalyst 9100) | LWAPP + CAPWAP con *Cisco AVPs proprietari* + certificati X.509 Cisco-signed | ❌ Solo con Cisco WLC (2500, 5500, 5700, 3650/3850, 9800 series) o Cisco DNA Center |
| **Aruba** (AP-300, AP-500, ecc.) | PAPI (proprietario Aruba) | ❌ Solo con Aruba Mobility Controller o Central |
| **Ruckus** (Unleashed, ZoneFlex) | SmartZone / ZoneDirector protocol proprietario | ❌ Solo con SmartZone |
| **Ubiquiti UniFi** | Inform protocol proprietario | ❌ Solo con UniFi Controller |
| **TP-Link Omada** | Omada Controller protocol proprietario | ❌ Solo con OC200/OC300/Omada SDN |
| **Meraki** | Cloud-only, closed | ❌ Solo con Meraki Cloud (abbonamento) |
| **Mikrotik CAPsMAN** | CAPsMAN proprietary | ❌ Solo con RouterOS con CAPsMAN |
| **Comfast** (CF-E375AC, CF-E385AC, CF-EW72V2, ecc.) | Custom `wtpd` + CAPWAP-like | ❌ Solo con Comfast AC Gateway (CF-AC50/100/200/300) |

**La realtà**: non esistono veramente "CAPWAP controllers open" che possano gestire AP di marche miste. Ogni ecosistema è siloed.

## La domanda specifica: "ho dei Cisco Aironet 3700, funzionano con Comfast AC300?"

**No, non funzionano.** I Cisco Aironet 3700 (3702, 3700i, 3700e, ecc.):

- Ship con firmware "lightweight" che cerca un **Cisco WLC** via DHCP option 43 o DNS (`CISCO-CAPWAP-CONTROLLER.<dominio>`)
- La registrazione richiede certificati X.509 pre-installati da Cisco
- Il controller Comfast `wtpd` non conosce il protocollo Cisco, scarta i pacchetti
- L'AP dopo N tentativi va in "idle" o si spegne (dipende dal firmware)

**Risultato**: un Cisco 3702 collegato a una rete con CF-AC300 è un mattone inutile.

**Eccezioni** (se il cliente vuole riutilizzare hardware Cisco esistente):

1. **Flash firmware "autonomous"**: alcuni Cisco Aironet (incluso 3702) hanno un firmware "autonomous IOS" che li rende standalone, ognuno con la sua web UI. Non ci sono funzioni di central management, ma **funzionano come AP indipendenti**. L'immagine autonomous è distribuita da Cisco con contratto supporto; in grey-market si trova, ma è a rischio legale.

2. **Flash con OpenWrt**: i Cisco 3702i/3702e usano chipset Atheros AR9xxx → **OpenWrt 18.06+ ha supporto** con qualche limitazione. Questo li trasforma in router/AP generici OpenWrt, compatibili con RADIUS, hostapd, e in teoria anche CAPsMAN di Mikrotik. Richiede saldare una seriale per il primo flash di solito.

3. **Sostituzione**: vendere su eBay i Cisco (30-60€/pezzo usato), comprare Comfast o Mikrotik con il ricavato. È la strada più pulita per integrazione Otium.

## Strategia vendor per Otium — le 3 opzioni

### Opzione A — Bundle Comfast Ecosistema *(Fase 1)*

Il cliente compra (o noleggia) hardware Comfast pre-configurato da Otium. Tu garantisci solo il funzionamento con Comfast. Qualsiasi hardware di altra marca **non è supportato**.

**Hardware di riferimento 2026**:

| Modello | Prezzo target | Max client | Max AP | Caso d'uso |
|---|---|---|---|---|
| **CF-AC50** | ~€80 | 100 | 24-48 | B&B 2-10 camere |
| **CF-AC100** | ~€120 | 300 | 128 | Hotel 10-25 camere |
| **CF-AC101** | ~€180 | 1000 | 128 | Premium x86 |
| **CF-AC300** | ~€280 | 5000 | 256 | Hotel 30-100 camere |
| **AP CF-E385AC** | ~€50 | — | — | AP 2.4+5GHz dual-band |
| **AP CF-E375AC** | ~€40 | — | — | AP entry |

Il tutto firmware OrangeOS V2.6.x condiviso → **1 codebase copre l'intera linea**.

**Pro**:
- ✅ Semplicissimo da supportare: 1 vendor, 1 firmware, 1 agent
- ✅ Margine extra sulla rivendita/noleggio hardware
- ✅ Controllo totale della qualità del servizio
- ✅ Onboarding cliente in 1-2 ore (arrivi, monti, accendi, è già configurato)

**Contro**:
- ❌ Cliente con investment hardware precedente deve rottamarlo
- ❌ Supply chain dipendente da Comfast (vendor cinese, rischio cambi firmware, discontinuance)
- ❌ Mercato limitato ai clienti "greenfield" (nuove strutture o strutture che rifanno rete)

### Opzione B — RADIUS-based Vendor Agnostic *(Fase 2+)*

Otium non usa CAPWAP. Invece:

1. Deploya sul router edge del cliente un piccolo device Otium (box compatto, tipo mini-PC N100) che contiene **FreeRADIUS + otium-agent + captive portal locale**
2. Il cliente configura i suoi AP esistenti (Cisco, Ubiquiti, Aruba, chiunque) per usare il **RADIUS Otium** come backend auth per la guest network
3. Otium cloud gestisce gli utenti guest → sync al RADIUS locale → quando l'ospite si autentica (via il portale Cisco/Aruba/Ubiquiti), la decisione passa dal RADIUS Otium
4. Gli AP esistenti del cliente restano intatti, non vengono gestiti da Otium, fanno solo da "dumb auth clients"

**Pro**:
- ✅ Vendor-agnostic: funziona con Cisco, Aruba, Ubiquiti, TP-Link, Ruckus, Mikrotik, qualunque AP che parli RADIUS (>99% dell'hardware enterprise)
- ✅ Rispetta l'investimento hardware pregresso del cliente
- ✅ Mercato molto più grande (clienti "brownfield")
- ✅ Separazione chiara: il cliente mantiene la sua infrastruttura Wi-Fi, Otium gestisce solo l'autenticazione

**Contro**:
- ❌ Molto più complesso da sviluppare (FreeRADIUS + NAS protocol + portal universale)
- ❌ Ogni cliente può avere AP diversi → debugging mille volte più difficile
- ❌ Dipendi dalla configurazione corretta dei device del cliente (se lui sbaglia un parametro sull'AP, Otium non funziona)
- ❌ Margine hardware basso (vendi solo il piccolo box edge)
- ❌ Non puoi cambiare SSID remotamente (l'SSID è sul AP del cliente, non tuo)

### Opzione C — Ibrido Comfast + RADIUS *(roadmap completa)*

**Fase 1** (Mesi 0-6): **solo bundle Comfast**. Target: 5-15 clienti pilota per validazione del prodotto, fatturato iniziale, feedback.

**Fase 2** (Mesi 6-12): **RADIUS mode aggiunto**. Clienti con hardware Cisco/Ubiquiti/Aruba possono sottoscrivere "Otium Wi-Fi Lite" → Otium fornisce solo l'edge box + servizio cloud, il cliente mantiene i suoi AP. Target: +20-50 clienti dal mercato brownfield.

**Fase 3** (Mesi 12-24): **espansione hardware**. Oltre a Comfast, certifichi anche 1-2 brand alternativi (es. Mikrotik hAP ax3 + cAP ax, oppure GL.iNet). Multi-vendor nel bundle. Target: scalabilità, resilienza supply chain.

**Questa è la strada che ha seguito Cucumber Tony** (startup UK → acquistata da Zix Corp → oggi offre sia bundle che brownfield).

## Raccomandazione per Otium

**Inizia con Opzione A (bundle Comfast)**. Motivi:

1. **Time-to-market**: il primo prodotto funzionante uscirà in 2-3 mesi, non 6-12
2. **Semplicità operativa**: tu da solo/piccolo team gestisci 1 stack, non N
3. **Cash flow**: hardware venduto (o noleggiato) contribuisce al margine mentre sviluppi il SaaS
4. **Validazione**: capisci cosa vogliono davvero i primi clienti prima di costruire la versione "brownfield" che è 10x più complessa

**Pianifica Opzione C come roadmap** dalla prima giornata, ma non partire a costruirla fino a quando non hai almeno 10 clienti bundle pagantimensilmente.

## Cosa dire al cliente che chiede "ma io ho già un Wi-Fi"

Script di risposta standard:

> *"Capisco. Al momento Otium Wi-Fi funziona con il nostro kit hardware dedicato, che garantisce una qualità di servizio certificata e supporto integrato. Il tuo Wi-Fi esistente continua a funzionare come sempre — il nostro sistema crea una rete separata "Guest" dedicata agli ospiti, con captive portal e registrazione conforme alla legge Pisanu. Non sostituisce il tuo Wi-Fi del personale/amministrazione. In futuro potremo integrare con i tuoi AP Cisco/Ubiquiti/Aruba esistenti, ma per adesso è meglio tenere le due reti separate per affidabilità."*

Questo script:
- Non nega il problema (il cliente ha già infrastruttura)
- Riformula la vendita come "aggiunta" non "sostituzione"
- Promette roadmap futura senza vincolarti
- Evita tecnicismi che potrebbero complicare la vendita

## Cisco 3702 in casa (caso personale)

I Cisco Aironet 3702 in tuo possesso **non sono utilizzabili con Comfast CF-AC300**. Opzioni:

1. **Tenerli come backup emergency** (non gestiti, non online) se mai Comfast avesse un problema
2. **Usarli in parallelo su VLAN diversa di casa** (ogni AP standalone con propria SSID, gestito a mano) per testare l'opzione B RADIUS in futuro
3. **Rivenderli su eBay** — 30-60€/pezzo usato, liquidità immediata
4. **Laboratorio OpenWrt** — flashate e usate per prototipare la modalità B vendor-agnostic quando sarà il momento

**Per Otium Fase 1 non sono necessari.** Il CF-AC300 con 2-3 AP CF-E385AC è sufficiente per lo sviluppo iniziale.
