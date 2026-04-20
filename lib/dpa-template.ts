/**
 * DPA Template — Accordo di trattamento dati (Art. 28 GDPR).
 *
 * Struttura del documento. NON è un documento legale definitivo: l'host
 * deve farsi validare il DPA da un legale prima del rollout in produzione.
 * Questo template copre le sezioni minime richieste da Art. 28.
 *
 * Al cambio di DPA_VERSIONE, tutti gli host devono ri-accettare
 * (guardia in /host/layout.tsx).
 */

export const DPA_VERSIONE = '2026-04-01'

export type DPASezione = {
  titolo: string
  testo?: string
  lista?: string[]
}

export type DPATemplate = {
  versione: string
  titolo: string
  premessa: string
  parti: {
    titolare: string // {nomeAzienda} placeholder
    responsabile: string
  }
  sezioni: DPASezione[]
  note: string
}

export const DPA_TEMPLATE: DPATemplate = {
  versione: DPA_VERSIONE,
  titolo: 'Accordo per il trattamento dei dati personali (Art. 28 GDPR)',
  premessa:
    "Il presente accordo disciplina il rapporto tra le parti ai sensi dell'art. 28 del Regolamento (UE) 2016/679 (GDPR) con riferimento ai dati personali trattati dal Responsabile per conto del Titolare.",
  parti: {
    titolare: '{nomeAzienda} — Titolare del trattamento',
    responsabile: 'Otium — Responsabile del trattamento',
  },
  sezioni: [
    {
      titolo: '1. Oggetto',
      testo:
        "Il presente accordo disciplina il trattamento dei dati personali che il Responsabile effettua per conto del Titolare nell'ambito della fornitura del servizio Otium (PMS, booking engine, CRM, gestione SPA, concierge AI, Wi-Fi captive portal).",
    },
    {
      titolo: '2. Durata',
      testo:
        "Il presente accordo ha la stessa durata del contratto di servizio tra le parti e si risolve automaticamente alla sua cessazione. Al termine, il Responsabile, su istruzione del Titolare, cancella o restituisce tutti i dati personali trattati, salvi gli obblighi di conservazione previsti dalla legge.",
    },
    {
      titolo: '3. Natura e finalità del trattamento',
      testo:
        'Il trattamento è svolto esclusivamente per la fornitura del servizio: gestione prenotazioni, check-in online, comunicazioni con gli ospiti, fatturazione, adempimenti Alloggiati Web, gestione trattamenti SPA (incluso il waiver sanitario), analisi aggregate e statistiche.',
    },
    {
      titolo: '4. Categorie di dati trattati',
      lista: [
        'Dati anagrafici ospiti (nome, cognome, data/luogo di nascita, nazionalità)',
        'Dati di contatto (email, telefono)',
        'Documenti di identità per Alloggiati Web (tipo, numero, luogo di rilascio)',
        'Dati di prenotazione (date, struttura, importi, preferenze)',
        'Dati di pagamento (metodo, ultime 4 cifre, ID transazione — non numeri carta completi)',
        'Dati sanitari SPA (condizioni mediche, allergie, farmaci) — Art. 9 GDPR',
        'Comunicazioni con ospiti (chat, WhatsApp)',
        'Dati di navigazione Wi-Fi (MAC, IP, bytes) — Decreto Pisanu',
      ],
    },
    {
      titolo: '5. Categorie di interessati',
      lista: [
        'Ospiti delle strutture ricettive e loro accompagnatori',
        'Staff del Titolare con accesso al sistema',
        'Contatti commerciali (fornitori di tariffe, eventi)',
      ],
    },
    {
      titolo: '6. Obblighi del Responsabile',
      lista: [
        "Trattare i dati solo su istruzione documentata del Titolare (incluse quelle fornite tramite l'interfaccia del software)",
        'Garantire che le persone autorizzate al trattamento si siano impegnate alla riservatezza',
        "Adottare tutte le misure di sicurezza richieste dall'art. 32 GDPR",
        'Assistere il Titolare nel dare risposta alle richieste degli interessati (Art. 12-22 GDPR)',
        'Assistere il Titolare in relazione a notifiche al Garante, comunicazioni agli interessati, valutazioni di impatto',
        'Mettere a disposizione del Titolare tutte le informazioni necessarie per dimostrare il rispetto degli obblighi',
        'Contribuire alle attività di revisione/audit richieste dal Titolare',
      ],
    },
    {
      titolo: '7. Misure di sicurezza (Art. 32 GDPR)',
      lista: [
        'Crittografia dei dati in transito: TLS 1.3 su tutte le connessioni',
        'Crittografia dei dati sensibili a riposo: AES-256-GCM per credenziali e API keys',
        'Isolamento multi-tenant: ogni host è segregato tramite hostId a livello query',
        "Autenticazione a due fattori disponibile per gli utenti",
        'Audit log degli accessi ai dati personali (Art. 32) con tracciamento IP e user-agent',
        'Policy di retention automatica per minimizzazione dei dati (Art. 5)',
        'Backup giornalieri crittografati con retention di 30 giorni',
        'Monitoraggio continuo dei log di sistema e alert su anomalie',
      ],
    },
    {
      titolo: '8. Sub-responsabili autorizzati',
      lista: [
        'Vercel Inc. (USA) — hosting applicazione e CDN. Trasferimento EU-US basato su DPF + SCC',
        'Neon Inc. (USA) — database PostgreSQL. Trasferimento EU-US basato su DPF + SCC',
        'Sentry — monitoraggio errori applicativi',
        "Provider SMTP scelto dall'host — invio email transazionali",
        'Meta (Facebook) — WhatsApp Business API (opzionale, se modulo Concierge attivo)',
        'Anthropic / OpenAI — provider AI per il Concierge (opzionale, anonimizzato)',
      ],
    },
    {
      titolo: '9. Trasferimento dati extra-UE',
      testo:
        "Alcuni sub-responsabili hanno sede negli Stati Uniti. Tali trasferimenti avvengono in conformità all'EU-US Data Privacy Framework e/o Clausole Contrattuali Standard (SCC) approvate dalla Commissione Europea con Decisione (UE) 2021/914.",
    },
    {
      titolo: '10. Notifica di data breach',
      testo:
        'Il Responsabile notifica al Titolare ogni violazione di dati personali senza ingiustificato ritardo e comunque entro 48 ore dalla scoperta, fornendo tutte le informazioni necessarie per la successiva notifica al Garante (entro 72 ore, Art. 33 GDPR).',
    },
    {
      titolo: '11. Cancellazione o restituzione dei dati',
      testo:
        'Al termine del contratto, il Titolare può richiedere al Responsabile, entro 30 giorni, la cancellazione o la restituzione completa dei dati, salvo diversi obblighi di legge (fatturazione 10 anni, Alloggiati 5 anni).',
    },
    {
      titolo: '12. Responsabilità',
      testo:
        "Ogni parte risponde dei danni causati dal proprio trattamento secondo quanto previsto dall'art. 82 GDPR. Il Responsabile risponde solo se non ha rispettato gli obblighi del GDPR specificamente diretti al responsabile, o se ha agito in difformità o contrariamente alle istruzioni legittime del Titolare.",
    },
  ],
  note:
    'Questo documento è un template contrattuale. Ai fini della sua validità giuridica, si raccomanda la revisione da parte di un consulente legale qualificato prima della firma.',
}
