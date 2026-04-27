/**
 * Pagina pubblica /status — status page semplice stile statuspage.io.
 *
 * Legge `/api/health` ogni 30s e mostra il pallino verde/giallo/rosso per
 * ciascun servizio. Visitabile senza login (l'endpoint è pubblico).
 *
 * Server component: fetch iniziale lato server per evitare flash, poi un
 * piccolo client component sotto si occupa del refresh ogni 30s.
 */
import { healthCheck, type HealthReport } from '@/lib/health'
import StatusRefresh from './status-refresh'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function StatusPage() {
  const report = await healthCheck({ skipCache: true })
  return <StatusView initial={report} />
}

function statusBadge(status: HealthReport['status']) {
  if (status === 'ok') return { color: 'bg-green-500', label: 'Tutti i servizi operativi', tone: 'text-green-700' }
  if (status === 'degraded') return { color: 'bg-amber-500', label: 'Servizio degradato', tone: 'text-amber-700' }
  return { color: 'bg-red-500', label: 'Servizio non disponibile', tone: 'text-red-700' }
}

function serviceDot(s: 'ok' | 'warn' | 'error' | 'skipped') {
  if (s === 'ok') return 'bg-green-500'
  if (s === 'warn') return 'bg-amber-500'
  if (s === 'error') return 'bg-red-500'
  return 'bg-neutral-300'
}

function StatusView({ initial }: { initial: HealthReport }) {
  const badge = statusBadge(initial.status)
  return (
    <div className="min-h-screen bg-neutral-25 dark:bg-slate-950 px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-serif font-semibold text-neutral-900 dark:text-neutral-100">
            Otium System Status
          </h1>
          <p className="text-sm text-neutral-500">
            Stato in tempo reale dell&apos;infrastruttura della piattaforma
          </p>
        </header>

        <section className={`rounded-xl border border-neutral-150 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm`}>
          <div className="flex items-center gap-3">
            <span className={`inline-block h-3 w-3 rounded-full ${badge.color} animate-pulse`} />
            <h2 className={`text-lg font-medium ${badge.tone} dark:text-neutral-100`}>{badge.label}</h2>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Aggiornato: {new Date(initial.timestamp).toLocaleString('it-IT')}
            {initial.version.commit && (
              <> · build <code className="font-mono">{initial.version.commit}</code></>
            )}
            {' · '}env <code className="font-mono">{initial.version.env}</code>
          </p>
        </section>

        <section className="rounded-xl border border-neutral-150 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-neutral-150 dark:divide-slate-700">
          {Object.entries(initial.services).map(([name, svc]) => (
            <div key={name} className="flex items-start justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${serviceDot(svc.status)}`} />
                <div>
                  <p className="font-medium capitalize text-neutral-900 dark:text-neutral-100">{name}</p>
                  {svc.detail && <p className="text-xs text-neutral-500 mt-0.5">{svc.detail}</p>}
                  {svc.error && <p className="text-xs text-red-600 mt-0.5">{svc.error}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-neutral-400">{svc.status}</p>
                {svc.latencyMs !== undefined && (
                  <p className="text-xs text-neutral-500 mt-0.5">{svc.latencyMs}ms</p>
                )}
              </div>
            </div>
          ))}
        </section>

        <p className="text-center text-xs text-neutral-400">
          Per problemi non visibili qui, contatta <a href="mailto:support@otiumweek.com" className="underline hover:text-neutral-600">support@otiumweek.com</a>
        </p>

        <StatusRefresh />
      </div>
    </div>
  )
}
