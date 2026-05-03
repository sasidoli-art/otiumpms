# Compliance legale Otium Wi-Fi

> ⚠️ **Avviso**: questa documentazione è stata redatta da uno sviluppatore, NON è
> pareristica legale. Prima del go-live commerciale far rivedere da un avvocato
> specializzato in diritto delle telecomunicazioni / privacy / GDPR.
>
> Gli scenari di applicazione (Polizia Postale, magistratura) sono delicati e
> un errore procedurale può comportare responsabilità penale per il provider.

Documenta come il prodotto Otium Wi-Fi rispetta le normative italiane ed
europee applicabili al fornitore di accesso Wi-Fi pubblico (categoria che
include B&B, hotel, agriturismi, ristoranti, palestre, ecc. che offrono
Wi-Fi gratuito ai clienti).

---

## 1. Quadro normativo

### 1.1 Decreto Pisanu (D.L. 144/2005, conv. L. 155/2005)

Il decreto, originariamente nato per il contrasto al terrorismo, imponeva al
fornitore Wi-Fi di **identificare l'utente** e **conservare i log** degli
accessi. Modificato dal D.L. 5/2012 e dal Decreto del Fare (DL 69/2013) che
hanno **alleggerito** gli obblighi (l'identificazione non è più strettamente
obbligatoria con verifica documento), ma:

- Provider **deve essere in grado** di identificare l'utente di una sessione su
  richiesta dell'autorità
- Log degli accessi vanno **conservati per il tempo necessario** (in pratica
  6-12 mesi per consuetudine, allineato alla data retention generale telco)
- Non è obbligatorio richiedere il documento al login, ma chi sceglie metodi
  "deboli" (es. accesso libero senza identificazione) si assume il rischio
  di non poter rispondere a richieste autorità

**Cosa implementiamo**:
- Identificazione utente al login (PMS = Cognome + Numero camera, oppure
  Codice + Nome opzionale, oppure Email + nome)
- Conservazione **12 mesi** delle sessioni (oltre il minimo prudenziale di 6m)
- Estrazione strutturata via UI superadmin in PDF firmato + CSV

### 1.2 Codice Procedura Penale, art. 254-bis

L'autorità giudiziaria (Pubblico Ministero / Polizia Giudiziaria) può
richiedere al provider l'**acquisizione di dati informatici** in possesso di
provider di servizi telematici. Il provider deve fornirli **senza ritardo**.

Tempistiche tipiche di prassi:
- Richiesta urgente: 24-48 ore
- Richiesta ordinaria: fino a 7 giorni
- Forma: PEC, firma digitale del Pubblico Ministero o del suo delegato

**Cosa implementiamo**:
- Pagina `/superadmin/wifi/forensic` per estrazione in 5 minuti
- PDF firmato (SHA-256) consegnabile via PEC o portale autorità
- CSV per import in tool forensi (Encase, FTK, ecc.)
- Audit log completo della richiesta (chi ha estratto cosa, quando, da che IP)

### 1.3 GDPR (Reg. UE 2016/679) e Codice Privacy (D.Lgs. 196/2003 modif.)

I log accessi sono **dati personali** (associano persona fisica a IP/MAC/sessione).
Quindi:

- **Base giuridica**: art. 6.1.c GDPR (obbligo legale derivante dal Decreto
  Pisanu) per la conservazione, art. 6.1.f (legittimo interesse) per la
  prevenzione abusi
- **Data minimization**: conserviamo SOLO i metadati di sessione, NON i
  contenuti (quali siti visita l'utente non è loggato)
- **Storage limitation**: retention 12 mesi → automatic delete (vedi sezione 4)
- **Integrity & confidentiality**: cifratura at-rest (Postgres su Neon con
  AES-256), TLS in-transit, accesso ristretto a SuperAdmin
- **Diritti dell'interessato** (artt. 15-22): l'ospite può richiedere accesso
  ai propri log via il portale ospite (`/ospite/data-export` esistente nel PMS)
- **DPIA** (art. 35): per attività di sorveglianza sistematica si fa una
  Data Protection Impact Assessment. Per Wi-Fi guest standard NON è
  obbligatoria (è considerato trattamento standard)
- **DPA con i clienti host**: Otium PMS è data **processor** rispetto all'host
  cliente che è data **controller**. Va sottoscritto un DPA standard
  ([template GDPR Art. 28](https://gdpr-info.eu/art-28-gdpr/))

### 1.4 Direttiva NIS2 (Reg. UE 2022/2555)

In vigore dal 17 ottobre 2024. Si applica a "fornitori di servizi digitali"
e "operatori di servizi essenziali" sopra certe soglie. Per il segmento
B&B/agriturismi NON si applica direttamente. Per hotel grandi (>100 dipendenti
o >€50M ricavi) sì.

**Cosa monitoriamo**: quando un cliente Otium supera le soglie NIS2, lo
notifichiamo e gli proponiamo upgrade del piano con audit di sicurezza
ulteriore.

---

## 2. Architettura compliance del prodotto

### 2.1 Cosa logghiamo

Per ogni accesso Wi-Fi guest:

| Campo | Esempio | Fonte |
|---|---|---|
| Session ID | cuid `cm123abc...` | generato al login |
| Tipo login | PRENOTAZIONE / CODICE / EMAIL_ONLY / ... | metodo auth scelto |
| Identità ospite (nome/cognome) | "Mario Rossi" | da form login o da Prenotazione |
| Email ospite | `mario@example.it` | da Prenotazione (se PRENOTAZIONE) o User Form |
| Documento (tipo+numero) | "PPORT YA1234567" | da Prenotazione (alloggiati) |
| Codice fiscale | (italiani) | da Prenotazione |
| Data + luogo nascita | dal documento | da Prenotazione |
| Cittadinanza ISTAT | "100000100" (IT) | da Prenotazione |
| Camera/Numero unità | "Suite 5" | da Prenotazione → Unita |
| MAC client | `aa:bb:cc:dd:ee:ff` | dal protocollo wifidog al login |
| IP locale assegnato | `172.20.0.105` | dal DHCP del router |
| User-Agent | "Mozilla/5.0..." | dal browser |
| Inizio sessione | ISO 8601 con timezone | server-side al login |
| Scadenza sessione | ISO 8601 | calcolato (durata codice / fine prenotazione) |
| Revoca sessione | ISO 8601 (se logout) | quando router segnala stage=logout |

### 2.2 Cosa NON logghiamo (per privacy)

- ❌ **Contenuti del traffico** (URL visitati, DNS query) — sarebbe
  intercettazione, illegale senza autorizzazione GIP
- ❌ **Dati personali del Wi-Fi staff** (employees) — solo guest log
- ❌ **Geolocalizzazione precisa** — solo struttura (struttura → indirizzo
  registrato)

### 2.3 Retention policy

Configurato in [`lib/gdpr-retention.ts`](../../lib/gdpr-retention.ts) e
schedulato in [`/api/cron/gdpr-retention`](../../app/api/cron/gdpr-retention/route.ts):

```typescript
{
  id: 'wifi_sessions',
  entita: 'WifiSession',
  descrizione: 'Sessioni Wi-Fi (Decreto Pisanu)',
  baseGiuridica: 'obbligo_legale',
  riferimentoNormativo: 'D.L. 144/2005 (Decreto Pisanu)',
  giorniRetention: 365, // 12 mesi
  contatoreDataDa: 'startAt',
  azione: 'cancella',
}
```

Cron giornaliero (02:00 UTC = 03:00 CET) cancella automaticamente i record
più vecchi di 365 giorni dall'inizio della sessione. Idem `WifiAccessLog`.

### 2.4 Audit & Chain of Custody

Ogni operazione su log forensi viene registrata in `audit_log` con:
- Operatore (userId + email SuperAdmin)
- Azione (`wifi.forensic.search` / `wifi.forensic.export` /
  `wifi.forensic.export.completed`)
- Timestamp ISO + IP origine richiesta
- Filtri usati nella ricerca
- Numero record ritornati
- SHA-256 del PDF prodotto (per export PDF)
- Numero protocollo della richiesta autorità (se inserito)

---

## 3. Procedura "Richiesta Autorità"

### 3.1 Ricezione richiesta

Le richieste autorità ufficiali arrivano tipicamente:
- **Via PEC** all'indirizzo PEC della società Otium S.r.l. (`otium@pec.it`)
- **Su carta intestata** dell'autorità con firma e protocollo
- Riferiscono tipicamente:
  - Numero protocollo / R.G.N.R.
  - Data
  - Autorità richiedente (es. "Polizia Postale e delle Comunicazioni — Sez.
    Lombardia")
  - Dati richiesti (es. "log accessi Wi-Fi su IP 172.20.0.105 del 12/03/2026")
  - Base giuridica (es. "ai sensi degli artt. 254 e 254-bis CPP")
  - Tempo di risposta (es. "entro 7 giorni")

**Verifiche obbligatorie**:
1. Autenticità del mittente (PEC della Procura, firma digitale verificabile)
2. Coerenza con base giuridica citata
3. Specificità dei dati richiesti (no fishing expedition)

In caso di dubbio: richiedere conferma tramite altro canale (telefono al
numero della Questura), e se persiste il dubbio, **rifiutare la divulgazione**
e contattare avvocato.

### 3.2 Estrazione log

1. Login a `otium-pms.vercel.app` come SuperAdmin
2. Navigare a **WI-FI → Report Forense** (`/superadmin/wifi/forensic`)
3. Inserire i filtri (es. IP `172.20.0.105`, range data `2026-03-12 00:00 →
   2026-03-12 23:59`)
4. Click **Cerca sessioni** → tabella anteprima
5. Espandere "Metadata richiesta autorità" e compilare:
   - Numero protocollo (es. "Prot. 1234/2026")
   - Data protocollo
   - Autorità richiedente
   - Riferimento procedimento (R.G.N.R.)
6. Click **Export PDF firmato (SHA-256)**
7. Annotare lo SHA-256 mostrato nell'alert post-download (per consegna separata)
8. Verificare il PDF generato (apertura, leggibilità, completezza)

### 3.3 Consegna

- **Via PEC** all'indirizzo specificato nella richiesta autorità
- Allegare:
  - PDF firmato (`otium-wifi-forensic-Prot1234_2026-2026-05-03T...pdf`)
  - Eventuale CSV per ulteriori analisi
  - SHA-256 del PDF nel corpo dell'email PEC (per integrity verification
    indipendente: l'autorità può verificare con `certutil -hashfile` o `sha256sum`)
  - Conferma di trasmissione automatica della PEC (notifica di consegna)

### 3.4 Cosa fare DOPO

1. Salvare nel CRM una copia della richiesta + risposta (file PDF + log audit)
2. Verificare che l'audit log su `audit_log` riporti correttamente
   l'estrazione (verifica chain of custody)
3. Se l'autorità chiede ulteriori informazioni: consultare avvocato prima
   di rispondere
4. **Mai distruggere** i log fino a chiusura del procedimento (la retention
   automatica può essere sospesa per i record collegati a una richiesta
   pendente — TODO)

### 3.5 Rifiuto giustificato (casi limite)

Se la richiesta:
- È priva di firma digitale dell'autorità
- Cita base giuridica non applicabile
- Richiede contenuti del traffico (URL, DNS) che non logghiamo
- È formulata via canale non ufficiale (email standard, telefono)
- Eccede i poteri dell'autorità richiedente (es. Polizia Locale che chiede
  log telco)

→ **Rispondere richiedendo chiarimenti** + cc avvocato in PEC. NON divulgare
finché non risolto.

---

## 4. Documenti accessori

### 4.1 Privacy Notice per ospite (captive portal)

Versione corrente nel footer della pagina di login (`/api/wifi/wifidog/login`):

> "Log accessi conservati 6 mesi - GDPR"

**Da estendere** in versione completa (link "T&C / Privacy" sulla pagina):

```
INFORMATIVA PRIVACY ACCESSO WI-FI

Titolare del trattamento: [Nome host cliente]
Indirizzo: [via, città]
Email: [host email]
Email del DPO (se presente): [email DPO]

Finalità del trattamento:
1. Erogazione del servizio Wi-Fi (necessità contrattuale)
2. Adempimento obbligo di legge ai sensi del D.L. 144/2005 (Pisanu)
   per la conservazione dei log accessi
3. Sicurezza informatica e prevenzione abusi (legittimo interesse)

Categorie di dati trattati:
- Identificativi (nome, cognome, email, numero camera/codice di accesso)
- Dati tecnici (MAC del device, IP assegnato, timestamp connessione,
  user agent del browser)
- (Per ospiti con prenotazione): dati di alloggiati (documento, codice
  fiscale) come da modulo di check-in

Conservazione: 12 mesi dalla data della sessione, poi cancellazione automatica.

Destinatari: Otium PMS S.r.l. (responsabile del trattamento ai sensi
art. 28 GDPR), autorità giudiziaria su richiesta motivata (artt. 254-bis CPP,
DL 144/2005).

Trasferimento extra-UE: nessuno (DB su Neon EU-Central-1).

Diritti dell'interessato (artt. 15-22 GDPR):
- Accesso ai propri log: richiedere via [host email] o portale ospite
- Rettifica dati anagrafici: stesso canale
- Cancellazione: NON applicabile per i log di sessione coperti da obbligo
  legale; applicabile per dati CRM (preferenze, marketing)
- Opposizione, portabilità: stesso canale

Reclamo: Garante per la Protezione dei Dati Personali (www.garanteprivacy.it)

Pisanu compliance: l'accesso Wi-Fi è soggetto a identificazione utente
ai sensi del D.L. 144/2005. Continuando, accetti questa informativa.
```

→ TODO: rendere questa privacy notice configurabile per host, mostrabile come
"Più info" sulla pagina di login. Effort: 4h.

### 4.2 DPA template Otium ↔ Host cliente

Lo spazio del template DPA è in [`docs/contratti/DPA_OTIUM_HOST_template.md`](../contratti/DPA_OTIUM_HOST_template.md) — TODO: creare se non esiste.

Articoli essenziali (artt. 28 GDPR):
- Oggetto: Otium agisce come responsabile del trattamento per i dati log Wi-Fi
- Durata: durata del contratto SaaS + retention 12 mesi log
- Natura e finalità: erogazione servizio Wi-Fi + Pisanu compliance
- Tipi di dati: come da sezione 2.1
- Categorie interessati: ospiti delle strutture cliente
- Obblighi del responsabile: cifratura, audit, sub-processor list
- Sub-processors: Vercel (host), Neon (DB), Resend (email)
- Misure di sicurezza: TLS, WAF, audit log, RBAC
- Notifica violazioni: entro 24h al titolare
- Cancellazione/restituzione: al termine del contratto, sceglie il titolare

### 4.3 Politica di conservazione (interna)

Documento interno per il team Otium:
- Quali dati sono soggetti a retention legale (12m wifi_sessions/access_logs)
- Quali sono soggetti a retention contrattuale (6 anni per fatture, dichiarazione
  Codice Civile)
- Quando cancellare manualmente (chiusura account host = blackout 30g grace
  poi delete)
- Eccezioni "legal hold" per richieste autorità pendenti (TODO: implementare
  flag su WifiSession per pause retention)

---

## 5. Roadmap legal/compliance

| Item | Priorità | Effort | Stato |
|---|---|---|---|
| Retention automatica 12 mesi | 🔥 | done | ✅ |
| UI estrazione forense + PDF firmato | 🔥 | done | ✅ |
| Audit log con chain of custody | 🔥 | done | ✅ |
| Privacy notice estesa configurabile per host | 🟡 | 4h | TODO |
| DPA template Otium ↔ Host (review legale) | 🔥 | 1g + €500 avvocato | TODO |
| "Legal hold" flag su WifiSession (pausa retention per richieste pending) | 🟡 | 4h | TODO |
| Firma digitale qualificata CAdES/PAdES sul PDF (vs SHA-256 attuale) | 🟢 | 2g + cert provider | NICE-TO-HAVE |
| Pagina pubblica `/legal/wifi` con privacy notice + T&C | 🟡 | 2h | TODO |
| Procedura interna "ricevuta richiesta autorità" (form Linear/Notion) | 🟡 | 2h | TODO |
| Training team su procedura (slide deck) | 🟡 | mezza gg | TODO |

---

## 6. Disclaimer

**Questo documento NON è parere legale**. Va validato da un avvocato del foro
di Milano (o ovunque la società abbia sede legale) specializzato in:
- Diritto delle comunicazioni elettroniche
- GDPR/Privacy
- Diritto penale informatico

Costo orientativo della review: €300-€800 una tantum + €100-200/anno per
follow-up annuale.

Una volta validato, sostituire questo disclaimer con: "Documento conforme
alla normativa al [DATA], rivisto da Avv. [NOME] del foro di [LUOGO]."
