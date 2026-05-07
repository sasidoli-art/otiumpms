import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ArrowLeft, Shield, Check, Clock } from 'lucide-react'
import { DPA_TEMPLATE, DPA_VERSIONE } from '@/lib/dpa-template'

export const metadata = { title: 'DPA firmato — GDPR' }
export const dynamic = 'force-dynamic'

function formatDateTime(d: Date): string {
  return d.toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default async function DpaViewPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      nomeAzienda: true,
      dpaAccettato: true,
      dpaAccettazioni: { orderBy: { accettatoAt: 'desc' } },
    },
  })
  if (!host) redirect('/login')

  const accettazioni = host.dpaAccettazioni
  const ultima = accettazioni[0]
  const versioneOk = ultima?.versione === DPA_VERSIONE
  const titolare = DPA_TEMPLATE.parti.titolare.replace('{nomeAzienda}', host.nomeAzienda)

  return (
    <div className="space-y-6">
      <Link href="/host/gdpr" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> GDPR & Privacy
      </Link>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Shield className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">DPA — Accordo trattamento dati (Art. 28)</h1>
        </div>
        <p className="text-sm text-gray-500">{titolare}</p>
      </div>

      {/* Stato */}
      {ultima ? (
        <div className={`rounded-xl p-5 border ${versioneOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-3">
            {versioneOk ? (
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${versioneOk ? 'text-emerald-900' : 'text-amber-900'}`}>
                {versioneOk
                  ? 'DPA accettato e aggiornato'
                  : 'DPA aggiornato — richiesta nuova accettazione'}
              </p>
              <p className={`text-xs mt-1 ${versioneOk ? 'text-emerald-800' : 'text-amber-800'}`}>
                Versione accettata: <strong>{ultima.versione}</strong>
                {!versioneOk && ` · Versione corrente: ${DPA_VERSIONE}`}
              </p>
            </div>
            {!versioneOk && (
              <Link
                href="/host/dpa"
                className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700"
              >
                Accetta nuova versione
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5 border bg-red-50 border-red-200">
          <p className="text-sm font-semibold text-red-900">DPA non ancora firmato</p>
          <Link href="/host/dpa" className="inline-block mt-2 text-xs font-semibold text-red-700 underline">
            Firma ora →
          </Link>
        </div>
      )}

      {/* Firma corrente */}
      {ultima && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Firma corrente</h2>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Firmatario</dt>
              <dd className="font-medium text-gray-900">{ultima.firmaNome}{ultima.firmaRuolo ? ` — ${ultima.firmaRuolo}` : ''}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Data firma</dt>
              <dd className="font-medium text-gray-900">{formatDateTime(ultima.accettatoAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Versione</dt>
              <dd className="font-medium text-gray-900">{ultima.versione}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">IP</dt>
              <dd className="font-mono text-gray-700">{ultima.ip ?? '—'}</dd>
            </div>
          </dl>
          {ultima.firmaBase64 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <dt className="text-xs text-gray-500 mb-2">Firma digitale</dt>              <img src={ultima.firmaBase64} alt="Firma" className="max-h-32 bg-white border border-gray-200 rounded" />
            </div>
          )}
        </div>
      )}

      {/* Storico */}
      {accettazioni.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Storico accettazioni</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-2">Versione</th>
                <th className="px-4 py-2">Firmatario</th>
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accettazioni.slice(1).map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2 font-medium">{a.versione}</td>
                  <td className="px-4 py-2">{a.firmaNome}{a.firmaRuolo ? ` (${a.firmaRuolo})` : ''}</td>
                  <td className="px-4 py-2 text-gray-500">{formatDateTime(a.accettatoAt)}</td>
                  <td className="px-4 py-2 font-mono text-gray-500">{a.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
