# Branding del captive portal — splash page personalizzata per cliente

> Il "look & feel" che vede l'ospite quando si connette alla Wi-Fi della struttura.
> Questo documento descrive **cosa si può personalizzare**, **come funziona tecnicamente**, e **cosa è già implementato** vs **cosa è da fare**.

---

## Perché il branding è critico

Il captive portal è **il momento di verità** per ogni cliente Otium: è la prima cosa che gli ospiti vedono quando provano a navigare. Se è generico/Comfast/cinese, il cliente B&B/hotel **non lo accetta**. Pretende il SUO logo, le SUE foto, il SUO testo, il SUO link al sito.

**Il branding è quindi un requisito non-negoziabile** del prodotto, non un nice-to-have.

## Cosa Comfast permette di personalizzare

Sui controller Comfast V2.6.x (CF-AC50/100/200/300), il captive portal usa una architettura **template + dati**:

- **Template HTML statico** in `/etc/wifilith/www/account.html` (o `/etc/wifilith/www/comfast/weblogin.html` per il template alternativo)
- **Dati dinamici** caricati via JavaScript dalle API:
  - `wifilith_config` → titolo, modalità auth, enable
  - `wifilith_pic_desc` → titolo grande, sottotitolo, slideshow images, link bottone
- **File immagini fisiche** in `/etc/wifilith/www/img/` (es. `1.jpg` ... `8.jpg`)

Quindi: **un solo HTML uguale per tutti, ma contenuti diversi per cliente**. Cambiando solo le API + le immagini, lo splash diventa "il portale del cliente X".

### Cosa si può personalizzare (Level 1 = native branding)

| Elemento | Sezione API | Esempio |
|---|---|---|
| **Page title** (browser tab) | `wifilith_pic_desc.page_title` | "Hotel Il Girasole - Wi-Fi Ospiti" |
| **Header title** (titolo grande in pagina) | `wifilith_pic_desc.header_title` | "Benvenuto al Girasole" |
| **OK link** (URL del bottone "Visita il sito") | `wifilith_pic_desc.ok_link` | "https://hotelilgirasole.it" |
| **Slider duration** | `wifilith_pic_desc.times` | "15" (secondi) |
| **Slideshow images** (carousel) | `wifilith_pic_desc.sliderpic[]` | array di {src, linkaddr} |
| **Static images** (4 box) | `wifilith_pic_desc.staticpic.{static1,2,3,4}` | {src, linkaddr, pic_text} |
| **Logo image** | file `/etc/wifilith/www/comfast/css/logo.png` | upload separato |
| **CSS / colori** | file `/etc/wifilith/www/css/*.css` | upload (Level 2) |
| **Auth time, MAC whitelist, ecc.** | `wifilith_config` | non visivo, ma config |

### Quanto si può fare con Level 1

Per il 90% dei clienti B&B e piccoli hotel, **basta il Level 1**: titolo + sottotitolo + 3-5 foto della struttura nel slideshow + logo + link al sito. Lo splash sembra un "vero portale del Girasole" anche se l'HTML è quello generico Comfast.

### Quando serve Level 2 (HTML custom)

Per hotel premium/boutique che vogliono uno splash **graficamente identico al loro sito web** (stesso layout, stesse animazioni, stesse fonts), serve Level 2:

- **Sostituire** `/etc/wifilith/www/account.html` con HTML custom per quel cliente specifico
- **Sostituire** i CSS in `/etc/wifilith/www/css/*.css`
- **Caricare** font custom in `/etc/wifilith/www/fonts/`

Più lavoro, più storage, più maintenance per cliente. **Da implementare in Fase 2** quando il primo cliente premium lo richiede.

## API endpoint per il branding

| Operazione | Endpoint | Body | Note |
|---|---|---|---|
| **GET branding corrente** | `POST /cgi-bin/mbox-config?method=GET&section=wifilith_pic_desc` | `{}` | restituisce JSON con tutti i campi |
| **SET branding text** | `POST /cgi-bin/mbox-config?method=SET&section=wifilith_pic_desc` | JSON con campi modificati + array preservati | ⚠️ replace-all, **devi sempre includere sliderpic e staticpic** anche se non li modifichi, altrimenti vengono azzerati |
| **GET wifilith_config** | `POST /cgi-bin/mbox-config?method=GET&section=wifilith_config` | `{}` | enable, type, extiface, ecc. |
| **SET wifilith_config** | `POST /cgi-bin/mbox-config?method=SET&section=wifilith_config` | JSON | abilita/disabilita portale, cambia auth mode |
| **Upload immagine slider/static** | `POST /cgi-bin/mbox-config?method=SET&section=system_wl_upload_pic_file` | **multipart/form-data**, non JSON | restituisce nome file in `img/` |
| **Delete immagine** | `POST /cgi-bin/mbox-config?method=SET&section=wifilith_delete_pic_file` | JSON con `src` da eliminare | rimuove file fisico |

## Implementato in `otium-agent` v0.2 (2026-04-13)

### `set_splash_branding` ✅
Personalizza i 3 campi text del splash:

```json
{
  "action": "set_splash_branding",
  "params": {
    "page_title": "Hotel Il Girasole - WiFi",
    "header_title": "Benvenuto al Girasole",
    "ok_link": "https://hotelilgirasole.it"
  }
}
```

L'agent:
1. Login al controller
2. GET `wifilith_pic_desc` corrente
3. Estrae `sliderpic` e `staticpic` (così non li perde)
4. Costruisce nuovo payload mantenendo le immagini intatte
5. SET `wifilith_pic_desc` con i 3 campi text aggiornati
6. Riporta successo al cloud

**Tutti i 3 campi sono opzionali**: se non passati, mantiene quello corrente. Quindi puoi cambiare solo `header_title` senza toccare gli altri.

### `get_splash_branding` ✅
Restituisce lo stato corrente del branding (per visualizzazione nella dashboard Otium).

```json
{ "action": "get_splash_branding" }
```

## Da implementare in v0.3+

### `upload_splash_image` 🔬
Upload di una nuova immagine slideshow/static. Più complesso perché:

- L'API `system_wl_upload_pic_file` accetta **multipart/form-data**, non JSON
- BusyBox `curl` supporta multipart con `-F field=@file.jpg`
- L'agente deve poter ricevere il **contenuto binario dell'immagine** dal cloud → 2 opzioni:
  1. **Cloud manda URL HTTPS** dove scaricare l'immagine, agent fa wget + upload locale
  2. **Cloud manda l'immagine in base64** nel payload del comando, agent decodifica e upload (più pesante ma una sola roundtrip)

L'opzione 1 è più scalabile, l'opzione 2 è più semplice. Per Otium consiglio:
- **Storage immagini** in cloud Otium (S3 o equivalente) con URL temporanee firmate
- **Download lato agent** via wget all'URL firmata
- **Upload locale** al controller via curl multipart

```json
{
  "action": "upload_splash_image",
  "params": {
    "url": "https://otium.cdn/.../logo_42.jpg?sig=...",
    "type": "slider",
    "position": 1,
    "linkaddr": "https://hotelilgirasole.it"
  }
}
```

### `set_logo_image` 🔬
Sostituisce `/etc/wifilith/www/comfast/css/logo.png` con un'immagine custom. Stesso meccanismo di `upload_splash_image` ma path fisso.

### `clear_splash_images` 🔬
Cancella tutte le immagini Comfast default (1.jpg ... 8.jpg) per partire da splash "vuoto".

### `set_splash_html_template` (Level 2, premium) 🔬🔬
Carica un HTML custom in `/etc/wifilith/www/account.html`. Più rischioso (può rompere lo splash se l'HTML è malformato). Da fare con auto-revert deadman switch.

## Workflow operatore Otium dashboard

Quando un cliente vorrà personalizzare il suo splash, il flow tipico nel pannello Otium operatore sarà:

```
[Pannello Otium → Strutture → "Hotel Il Girasole" → Wi-Fi → Branding]
   │
   ├── Form: "Titolo della pagina"        → "Hotel Il Girasole - Wi-Fi"
   ├── Form: "Messaggio benvenuto"        → "Benvenuto al Girasole, cara stanza N°5"
   ├── Form: "Link sito web"              → "https://hotelilgirasole.it"
   ├── Upload: "Logo della struttura"     → drag & drop logo.png (max 100KB)
   ├── Upload: "Foto slideshow (1-5)"     → 1 a 5 foto della struttura
   ├── Form: "Colore principale"          → color picker → CSS variable
   └── [Pulsante: Salva e applica]
       │
       ▼
   API Otium backend riceve form data
       │
       ▼
   Crea command in coda per il device:
   {
     "action": "set_splash_branding",
     "params": {
       "page_title": "Hotel Il Girasole - Wi-Fi",
       "header_title": "Benvenuto al Girasole",
       "ok_link": "https://hotelilgirasole.it"
     }
   }
   + se logo cambiato:
   {
     "action": "set_logo_image",
     "params": { "url": "https://otium.cdn/.../logo_42.png?sig=..." }
   }
   + se foto cambiate:
   { "action": "clear_splash_images" }
   { "action": "upload_splash_image", "params": {...} } x 5
       │
       ▼
   Otium agent sul device riceve i comandi entro 30s
       │
       ▼
   Esegue uno per uno → portal aggiornato
       │
       ▼
   Operatore vede in dashboard: "Branding aggiornato 2 minuti fa"
```

## Esempio completo: provisioning di un nuovo cliente

Quando un cliente nuovo ("Hotel Il Girasole") sottoscrive Otium Wi-Fi, il flusso completo è:

1. **Operatore Otium** crea nel DB la struttura
2. **Operatore** carica i materiali del cliente nella sezione Branding:
   - Logo (PNG, max 100KB)
   - 3-5 foto della struttura (JPG, max 500KB ciascuna)
   - Testi (titolo, header, link)
3. **Operatore** spedisce il device pre-provisionato (tramite `patch_factory_backup.sh`) al cliente
4. **Cliente** riceve il device, lo collega → primo boot
5. **Agent** sul device contatta Otium cloud, riceve sequenza di comandi:
   - `set_splash_branding` (text)
   - `clear_splash_images` (rimuove i Comfast default)
   - `upload_splash_image` x N (foto cliente)
   - `set_logo_image` (logo cliente)
6. **Entro 5 minuti dal primo boot**, lo splash è completamente brandizzato
7. **Cliente** stampa il poster "Wi-Fi Network: HotelGirasole-Guest" da appendere in camera, e accoglie i primi ospiti

## Considerazioni di sicurezza e GDPR

- **Le immagini caricate dal cliente** sono dati propri (logo, foto), non personali → no problemi GDPR
- **Le foto NON devono contenere persone identificabili** se vengono mostrate nel splash (es. foto degli ospiti precedenti = NO). Disclaimer al cliente nel form upload.
- **Il logo del cliente** è proprietà intellettuale del cliente → memorizzato in cloud Otium con accesso solo agli operatori autorizzati
- **Il link "Visit website"** dello splash deve essere validato (HTTPS preferibile, no link a contenuti pirata/illegali) → rule-of-thumb: solo URL del cliente stesso

## Roadmap branding

| Fase | Action | Stato |
|---|---|---|
| **v0.2** | `set_splash_branding` (text-only) | ✅ implementato e testato 2026-04-13 |
| **v0.2** | `get_splash_branding` | ✅ implementato |
| **v0.3** | `upload_splash_image` (slider) | 🔬 da fare |
| **v0.3** | `upload_splash_image` (static) | 🔬 da fare |
| **v0.3** | `clear_splash_images` | 🔬 da fare |
| **v0.4** | `set_logo_image` | 🔬 da fare |
| **v0.5** | UI Otium dashboard branding (operatore) | 🔬 da fare lato Next.js |
| **v0.6** | Cloud storage immagini + URL firmati | 🔬 da fare lato infra |
| **v1.0** | Multi-language support nel splash | 🔬 da fare |
| **v2.0** | HTML template custom (Level 2, premium) | 🔬 fase 2 |
