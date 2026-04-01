import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Otium Week',
  description: 'Informativa sulla privacy e protezione dei dati personali di Otium Week',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <span className="text-sm font-bold text-white">OW</span>
              </div>
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                Otium Week
              </span>
            </Link>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
              Torna alla home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Informativa sulla Privacy</h1>
        <p className="mb-10 text-sm text-gray-500">
          Ultimo aggiornamento: 31 marzo 2026
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1">

          {/* Art. 1 */}
          <section>
            <h2>1. Titolare del trattamento</h2>
            <p>
              Il Titolare del trattamento dei dati personali è <strong>Otium Week</strong> (di seguito
              &quot;Titolare&quot; o &quot;Piattaforma&quot;), con sede legale in Italia, raggiungibile
              all&apos;indirizzo email{' '}
              <a href="mailto:privacy@otiumweek.it" className="text-blue-600 hover:underline">
                privacy@otiumweek.it
              </a>.
            </p>
            <p>
              La presente Informativa è resa ai sensi degli articoli 13 e 14 del Regolamento (UE)
              2016/679 (di seguito &quot;GDPR&quot;) e della normativa italiana in materia di protezione
              dei dati personali (D.Lgs. 196/2003, come modificato dal D.Lgs. 101/2018).
            </p>
          </section>

          {/* Art. 2 */}
          <section>
            <h2>2. Categorie di dati raccolti</h2>
            <p>
              Nell&apos;ambito dell&apos;erogazione del Servizio, Otium Week raccoglie e tratta le seguenti
              categorie di dati personali:
            </p>

            <h3>2.1 Dati di registrazione e account</h3>
            <p>
              Nome, cognome, indirizzo email, password (conservata in forma cifrata tramite hashing
              bcrypt), ruolo (Host o Amministratore), dati di fatturazione (ragione sociale, partita IVA,
              codice fiscale, indirizzo, codice SDI, PEC).
            </p>

            <h3>2.2 Dati relativi alle prenotazioni</h3>
            <p>
              Dati degli ospiti (nome, cognome, data e luogo di nascita, cittadinanza, tipo e numero
              documento d&apos;identità, codice ISTAT del comune di nascita), date di soggiorno, preferenze
              relative ai servizi (biancheria, pasti), eventuali note.
            </p>

            <h3>2.3 Dati relativi ai pagamenti</h3>
            <p>
              Importi, metodi di pagamento selezionati (addebito in camera, contanti, carta, bonifico),
              ultime 4 cifre della carta (ove fornite dall&apos;utente), stato dei pagamenti. Otium Week
              non conserva dati completi di carte di credito.
            </p>

            <h3>2.4 Dati SPA e benessere</h3>
            <p>
              Dichiarazioni cliniche (waiver): stato di gravidanza, allergie, patologie, farmaci in uso,
              zone del corpo da trattare o evitare, firma digitale. Questi dati sono classificati come
              dati relativi alla salute ai sensi dell&apos;art. 9 GDPR e vengono trattati previo consenso
              esplicito dell&apos;interessato.
            </p>

            <h3>2.5 Dati di navigazione e tecnici</h3>
            <p>
              Indirizzo IP, tipo di browser, sistema operativo, pagine visitate, durata della sessione,
              dati di log del server. Questi dati sono raccolti automaticamente tramite i sistemi
              informatici preposti al funzionamento della Piattaforma.
            </p>

            <h3>2.6 Dati di comunicazione</h3>
            <p>
              Messaggi scambiati tramite la funzione di chat integrata, notifiche, comunicazioni email
              relative alle prenotazioni e ai promemoria.
            </p>
          </section>

          {/* Art. 3 */}
          <section>
            <h2>3. Finalità e base giuridica del trattamento</h2>
            <p>I dati personali sono trattati per le seguenti finalità:</p>
            <ul>
              <li>
                <strong>Esecuzione del contratto</strong> (art. 6, par. 1, lett. b GDPR): gestione
                dell&apos;account, erogazione del servizio di gestione prenotazioni, elaborazione dei
                pagamenti, comunicazioni operative, generazione di fatture e ricevute.
              </li>
              <li>
                <strong>Obbligo legale</strong> (art. 6, par. 1, lett. c GDPR): adempimento agli obblighi
                normativi in materia di pubblica sicurezza (trasmissione dati al portale Alloggiati Web
                della Questura), conservazione della documentazione fiscale e contabile.
              </li>
              <li>
                <strong>Consenso</strong> (art. 6, par. 1, lett. a, e art. 9, par. 2, lett. a GDPR):
                trattamento dei dati sanitari contenuti nelle dichiarazioni cliniche SPA (waiver),
                invio di comunicazioni promozionali (ove applicabile), consenso alla fotografia.
              </li>
              <li>
                <strong>Legittimo interesse</strong> (art. 6, par. 1, lett. f GDPR): miglioramento della
                Piattaforma, analisi statistiche aggregate, prevenzione di frodi e abusi, sicurezza
                informatica.
              </li>
            </ul>
          </section>

          {/* Art. 4 */}
          <section>
            <h2>4. Cookie e tecnologie di tracciamento</h2>
            <p>La Piattaforma utilizza le seguenti tipologie di cookie:</p>
            <ul>
              <li>
                <strong>Cookie necessari</strong>: cookie di sessione di NextAuth per l&apos;autenticazione
                e la gestione della sessione utente. Questi cookie sono indispensabili per il
                funzionamento della Piattaforma e non richiedono il consenso.
              </li>
              <li>
                <strong>Cookie analitici</strong>: utilizzati per il monitoraggio degli errori tramite
                Sentry, al fine di garantire la stabilità e la qualità del servizio. Questi cookie
                raccolgono dati in forma aggregata.
              </li>
              <li>
                <strong>Cookie di preferenza</strong>: memorizzazione delle preferenze utente (lingua,
                tema, consenso cookie). Conservati nel localStorage del browser.
              </li>
            </ul>
            <p>
              Per informazioni dettagliate sui cookie utilizzati, si rimanda alla nostra{' '}
              <Link href="/cookie-policy" className="text-blue-600 hover:underline">
                Cookie Policy
              </Link>.
            </p>
          </section>

          {/* Art. 5 */}
          <section>
            <h2>5. Destinatari e trasferimenti di dati</h2>
            <p>I dati personali possono essere comunicati alle seguenti categorie di destinatari:</p>
            <ul>
              <li>
                <strong>Fornitori di servizi infrastrutturali</strong>: Vercel Inc. (hosting e CDN,
                server nell&apos;Unione Europea), Neon Inc. (database PostgreSQL, server nell&apos;Unione
                Europea), Sentry (monitoraggio errori, server nell&apos;Unione Europea).
              </li>
              <li>
                <strong>Fornitori di servizi di comunicazione</strong>: servizi di posta elettronica
                per l&apos;invio di conferme, promemoria e notifiche transazionali.
              </li>
              <li>
                <strong>Autorità pubbliche</strong>: Questura (tramite il portale Alloggiati Web),
                Agenzia delle Entrate (fatturazione elettronica), ove richiesto dalla legge.
              </li>
              <li>
                <strong>Host</strong>: le strutture ricettive (Host) accedono ai dati degli ospiti
                relativi alle proprie prenotazioni nell&apos;ambito dell&apos;esecuzione del contratto.
              </li>
            </ul>
            <p>
              I dati sono trattati prevalentemente su server ubicati nell&apos;Unione Europea. Qualora
              sia necessario un trasferimento verso Paesi terzi, questo avverrà nel rispetto delle
              garanzie previste dal Capo V del GDPR (decisioni di adeguatezza, clausole contrattuali
              tipo della Commissione Europea, o altri meccanismi di garanzia appropriati).
            </p>
          </section>

          {/* Art. 6 */}
          <section>
            <h2>6. Conservazione dei dati</h2>
            <p>I dati personali sono conservati per il tempo strettamente necessario al perseguimento delle finalità per cui sono stati raccolti:</p>
            <ul>
              <li>
                <strong>Dati di account</strong>: per tutta la durata del rapporto contrattuale e per
                i successivi 10 anni, in conformità agli obblighi di legge in materia fiscale e contabile.
              </li>
              <li>
                <strong>Dati delle prenotazioni</strong>: per la durata del soggiorno e per i successivi
                10 anni (obblighi fiscali) o 5 anni (obblighi di pubblica sicurezza), a seconda della
                normativa applicabile.
              </li>
              <li>
                <strong>Dati sanitari (waiver SPA)</strong>: per la durata dell&apos;appuntamento e per
                un periodo massimo di 24 mesi successivi, salvo diversa indicazione normativa.
              </li>
              <li>
                <strong>Dati di navigazione</strong>: per un periodo massimo di 12 mesi dalla raccolta.
              </li>
              <li>
                <strong>Dati di fatturazione</strong>: per 10 anni dalla data di emissione, in conformità
                alla normativa fiscale italiana.
              </li>
            </ul>
            <p>
              Decorsi i termini di conservazione, i dati personali saranno cancellati o resi anonimi
              in modo irreversibile.
            </p>
          </section>

          {/* Art. 7 */}
          <section>
            <h2>7. Diritti dell&apos;interessato</h2>
            <p>
              Ai sensi degli articoli da 15 a 22 del GDPR, l&apos;interessato ha il diritto di:
            </p>
            <ul>
              <li>
                <strong>Accesso</strong> (art. 15): ottenere conferma dell&apos;esistenza di un trattamento
                dei propri dati e accedere alle informazioni relative.
              </li>
              <li>
                <strong>Rettifica</strong> (art. 16): ottenere la correzione di dati inesatti o
                l&apos;integrazione di dati incompleti.
              </li>
              <li>
                <strong>Cancellazione</strong> (art. 17): ottenere la cancellazione dei propri dati,
                nei limiti previsti dalla legge.
              </li>
              <li>
                <strong>Limitazione del trattamento</strong> (art. 18): ottenere la limitazione del
                trattamento nei casi previsti dalla normativa.
              </li>
              <li>
                <strong>Portabilità</strong> (art. 20): ricevere i propri dati in un formato strutturato,
                di uso comune e leggibile da dispositivo automatico.
              </li>
              <li>
                <strong>Opposizione</strong> (art. 21): opporsi al trattamento dei dati fondato sul
                legittimo interesse del Titolare.
              </li>
              <li>
                <strong>Revoca del consenso</strong> (art. 7): revocare in qualsiasi momento il consenso
                precedentemente prestato, senza pregiudicare la liceità del trattamento basato sul
                consenso prestato prima della revoca.
              </li>
            </ul>
          </section>

          {/* Art. 8 */}
          <section>
            <h2>8. Come esercitare i diritti</h2>
            <p>
              L&apos;interessato può esercitare i propri diritti inviando una richiesta scritta a:
            </p>
            <ul>
              <li>
                <strong>Email</strong>:{' '}
                <a href="mailto:privacy@otiumweek.it" className="text-blue-600 hover:underline">
                  privacy@otiumweek.it
                </a>
              </li>
            </ul>
            <p>
              Il Titolare fornirà riscontro entro 30 giorni dalla ricezione della richiesta, salvo
              proroga di ulteriori 60 giorni in caso di complessità o numerosità delle richieste, nel
              qual caso l&apos;interessato sarà informato entro il primo mese.
            </p>
            <p>
              L&apos;interessato ha inoltre il diritto di proporre reclamo all&apos;autorità di controllo
              competente, ovvero il <strong>Garante per la protezione dei dati personali</strong>
              {' '}(
              <a href="https://www.garanteprivacy.it" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                www.garanteprivacy.it
              </a>
              ).
            </p>
          </section>

          {/* Art. 9 */}
          <section>
            <h2>9. Misure di sicurezza</h2>
            <p>
              Il Titolare adotta misure tecniche e organizzative adeguate a garantire un livello di
              sicurezza appropriato al rischio, tra cui:
            </p>
            <ul>
              <li>Cifratura delle comunicazioni tramite protocollo HTTPS/TLS</li>
              <li>Hashing delle password con algoritmo bcrypt</li>
              <li>Autenticazione basata su token JWT con scadenza</li>
              <li>Isolamento multi-tenant dei dati (ogni Host accede esclusivamente ai propri dati)</li>
              <li>Controllo degli accessi basato su ruoli (RBAC)</li>
              <li>Backup periodici del database</li>
              <li>Monitoraggio continuo degli errori e delle anomalie</li>
            </ul>
          </section>

          {/* Art. 10 */}
          <section>
            <h2>10. Modifiche alla presente Informativa</h2>
            <p>
              Il Titolare si riserva il diritto di modificare la presente Informativa in qualsiasi
              momento, dandone comunicazione agli utenti registrati tramite email o avviso sulla
              Piattaforma. La versione aggiornata sarà sempre disponibile a questa pagina con
              indicazione della data di ultimo aggiornamento.
            </p>
            <p>
              L&apos;utilizzo continuato della Piattaforma successivamente alla pubblicazione delle
              modifiche costituisce accettazione delle stesse.
            </p>
          </section>

          {/* Links */}
          <section className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500">
              Consulta anche:{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Termini di Servizio
              </Link>
              {' '}&middot;{' '}
              <Link href="/cookie-policy" className="text-blue-600 hover:underline">
                Cookie Policy
              </Link>
            </p>
          </section>
        </div>

        {/* Back to home */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
            &larr; Torna alla home
          </Link>
        </div>
      </main>
    </div>
  )
}
