import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CATALOGO_MODULI } from '@/lib/moduli'
import { PLAN_DEFINITIONS } from '@/lib/billing'
import PrintButton from './print-button'

export const metadata = { title: 'Guida Piattaforma — SuperAdmin' }

const CAT_LABEL: Record<string, string> = {
  base: 'Base',
  operativo: 'Operativo',
  avanzato: 'Avanzato',
  integrazioni: 'Integrazioni',
}
const CAT_COLOR: Record<string, string> = {
  base:         'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
  operativo:    'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
  avanzato:     'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
  integrazioni: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
}

const PIANI = ['LIGHT', 'EVENTO_SINGOLO', 'VISIBILITA_MENSILE', 'PARTNER_PREMIUM'] as const

const PIANO_COLOR: Record<string, string> = {
  LIGHT:             'bg-gray-100 text-gray-700',
  EVENTO_SINGOLO:    'bg-blue-100 text-blue-700',
  VISIBILITA_MENSILE:'bg-purple-100 text-purple-700',
  PARTNER_PREMIUM:   'bg-amber-100 text-amber-700',
}

const RUOLI = [
  {
    nome: 'SUPERADMIN',
    colore: 'bg-red-100 text-red-700',
    descrizione: 'Piattaforma completa. Gestisce host, piani, moduli, monitoraggio e configurazione globale.',
    accesso: '/superadmin/*',
  },
  {
    nome: 'HOST',
    colore: 'bg-brand-100 text-brand-700',
    descrizione: 'Gestore struttura/evento. Accede a tutto il proprio pannello in base ai moduli attivi.',
    accesso: '/host/*',
  },
  {
    nome: 'STAFF',
    colore: 'bg-green-100 text-green-700',
    descrizione: 'Operatore della struttura (7 ruoli: Manager, Receptionist, HK, SPA, Restaurant, Concierge, Readonly).',
    accesso: '/host/* (limitato per ruolo)',
  },
  {
    nome: 'OSPITE',
    colore: 'bg-gray-100 text-gray-700',
    descrizione: 'Accesso pubblico: booking, check-in self-service, chat, SPA, menu pasti, room directory QR.',
    accesso: '/book/* · /checkin/* · /room/* · /kiosk/*',
  },
]

const FLUSSI = [
  {
    titolo: 'Prenotazione standard',
    colore: 'border-blue-300',
    passi: [
      '/book/[strutturaId] — selezione date, camere, ospiti',
      'Pagamento acconto (Stripe Checkout opzionale)',
      'Email di conferma automatica con PIN accesso',
      '/host/prenotazioni/[id] — gestione interna, assegnazione camera',
      '/checkin/[id] — self check-in ospite (firma T&C, dati)',
      '/kiosk/[token] — firma digitale al tablet reception',
      'Check-out → fattura, rilascio camera, task HK auto',
    ],
  },
  {
    titolo: 'SPA & Waiver',
    colore: 'border-cyan-300',
    passi: [
      '/book/[strutturaId]/spa — selezione trattamento/percorso',
      'Scelta data + slot + terapista',
      'Waiver clinico: body map, allergie, patologie, firma',
      'Pagamento (camera credit / contanti / carta / transfer)',
      '/kiosk/spa/[cabinaId] — firma waiver da tablet cabina',
      '/host/spa — dashboard appuntamenti con stato waiver+pagamento',
      '/host/spa/report — revenue, utilizzo terapisti, occupancy',
    ],
  },
  {
    titolo: 'Check-in WiFi ospite',
    colore: 'border-green-300',
    passi: [
      'QR da /room/[unitaId]/qr — stampa o NFC tag in camera',
      '/room/[unitaId] — ospite inserisce PIN dalla email',
      'Accesso a: WiFi, SPA, ristorante, concierge AI, HK, manutenzione',
      '/wifi/[strutturaId] — captive portal se router Comfast configurato',
    ],
  },
  {
    titolo: 'Onboarding nuovo Host',
    colore: 'border-purple-300',
    passi: [
      '/superadmin/host → Nuovo Host (form white-glove)',
      'Sistema crea User + Host + invia email credenziali',
      '/host/onboarding — wizard 5 step (struttura, camere, tariffe, email, go-live)',
      'Attivazione moduli da /host/moduli o /superadmin/moduli',
      'Staff invite da /host/utenti → /registrazione/[token]',
    ],
  },
  {
    titolo: 'Fatturazione elettronica',
    colore: 'border-amber-300',
    passi: [
      'Dati fiscali host in /host/profilo (P.IVA, PEC, SDI, regime)',
      '/host/fatture — crea fattura da prenotazione o manuale',
      'Export XML FatturaPA (Art. 21 D.P.R. 633/72)',
      'Integrazione Fatture in Cloud o Aruba via API key',
    ],
  },
]

const ROUTES_HOST = [
  { path: '/host/dashboard',        desc: 'Panoramica: arrivi, check-out, occupancy, revenue' },
  { path: '/host/prenotazioni',     desc: 'Lista + dettaglio prenotazioni, nuova prenotazione manuale' },
  { path: '/host/strutture',        desc: 'Gestione strutture, unità, tariffe, stagioni' },
  { path: '/host/crm',              desc: 'Anagrafica ospiti, storico soggiorni, preferenze' },
  { path: '/host/oggi',             desc: 'Arrivi/partenze del giorno, stato camere' },
  { path: '/host/calendario',       desc: 'Vista calendario disponibilità' },
  { path: '/host/housekeeping',     desc: 'Task pulizie, stato camere, biancheria, turnover' },
  { path: '/host/manutenzione',     desc: 'Segnalazioni guasti, stato interventi' },
  { path: '/host/spa',              desc: 'Dashboard SPA: waiver, pagamenti, appuntamenti' },
  { path: '/host/spa/appuntamenti', desc: 'Board appuntamenti con filtri data/terapista' },
  { path: '/host/spa/calendario',   desc: 'Calendario disponibilità cabine' },
  { path: '/host/ristorazione',     desc: 'F&B: piani pasto, menu giornaliero, scelte ospiti' },
  { path: '/host/pos',              desc: 'Point of Sale: vendita trattamenti, prodotti, gift card' },
  { path: '/host/cassa',            desc: 'Chiusura cassa giornaliera, riconciliazione incassi' },
  { path: '/host/fatture',          desc: 'Fatturazione + export FatturaPA XML' },
  { path: '/host/staff',            desc: 'Bacheca comunicazioni interne' },
  { path: '/host/utenti',           desc: 'Gestione staff, invite, ruoli' },
  { path: '/host/concierge',        desc: 'AI Concierge: conversazioni WhatsApp, log AzioneConcierge' },
  { path: '/host/canali',           desc: 'Channel manager: iCal Booking.com / Airbnb / VRBO' },
  { path: '/host/moduli',           desc: 'Attivazione/disattivazione moduli' },
  { path: '/host/abbonamento',      desc: 'Stato abbonamento, upgrade/downgrade, Stripe portal' },
  { path: '/host/gdpr',             desc: 'Retention data, export, log consensi ospiti' },
  { path: '/host/audit',            desc: 'Log azioni utente (chi ha fatto cosa e quando)' },
]

export default async function GuidaPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  const perCategoria = {
    base:         CATALOGO_MODULI.filter(m => m.categoria === 'base'),
    operativo:    CATALOGO_MODULI.filter(m => m.categoria === 'operativo'),
    avanzato:     CATALOGO_MODULI.filter(m => m.categoria === 'avanzato'),
    integrazioni: CATALOGO_MODULI.filter(m => m.categoria === 'integrazioni'),
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Guida Piattaforma</h1>
          <p className="text-sm text-gray-500 mt-1">
            Mappa completa di funzionalità, moduli, flussi e ruoli — aggiornata automaticamente dallo schema.
          </p>
        </div>
        <PrintButton />
      </div>

      {/* ── 1. PANORAMICA ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Panoramica piattaforma</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: '27', label: 'Moduli attivabili' },
            { n: '4',  label: 'Piani abbonamento' },
            { n: '76', label: 'Modelli DB (Prisma)' },
            { n: '7',  label: 'Ruoli staff' },
          ].map(({ n, label }) => (
            <div key={label} className="card p-4 text-center">
              <p className="text-3xl font-bold text-brand-600">{n}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Stack tecnologico</p>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {['Next.js 16 App Router', 'React 18', 'TypeScript 5', 'Prisma 5', 'Neon PostgreSQL', 'NextAuth 4 JWT', 'Tailwind CSS', 'Zod', 'Stripe', 'Sentry', 'Vercel'].map(t => (
                <span key={t} className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-700 dark:text-slate-300">{t}</span>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Catene dati principali</p>
            <div className="space-y-1 text-xs font-mono text-gray-600 dark:text-slate-300">
              <p>Host → Struttura → UnitaPrenotabile → Prenotazione</p>
              <p>Struttura → AppuntamentoSpa → WaiverSpa + PagamentoSpa</p>
              <p>Struttura → ConfigPasto → MenuGiornaliero → SceltaPasto</p>
              <p>TransazionePOS → VocePOS · ChiusuraCassa → Incasso</p>
              <p>ProgrammaFedelta → LivelloFedelta → MembroFedelta → MovimentoPunti</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. RUOLI ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Ruoli & accessi</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RUOLI.map(r => (
            <div key={r.nome} className="card p-4 flex gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded h-fit shrink-0 ${r.colore}`}>{r.nome}</span>
              <div>
                <p className="text-sm text-gray-800 dark:text-slate-200">{r.descrizione}</p>
                <p className="text-xs text-gray-400 font-mono mt-1">{r.accesso}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. PIANI ──────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Piani & prezzi</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Piano</th>
                <th className="table-th text-right">€/mese</th>
                <th className="table-th text-right">Strutture</th>
                <th className="table-th text-right">Unità</th>
                <th className="table-th text-right">Eventi</th>
                <th className="table-th">Moduli inclusi</th>
              </tr>
            </thead>
            <tbody>
              {PIANI.map(p => {
                const def = PLAN_DEFINITIONS[p]
                return (
                  <tr key={p} className="border-b border-gray-50 dark:border-slate-800">
                    <td className="table-td">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${PIANO_COLOR[p]}`}>{def.label}</span>
                    </td>
                    <td className="table-td text-right font-semibold">{def.prezzoMensile}</td>
                    <td className="table-td text-right">{def.maxStrutture}</td>
                    <td className="table-td text-right">{def.maxUnita}</td>
                    <td className="table-td text-right">{def.maxEventi === -1 ? '∞' : def.maxEventi}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1">
                        {def.moduliInclusi.map(m => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 rounded text-gray-600 dark:text-slate-400">{m}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 4. MODULI ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Catalogo moduli ({CATALOGO_MODULI.length} totali)</h2>
        <div className="space-y-6">
          {(Object.keys(perCategoria) as Array<keyof typeof perCategoria>).map(cat => (
            <div key={cat}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 inline-block px-2 py-0.5 rounded border ${CAT_COLOR[cat]}`}>
                {CAT_LABEL[cat]}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {perCategoria[cat].map(m => {
                  const pianiIncluso = PIANI.filter(p => PLAN_DEFINITIONS[p].moduliInclusi.includes(m.id))
                  return (
                    <div key={m.id} className="card p-3 flex gap-3 items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{m.nome}</p>
                          <code className="text-[10px] text-gray-400 font-mono">{m.id}</code>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{m.descrizione}</p>
                        {pianiIncluso.length > 0 && (
                          <div className="flex gap-1 mt-1.5">
                            {pianiIncluso.map(p => (
                              <span key={p} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${PIANO_COLOR[p]}`}>
                                {PLAN_DEFINITIONS[p].label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 5. FLUSSI ─────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Flussi principali</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FLUSSI.map(f => (
            <div key={f.titolo} className={`card p-4 border-l-4 ${f.colore}`}>
              <p className="text-sm font-bold text-gray-900 dark:text-slate-100 mb-3">{f.titolo}</p>
              <ol className="space-y-1.5">
                {f.passi.map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-600 dark:text-slate-400">
                    <span className="shrink-0 w-4 h-4 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-500">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. ROUTE MAP HOST ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Pannello Host — mappa pagine</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Percorso</th>
                <th className="table-th">Funzione</th>
              </tr>
            </thead>
            <tbody>
              {ROUTES_HOST.map(r => (
                <tr key={r.path} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td font-mono text-xs text-brand-600">{r.path}</td>
                  <td className="table-td text-xs text-gray-600 dark:text-slate-400">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 7. ROUTE MAP SUPERADMIN ───────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Pannello SuperAdmin — mappa pagine</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                <th className="table-th">Percorso</th>
                <th className="table-th">Funzione</th>
              </tr>
            </thead>
            <tbody>
              {[
                { path: '/superadmin',                       desc: 'Dashboard: host totali, revenue, abbonamenti, strutture' },
                { path: '/superadmin/host',                  desc: 'Lista host: piano, stato, upselling, crea nuovo, sospendi/elimina' },
                { path: '/superadmin/host/[id]',             desc: 'Dettaglio host: dati azienda, strutture+unità+QR, moduli, concierge AI' },
                { path: '/superadmin/strutture',             desc: 'Tutte le strutture: filtra per tipo/stato/host, attiva/disattiva/elimina' },
                { path: '/superadmin/utenti',                desc: 'Tutti gli utenti della piattaforma' },
                { path: '/superadmin/abbonamenti',           desc: 'Gestione abbonamenti Stripe, scadenze, stato' },
                { path: '/superadmin/fatture',               desc: 'Fatture piattaforma cross-host' },
                { path: '/superadmin/moduli',                desc: 'Attiva/disattiva moduli per host specifico' },
                { path: '/superadmin/tickets',               desc: 'Ticket supporto' },
                { path: '/superadmin/analytics',             desc: 'Analytics piattaforma (prenotazioni, revenue, conversioni)' },
                { path: '/superadmin/monitoring',            desc: 'Health check DB, Sentry, encryption, uptime' },
                { path: '/superadmin/wifi',                  desc: 'Router Comfast: stato, comandi, provisioning' },
                { path: '/superadmin/audit',                 desc: 'Audit log cross-host' },
                { path: '/superadmin/compliance',            desc: 'GDPR: retention policy, dati da eliminare' },
                { path: '/superadmin/impostazioni/ai',       desc: 'Platform AI key (Anthropic/OpenRouter/Ollama)' },
                { path: '/superadmin/impostazioni/2fa',      desc: 'Attivazione 2FA TOTP per account superadmin' },
                { path: '/superadmin/settings/notifiche',    desc: 'Notifiche operative (Slack, email) per eventi piattaforma' },
                { path: '/superadmin/impostazioni',          desc: 'Impostazioni globali (SMTP piattaforma, ecc.)' },
                { path: '/superadmin/guida',                 desc: 'Questa pagina — mappa completa funzionalità' },
              ].map(r => (
                <tr key={r.path} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="table-td font-mono text-xs text-red-600 dark:text-red-400">{r.path}</td>
                  <td className="table-td text-xs text-gray-600 dark:text-slate-400">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 8. PERCORSI PUBBLICI ──────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title">Percorsi pubblici (ospiti)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { path: '/book/[strutturaId]',         desc: 'Booking engine pubblico: camere, date, ospiti, pagamento' },
            { path: '/book/[strutturaId]/spa',      desc: 'Prenotazione SPA: 5 step (servizio → data → waiver → pagamento → conferma)' },
            { path: '/book/[strutturaId]/pasti',    desc: 'Selezione piano pasto e menu per i giorni del soggiorno' },
            { path: '/book/chat/[id]',              desc: 'Chat ospite ↔ host via SSE (messaggi real-time)' },
            { path: '/checkin/[id]',                desc: 'Self check-in: dati ospite, firma T&C, documento' },
            { path: '/room/[unitaId]',              desc: 'Room directory: autenticazione PIN → accesso servizi camera' },
            { path: '/room/[unitaId]/qr',           desc: 'QR code stampabile + NFC tag URL per la camera' },
            { path: '/kiosk/[token]',               desc: 'Tablet reception: firma digitale al checkout' },
            { path: '/kiosk/spa/[cabinaId]',        desc: 'Tablet cabina SPA: firma waiver clinico prima del trattamento' },
            { path: '/wifi/[strutturaId]',          desc: 'Captive portal Wi-Fi: login con PIN prenotazione' },
            { path: '/privacy/[token]',             desc: 'Portale privacy ospite: export dati + revoca consensi GDPR' },
          ].map(r => (
            <div key={r.path} className="card p-3">
              <code className="text-xs text-green-700 dark:text-green-400 font-mono">{r.path}</code>
              <p className="text-xs text-gray-500 mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
