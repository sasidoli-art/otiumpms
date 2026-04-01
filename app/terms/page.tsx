import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termini di Servizio — Otium Week',
  description: 'Termini e condizioni di utilizzo della piattaforma Otium Week',
}

export default function TermsPage() {
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
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Termini di Servizio</h1>
        <p className="mb-10 text-sm text-gray-500">
          Ultimo aggiornamento: 31 marzo 2026
        </p>

        <div className="space-y-10 text-gray-700 leading-relaxed [&_h2]:mb-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-800 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ol]:mb-4 [&_ol]:ml-6 [&_ol]:list-decimal [&_ol]:space-y-1">

          {/* Art. 1 */}
          <section>
            <h2>1. Definizioni</h2>
            <p>Ai fini dei presenti Termini di Servizio, si intende per:</p>
            <ul>
              <li>
                <strong>Piattaforma</strong>: il software as a service (SaaS) &quot;Otium Week&quot;,
                accessibile tramite l&apos;indirizzo web della Piattaforma e le relative applicazioni,
                di proprietà e gestito da Otium Week (di seguito anche &quot;Fornitore&quot;).
              </li>
              <li>
                <strong>Host</strong>: il soggetto (persona fisica o giuridica) che sottoscrive un
                abbonamento alla Piattaforma per gestire una o più strutture ricettive, i relativi
                servizi, prenotazioni e rapporti con gli Ospiti.
              </li>
              <li>
                <strong>Ospite</strong>: la persona fisica che effettua una prenotazione presso una
                struttura gestita tramite la Piattaforma o che usufruisce dei servizi offerti
                (alloggio, SPA, ristorazione, eventi).
              </li>
              <li>
                <strong>Servizio</strong>: l&apos;insieme delle funzionalità offerte dalla Piattaforma,
                tra cui gestione prenotazioni, CRM, housekeeping, SPA, fatturazione elettronica,
                reportistica, comunicazioni con gli Ospiti e ogni altra funzione disponibile.
              </li>
              <li>
                <strong>Account</strong>: l&apos;insieme delle credenziali di accesso (email e password)
                e del profilo associato all&apos;utente registrato sulla Piattaforma.
              </li>
              <li>
                <strong>Contenuti</strong>: qualsiasi dato, testo, immagine, documento o informazione
                caricata o inserita nella Piattaforma dall&apos;Host o dall&apos;Ospite.
              </li>
            </ul>
          </section>

          {/* Art. 2 */}
          <section>
            <h2>2. Oggetto del Servizio</h2>
            <p>
              La Piattaforma fornisce agli Host un sistema gestionale completo per strutture
              ricettive, comprensivo di:
            </p>
            <ul>
              <li>Gestione delle prenotazioni, disponibilità e tariffe</li>
              <li>Anagrafica ospiti e CRM</li>
              <li>Gestione della SPA (appuntamenti, trattamenti, dichiarazioni cliniche, pagamenti)</li>
              <li>Housekeeping e manutenzione</li>
              <li>Fatturazione elettronica e reportistica finanziaria</li>
              <li>Comunicazione con gli ospiti (email, notifiche, AI Concierge)</li>
              <li>Adempimenti normativi (Alloggiati Web, schedine PS)</li>
              <li>Analisi e statistiche</li>
            </ul>
            <p>
              Il Servizio è erogato in modalità SaaS (Software as a Service) tramite accesso web.
              Il Fornitore si riserva il diritto di aggiungere, modificare o rimuovere funzionalità
              nel tempo, previa comunicazione agli Host.
            </p>
          </section>

          {/* Art. 3 */}
          <section>
            <h2>3. Registrazione e Account</h2>
            <h3>3.1 Requisiti</h3>
            <p>
              Per utilizzare la Piattaforma, l&apos;Host deve creare un Account fornendo informazioni
              veritiere, complete e aggiornate. La registrazione è riservata a soggetti maggiorenni
              e, nel caso di persone giuridiche, a soggetti dotati dei necessari poteri di
              rappresentanza.
            </p>

            <h3>3.2 Sicurezza dell&apos;Account</h3>
            <p>
              L&apos;Host è responsabile della custodia delle proprie credenziali di accesso e di
              qualsiasi attività svolta tramite il proprio Account. In caso di accesso non
              autorizzato o sospetto di violazione della sicurezza, l&apos;Host è tenuto a informare
              tempestivamente il Fornitore all&apos;indirizzo{' '}
              <a href="mailto:info@otiumweek.it" className="text-blue-600 hover:underline">
                info@otiumweek.it
              </a>.
            </p>

            <h3>3.3 Sospensione e chiusura</h3>
            <p>
              Il Fornitore si riserva il diritto di sospendere o chiudere un Account in caso di
              violazione dei presenti Termini, utilizzo fraudolento, mancato pagamento del canone
              di abbonamento o su richiesta dell&apos;autorità competente.
            </p>
          </section>

          {/* Art. 4 */}
          <section>
            <h2>4. Piani di abbonamento e pagamento</h2>
            <h3>4.1 Piani disponibili</h3>
            <p>
              La Piattaforma offre diversi piani di abbonamento, le cui caratteristiche, limiti
              e prezzi sono pubblicati sulla pagina dedicata del sito web e possono variare nel
              tempo. Il Fornitore comunicherà eventuali variazioni di prezzo con un preavviso di
              almeno 30 giorni.
            </p>

            <h3>4.2 Modalità di pagamento</h3>
            <p>
              Il pagamento del canone di abbonamento avviene con le modalità indicate al momento
              della sottoscrizione (carta di credito, bonifico bancario o altro metodo disponibile).
              L&apos;abbonamento si rinnova automaticamente alla scadenza del periodo contrattuale,
              salvo disdetta comunicata nei termini previsti.
            </p>

            <h3>4.3 Mancato pagamento</h3>
            <p>
              In caso di mancato pagamento, il Fornitore invierà un sollecito. Decorsi 15 giorni
              dal sollecito senza che il pagamento sia stato regolarizzato, il Fornitore potrà
              sospendere l&apos;accesso al Servizio. I dati dell&apos;Host saranno conservati per
              ulteriori 90 giorni, trascorsi i quali potranno essere cancellati.
            </p>

            <h3>4.4 Fatturazione</h3>
            <p>
              Per ogni pagamento verrà emessa regolare fattura elettronica tramite il Sistema di
              Interscambio (SDI), in conformità alla normativa fiscale italiana vigente.
            </p>
          </section>

          {/* Art. 5 */}
          <section>
            <h2>5. Obblighi dell&apos;Host</h2>
            <p>L&apos;Host si impegna a:</p>
            <ul>
              <li>
                Fornire dati veritieri, completi e aggiornati in fase di registrazione e durante
                l&apos;utilizzo della Piattaforma.
              </li>
              <li>
                Utilizzare la Piattaforma in conformità alla normativa vigente, incluse le
                disposizioni in materia di protezione dei dati personali (GDPR), normativa fiscale,
                normativa turistica e di pubblica sicurezza.
              </li>
              <li>
                Garantire la correttezza dei dati inseriti relativamente agli Ospiti, alle
                prenotazioni e ai pagamenti.
              </li>
              <li>
                Rispettare gli obblighi di legge relativi alla trasmissione dei dati degli
                alloggiati alla Questura e all&apos;emissione di documenti fiscali.
              </li>
              <li>
                Non utilizzare la Piattaforma per finalità illecite, fraudolente o in violazione
                dei diritti di terzi.
              </li>
              <li>
                Mantenere riservate le proprie credenziali di accesso e non cederle a terzi non
                autorizzati.
              </li>
              <li>
                Dotarsi, ove necessario, di propria informativa privacy nei confronti dei propri
                Ospiti, conformemente al ruolo di Titolare autonomo del trattamento dei dati
                raccolti nell&apos;ambito della propria attività ricettiva.
              </li>
            </ul>
          </section>

          {/* Art. 6 */}
          <section>
            <h2>6. Obblighi dell&apos;Ospite</h2>
            <p>L&apos;Ospite che utilizza le funzionalità pubbliche della Piattaforma si impegna a:</p>
            <ul>
              <li>
                Fornire dati personali veritieri e corretti durante la procedura di prenotazione
                e check-in.
              </li>
              <li>
                Compilare in modo accurato le dichiarazioni cliniche (waiver) richieste per i
                servizi SPA, consapevole che informazioni inesatte possono compromettere la
                propria sicurezza.
              </li>
              <li>
                Non utilizzare le funzionalità della Piattaforma per finalità illecite o in
                violazione della normativa vigente.
              </li>
              <li>
                Rispettare le regole della struttura ricettiva e le indicazioni dell&apos;Host.
              </li>
            </ul>
          </section>

          {/* Art. 7 */}
          <section>
            <h2>7. Proprietà intellettuale</h2>
            <p>
              La Piattaforma, il suo codice sorgente, il design, i loghi, i marchi, i testi e
              ogni altro elemento creativo sono di proprietà esclusiva del Fornitore o dei suoi
              licenzianti e sono protetti dalla normativa italiana e internazionale in materia di
              proprietà intellettuale e industriale.
            </p>
            <p>
              L&apos;Host e l&apos;Ospite non acquisiscono alcun diritto di proprietà intellettuale
              sulla Piattaforma. È concessa esclusivamente una licenza d&apos;uso limitata, non
              esclusiva, non trasferibile e revocabile, per la durata dell&apos;abbonamento e nei
              limiti delle funzionalità previste dal piano sottoscritto.
            </p>
            <p>
              I Contenuti caricati dall&apos;Host restano di proprietà dell&apos;Host. L&apos;Host
              concede al Fornitore una licenza limitata per trattare tali Contenuti nella misura
              necessaria all&apos;erogazione del Servizio.
            </p>
          </section>

          {/* Art. 8 */}
          <section>
            <h2>8. Limitazione di responsabilità</h2>
            <h3>8.1 Disponibilità del Servizio</h3>
            <p>
              Il Fornitore si impegna a garantire la continuità del Servizio, pur non potendo
              assicurare un&apos;operatività ininterrotta. Interventi di manutenzione programmata
              saranno comunicati con ragionevole anticipo. Il Fornitore non è responsabile per
              interruzioni dovute a cause di forza maggiore, guasti di fornitori terzi, attacchi
              informatici o eventi al di fuori del proprio ragionevole controllo.
            </p>

            <h3>8.2 Esclusioni di responsabilità</h3>
            <p>Il Fornitore non è responsabile per:</p>
            <ul>
              <li>
                Danni derivanti da un utilizzo improprio o non conforme della Piattaforma da
                parte dell&apos;Host o dell&apos;Ospite.
              </li>
              <li>
                La correttezza, completezza o veridicità dei dati inseriti dall&apos;Host o
                dall&apos;Ospite.
              </li>
              <li>
                Danni indiretti, incidentali, consequenziali o punitivi, inclusi mancati
                guadagni, perdita di dati o di avviamento.
              </li>
              <li>
                L&apos;inadempimento da parte dell&apos;Host degli obblighi normativi di
                propria competenza (es. trasmissione Alloggiati Web, emissione fatture).
              </li>
            </ul>

            <h3>8.3 Limite massimo</h3>
            <p>
              In ogni caso, la responsabilità complessiva del Fornitore nei confronti
              dell&apos;Host non potrà eccedere l&apos;importo totale dei canoni corrisposti
              dall&apos;Host nei 12 mesi precedenti l&apos;evento che ha dato origine alla
              responsabilità.
            </p>
          </section>

          {/* Art. 9 */}
          <section>
            <h2>9. Livello di servizio (SLA)</h2>
            <p>
              Il Fornitore si impegna a garantire un livello di disponibilità della Piattaforma
              pari al 99,5% su base mensile, calcolato escludendo i periodi di manutenzione
              programmata comunicati con almeno 24 ore di anticipo.
            </p>
            <p>
              In caso di disservizi significativi e prolungati (downtime superiore a 24 ore
              consecutive, esclusa la manutenzione programmata), l&apos;Host potrà richiedere un
              credito proporzionale al periodo di indisponibilità, da applicare al canone del
              mese successivo.
            </p>
          </section>

          {/* Art. 10 */}
          <section>
            <h2>10. Recesso e cancellazione</h2>
            <h3>10.1 Recesso dell&apos;Host</h3>
            <p>
              L&apos;Host può recedere dal contratto in qualsiasi momento, comunicando la disdetta
              tramite la Piattaforma o via email a{' '}
              <a href="mailto:info@otiumweek.it" className="text-blue-600 hover:underline">
                info@otiumweek.it
              </a>{' '}
              con un preavviso di almeno 30 giorni rispetto alla scadenza del periodo di
              abbonamento in corso. Non sono previsti rimborsi per il periodo già pagato.
            </p>

            <h3>10.2 Recesso del Fornitore</h3>
            <p>
              Il Fornitore può recedere dal contratto con un preavviso di almeno 60 giorni,
              comunicato via email all&apos;Host. In tal caso, il Fornitore rimborserà la quota
              del canone relativa al periodo non usufruito.
            </p>

            <h3>10.3 Effetti del recesso</h3>
            <p>
              A seguito del recesso, l&apos;Host avrà accesso alla Piattaforma in sola lettura
              per 30 giorni, durante i quali potrà esportare i propri dati. Decorso tale termine,
              l&apos;Account e i relativi dati saranno cancellati, fatto salvo quanto previsto
              dalla normativa in materia di conservazione dei dati.
            </p>
          </section>

          {/* Art. 11 */}
          <section>
            <h2>11. Protezione dei dati personali</h2>
            <p>
              Il trattamento dei dati personali è disciplinato dalla{' '}
              <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                Informativa sulla Privacy
              </Link>{' '}
              e dalla{' '}
              <Link href="/cookie-policy" className="text-blue-600 hover:underline">
                Cookie Policy
              </Link>
              , che costituiscono parte integrante dei presenti Termini.
            </p>
            <p>
              Con riferimento ai dati degli Ospiti trattati dall&apos;Host tramite la Piattaforma,
              l&apos;Host agisce in qualità di Titolare autonomo del trattamento ai sensi del
              GDPR, mentre il Fornitore agisce in qualità di Responsabile del trattamento ai
              sensi dell&apos;art. 28 GDPR, limitatamente alle operazioni di trattamento svolte
              per conto dell&apos;Host tramite la Piattaforma.
            </p>
          </section>

          {/* Art. 12 */}
          <section>
            <h2>12. Modifiche ai Termini</h2>
            <p>
              Il Fornitore si riserva il diritto di modificare i presenti Termini di Servizio
              in qualsiasi momento. Le modifiche saranno comunicate all&apos;Host via email e/o
              tramite avviso sulla Piattaforma con almeno 30 giorni di anticipo rispetto
              all&apos;entrata in vigore.
            </p>
            <p>
              L&apos;utilizzo continuato della Piattaforma dopo l&apos;entrata in vigore delle
              modifiche costituisce accettazione delle stesse. In caso di disaccordo,
              l&apos;Host ha facoltà di recedere dal contratto secondo le modalità di cui
              all&apos;articolo 10.
            </p>
          </section>

          {/* Art. 13 */}
          <section>
            <h2>13. Legge applicabile e foro competente</h2>
            <p>
              I presenti Termini di Servizio sono regolati dalla legge italiana. Per qualsiasi
              controversia derivante dall&apos;interpretazione, esecuzione o risoluzione dei
              presenti Termini sarà competente in via esclusiva il Foro del luogo di sede
              legale del Fornitore, salvo diversa disposizione inderogabile di legge a tutela
              del consumatore.
            </p>
            <p>
              Per le controversie con consumatori residenti nell&apos;Unione Europea, si applica
              il Regolamento (UE) n. 524/2013 relativo alla risoluzione delle controversie
              online. La piattaforma europea ODR è accessibile all&apos;indirizzo{' '}
              <a
                href="https://ec.europa.eu/consumers/odr"
                className="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                ec.europa.eu/consumers/odr
              </a>.
            </p>
          </section>

          {/* Art. 14 */}
          <section>
            <h2>14. Disposizioni generali</h2>
            <h3>14.1 Intero accordo</h3>
            <p>
              I presenti Termini, unitamente all&apos;Informativa sulla Privacy e alla Cookie
              Policy, costituiscono l&apos;intero accordo tra le parti relativamente
              all&apos;utilizzo della Piattaforma e sostituiscono qualsiasi accordo o intesa
              precedente.
            </p>

            <h3>14.2 Invalidità parziale</h3>
            <p>
              Qualora una o più disposizioni dei presenti Termini siano dichiarate invalide o
              inefficaci, le restanti disposizioni rimarranno valide ed efficaci nella misura
              massima consentita dalla legge.
            </p>

            <h3>14.3 Rinuncia</h3>
            <p>
              Il mancato esercizio da parte del Fornitore di un diritto previsto dai presenti
              Termini non costituisce rinuncia a tale diritto.
            </p>
          </section>

          {/* Art. 15 */}
          <section>
            <h2>15. Contatti</h2>
            <p>Per qualsiasi domanda relativa ai presenti Termini di Servizio:</p>
            <ul>
              <li>
                <strong>Email</strong>:{' '}
                <a href="mailto:info@otiumweek.it" className="text-blue-600 hover:underline">
                  info@otiumweek.it
                </a>
              </li>
              <li>
                <strong>Privacy</strong>:{' '}
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
