import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import {
  formatData,
  formatValuta,
  pianoLabel,
  statoAbbonamentoLabel,
  statoAbbonamentoColor,
  statoEventoLabel,
  statoEventoColor,
  statoPagamentoLabel,
  statoPagamentoColor,
  statoFatturaLabel,
  statoFatturaColor,
  categoriaEventoLabel,
} from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Mail, Globe, Phone, MapPin, FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { ClienteActions } from './client-actions'
import { AdminCanaliForm } from './canali-form'

export default async function ClienteDettaglioPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const host = await prisma.host.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      eventi: { orderBy: { createdAt: 'desc' }, take: 10 },
      pagamenti: { orderBy: { createdAt: 'desc' }, take: 10 },
      fatture: { orderBy: { createdAt: 'desc' }, take: 10 },
      abbonamenti: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!host) notFound()

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/admin/clienti" className="p-2 rounded-lg hover:bg-gray-200 transition-colors mt-1">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xl">
              {host.nomeAzienda.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{host.nomeAzienda}</h1>
              <p className="text-gray-500 text-sm">
                {host.user.nome} {host.user.cognome} · {host.user.email}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
            {statoAbbonamentoLabel(host.statoAbbonamento)}
          </Badge>
          <Badge className="bg-brand-100 text-brand-700">{pianoLabel(host.piano)}</Badge>
          <ClienteActions hostId={host.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Colonna sinistra - Info */}
        <div className="space-y-5">
          {/* Anagrafica */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Anagrafica</h2>
            <div className="space-y-3 text-sm">
              {host.partitaIva && (
                <div className="flex justify-between">
                  <span className="text-gray-500">P.IVA</span>
                  <span className="font-medium">{host.partitaIva}</span>
                </div>
              )}
              {host.codiceFiscale && (
                <div className="flex justify-between">
                  <span className="text-gray-500">C.F.</span>
                  <span className="font-medium">{host.codiceFiscale}</span>
                </div>
              )}
              {host.telefono && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} />
                  <span>{host.telefono}</span>
                </div>
              )}
              {host.sitoWeb && (
                <div className="flex items-center gap-2">
                  <Globe size={14} className="text-gray-400" />
                  <a href={host.sitoWeb} target="_blank" className="text-brand-600 hover:underline truncate">
                    {host.sitoWeb}
                  </a>
                </div>
              )}
              {host.indirizzo && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin size={14} className="mt-0.5 shrink-0" />
                  <span>
                    {host.indirizzo}, {host.citta} ({host.provincia}) {host.cap}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={14} className="text-gray-400" />
                <a href={`mailto:${host.user.email}`} className="text-brand-600 hover:underline">
                  {host.user.email}
                </a>
              </div>
            </div>
          </div>

          {/* Abbonamento */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Abbonamento</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Piano</span>
                <span className="font-medium">{pianoLabel(host.piano)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stato</span>
                <Badge className={statoAbbonamentoColor(host.statoAbbonamento)}>
                  {statoAbbonamentoLabel(host.statoAbbonamento)}
                </Badge>
              </div>
              {host.dataInizioAbb && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Inizio</span>
                  <span>{formatData(host.dataInizioAbb)}</span>
                </div>
              )}
              {host.dataFineAbb && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Scadenza</span>
                  <span>{formatData(host.dataFineAbb)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Cliente dal</span>
                <span>{formatData(host.createdAt)}</span>
              </div>
            </div>
            <Link
              href={`/admin/clienti/${host.id}/modifica`}
              className="btn-secondary w-full text-center mt-4 block"
            >
              Modifica dati
            </Link>
          </div>

          {host.note && (
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 mb-2">Note</h2>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{host.note}</p>
            </div>
          )}
        </div>

        {/* Colonna destra - Tabelle */}
        <div className="xl:col-span-2 space-y-6">
          {/* Pulsanti azioni rapide */}
          <div className="flex gap-3 flex-wrap">
            <Link href={`/admin/pagamenti/nuovo?hostId=${host.id}`} className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              Nuovo pagamento
            </Link>
            <Link href={`/admin/fatture/nuovo?hostId=${host.id}`} className="btn-secondary flex items-center gap-2">
              <FileText size={15} />
              Nuova fattura
            </Link>
          </div>

          {/* Fatture */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Fatture ({host.fatture.length})</h3>
              <Link href={`/admin/fatture?hostId=${host.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Vedi tutte →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-th">Numero</th>
                    <th className="table-th">Data</th>
                    <th className="table-th">Importo</th>
                    <th className="table-th">Stato</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {host.fatture.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">Nessuna fattura</td></tr>
                  ) : host.fatture.map(f => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="table-td font-mono text-sm">{f.numero}</td>
                      <td className="table-td text-gray-500">{formatData(f.dataEmissione)}</td>
                      <td className="table-td font-medium">{formatValuta(f.totale)}</td>
                      <td className="table-td"><Badge className={statoFatturaColor(f.stato)}>{statoFatturaLabel(f.stato)}</Badge></td>
                      <td className="table-td"><Link href={`/admin/fatture/${f.id}`} className="text-brand-600 text-sm hover:underline">Apri</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagamenti */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Pagamenti ({host.pagamenti.length})</h3>
              <Link href={`/admin/pagamenti?hostId=${host.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">Vedi tutti →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-th">Descrizione</th>
                    <th className="table-th">Importo</th>
                    <th className="table-th">Scadenza</th>
                    <th className="table-th">Stato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {host.pagamenti.length === 0 ? (
                    <tr><td colSpan={4} className="px-5 py-6 text-center text-sm text-gray-400">Nessun pagamento</td></tr>
                  ) : host.pagamenti.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="table-td">{p.descrizione || p.metodo || '—'}</td>
                      <td className="table-td font-medium">{formatValuta(p.importo)}</td>
                      <td className="table-td text-gray-500">{formatData(p.dataScadenza)}</td>
                      <td className="table-td"><Badge className={statoPagamentoColor(p.stato)}>{statoPagamentoLabel(p.stato)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Eventi */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Eventi ({host.eventi.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-th">Titolo</th>
                    <th className="table-th">Categoria</th>
                    <th className="table-th">Data</th>
                    <th className="table-th">Stato</th>
                    <th className="table-th">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {host.eventi.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-6 text-center text-sm text-gray-400">Nessun evento</td></tr>
                  ) : host.eventi.map(ev => (
                    <tr key={ev.id} className="hover:bg-gray-50">
                      <td className="table-td">
                        <Link href={`/admin/eventi/${ev.id}`} className="font-medium text-gray-900 hover:text-brand-600">{ev.titolo}</Link>
                      </td>
                      <td className="table-td text-sm text-gray-500">{categoriaEventoLabel(ev.categoria)}</td>
                      <td className="table-td text-gray-500">{formatData(ev.dataInizio)}</td>
                      <td className="table-td"><Badge className={statoEventoColor(ev.stato)}>{statoEventoLabel(ev.stato)}</Badge></td>
                      <td className="table-td font-medium">{ev.visualizzazioni}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Canali di comunicazione — SOLO ADMIN */}
      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900">Canali di comunicazione</h2>
          <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2.5 py-0.5 rounded-full">
            Solo admin
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Configura le credenziali SMTP di questo host. Le email verso gli ospiti verranno inviate
          dal suo indirizzo aziendale. Se lasciato vuoto, usa il server globale della piattaforma.
        </p>
        <AdminCanaliForm
          hostId={host.id}
          initialData={{
            smtpHost: host.smtpHost,
            smtpPort: host.smtpPort,
            smtpUser: host.smtpUser,
            smtpPass: host.smtpPass,
            emailMittente: host.emailMittente,
          }}
        />
      </div>
    </div>
  )
}
