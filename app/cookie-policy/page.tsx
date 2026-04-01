import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy — Otium Week',
  description: 'Informativa sull\'utilizzo dei cookie sulla piattaforma Otium Week',
}

export default function CookiePolicyPage() {
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Cookie Policy</h1>
        <p className="mb-10 text-sm text-gray-500">
          Ultimo aggiornamento: 31 marzo 2026
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1">

          {/* Art. 1 */}
          <section>
            <h2>1. Cosa sono i cookie</h2>
            <p>
              I cookie sono piccoli file di testo che i siti web salvano sul dispositivo
              dell&apos;utente (computer, tablet, smartphone) durante la navigazione. Vengono
              utilizzati per memorizzare informazioni relative alla sessione, alle preferenze
              dell&apos;utente e al funzionamento del sito.
            </p>
            <p>
              La presente Cookie Policy si applica alla piattaforma <strong>Otium Week</strong>{' '}
              (di seguito &quot;Piattaforma&quot;) e deve essere letta congiuntamente
              all&apos;
              <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                Informativa sulla Privacy
              </Link>.
            </p>
          </section>

          {/* Art. 2 */}
          <section>
            <h2>2. Tipologie di cookie utilizzati</h2>

            <h3>2.1 Cookie strettamente necessari</h3>
            <p>
              Questi cookie sono indispensabili per il funzionamento della Piattaforma e non
              possono essere disabilitati. Non richiedono il consenso dell&apos;utente ai sensi
              dell&apos;art. 122, comma 1, del D.Lgs. 196/2003.
            </p>
            <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nome</th>
                    <th className="px-4 py-3 font-semibold">Scopo</th>
                    <th className="px-4 py-3 font-semibold">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">next-auth.session-token</td>
                    <td className="px-4 py-3">Autenticazione e gestione della sessione utente (NextAuth JWT)</td>
                    <td className="px-4 py-3">30 giorni</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">next-auth.csrf-token</td>
                    <td className="px-4 py-3">Protezione CSRF per le richieste di autenticazione</td>
                    <td className="px-4 py-3">Sessione</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">next-auth.callback-url</td>
                    <td className="px-4 py-3">Memorizzazione dell&apos;URL di redirect dopo il login</td>
                    <td className="px-4 py-3">Sessione</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>2.2 Cookie di preferenza (localStorage)</h3>
            <p>
              La Piattaforma utilizza il localStorage del browser per memorizzare le preferenze
              dell&apos;utente. Tecnicamente non si tratta di cookie, ma di meccanismi di
              archiviazione locale con funzione analoga.
            </p>
            <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Chiave</th>
                    <th className="px-4 py-3 font-semibold">Scopo</th>
                    <th className="px-4 py-3 font-semibold">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">cookie-consent</td>
                    <td className="px-4 py-3">Registrazione della scelta dell&apos;utente sui cookie (all / necessary / rejected)</td>
                    <td className="px-4 py-3">Persistente</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">cookie-consent-date</td>
                    <td className="px-4 py-3">Data e ora della scelta sui cookie</td>
                    <td className="px-4 py-3">Persistente</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">theme</td>
                    <td className="px-4 py-3">Preferenza tema chiaro/scuro</td>
                    <td className="px-4 py-3">Persistente</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">locale</td>
                    <td className="px-4 py-3">Preferenza lingua dell&apos;interfaccia</td>
                    <td className="px-4 py-3">Persistente</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>2.3 Cookie analitici e di monitoraggio</h3>
            <p>
              La Piattaforma utilizza Sentry per il monitoraggio degli errori e delle prestazioni.
              Sentry può impostare cookie o utilizzare tecnologie similari per raccogliere
              informazioni tecniche in forma aggregata, al fine di identificare e risolvere
              problemi tecnici.
            </p>
            <div className="mb-6 overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Fornitore</th>
                    <th className="px-4 py-3 font-semibold">Scopo</th>
                    <th className="px-4 py-3 font-semibold">Durata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3">Sentry</td>
                    <td className="px-4 py-3">Monitoraggio errori, tracciamento prestazioni, diagnostica</td>
                    <td className="px-4 py-3">Sessione / 1 anno</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              I cookie analitici vengono installati solo previo consenso dell&apos;utente, espresso
              tramite il banner cookie presente sulla Piattaforma.
            </p>
          </section>

          {/* Art. 3 */}
          <section>
            <h2>3. Base giuridica</h2>
            <ul>
              <li>
                <strong>Cookie necessari</strong>: non richiedono consenso in quanto indispensabili
                per l&apos;erogazione del servizio richiesto dall&apos;utente (art. 122, comma 1,
                D.Lgs. 196/2003; Linee guida del Garante Privacy del 10 giugno 2021).
              </li>
              <li>
                <strong>Cookie analitici</strong>: richiedono il consenso dell&apos;utente (art. 122,
                comma 1, D.Lgs. 196/2003), acquisito tramite il banner cookie.
              </li>
              <li>
                <strong>LocalStorage di preferenza</strong>: classificati come strettamente necessari
                al funzionamento e alla personalizzazione dell&apos;interfaccia.
              </li>
            </ul>
          </section>

          {/* Art. 4 */}
          <section>
            <h2>4. Come gestire i cookie</h2>

            <h3>4.1 Tramite il banner cookie</h3>
            <p>
              Al primo accesso alla Piattaforma, un banner consente di scegliere tra:
            </p>
            <ul>
              <li><strong>Accetta tutti</strong>: attiva tutti i cookie, inclusi quelli analitici.</li>
              <li><strong>Solo necessari</strong>: attiva esclusivamente i cookie indispensabili.</li>
              <li><strong>Rifiuta tutti</strong>: disattiva tutti i cookie non strettamente necessari.</li>
            </ul>
            <p>
              Per modificare la scelta effettuata, è possibile cancellare il valore
              &quot;cookie-consent&quot; dal localStorage del browser (tramite gli strumenti per
              sviluppatori) e ricaricare la pagina: il banner verrà nuovamente visualizzato.
            </p>

            <h3>4.2 Tramite le impostazioni del browser</h3>
            <p>
              È possibile gestire i cookie anche attraverso le impostazioni del browser. Di
              seguito i link alle guide dei principali browser:
            </p>
            <ul>
              <li>
                <a href="https://support.google.com/chrome/answer/95647" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox-desktop" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Apple Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  Microsoft Edge
                </a>
              </li>
            </ul>
            <p>
              La disabilitazione dei cookie necessari potrebbe compromettere il funzionamento
              della Piattaforma, in particolare le funzionalità di autenticazione.
            </p>
          </section>

          {/* Art. 5 */}
          <section>
            <h2>5. Cookie di terze parti</h2>
            <p>
              La Piattaforma non utilizza cookie di profilazione di terze parti a scopi
              pubblicitari. I cookie di terze parti eventualmente presenti sono limitati al
              servizio Sentry per il monitoraggio degli errori, come descritto al punto 2.3.
            </p>
            <p>
              Per informazioni sulle politiche privacy di Sentry:{' '}
              <a href="https://sentry.io/privacy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                sentry.io/privacy
              </a>.
            </p>
          </section>

          {/* Art. 6 */}
          <section>
            <h2>6. Aggiornamenti alla Cookie Policy</h2>
            <p>
              La presente Cookie Policy può essere aggiornata periodicamente per riflettere
              modifiche nelle tecnologie utilizzate o nella normativa applicabile. La versione
              aggiornata sarà sempre disponibile a questa pagina, con indicazione della data
              di ultimo aggiornamento.
            </p>
          </section>

          {/* Art. 7 */}
          <section>
            <h2>7. Contatti</h2>
            <p>
              Per domande relative ai cookie e alla presente policy, contattare:
            </p>
            <ul>
              <li>
                <strong>Email</strong>:{' '}
                <a href="mailto:privacy@otiumweek.it" className="text-blue-600 hover:underline">
                  privacy@otiumweek.it
                </a>
              </li>
            </ul>
          </section>

          {/* Links */}
          <section className="mt-12 border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500">
              Consulta anche:{' '}
              <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                Informativa sulla Privacy
              </Link>
              {' '}&middot;{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Termini di Servizio
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
