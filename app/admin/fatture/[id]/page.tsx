import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { formatData, formatValuta, statoFatturaLabel, statoFatturaColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft, FileDown, Send } from 'lucide-react'
import { FatturaActions } from './fattura-actions'

export default async function FatturaDettaglioPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise
  const fattura = await prisma.fattura.findUnique({
    where: { id: params.id },
    include: {
      host: { include: { user: true } },
      pagamento: true,
    },
  })

  if (!fattura) notFound()

  const righe = fattura.righe as Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
    iva: number
    totale: number
  }>

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/fatture" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
            <ArrowLeft size={18} className="text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">Fattura {fattura.numero}</h1>
              <Badge className={statoFatturaColor(fattura.stato)}>{statoFatturaLabel(fattura.stato)}</Badge>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">Emessa il {formatData(fattura.dataEmissione)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/admin/fatture/${fattura.id}/pdf`}
            target="_blank"
            className="btn-secondary flex items-center gap-2"
          >
            <FileDown size={16} />
            Scarica PDF
          </a>
          <FatturaActions fatturaId={fattura.id} statoAttuale={fattura.stato} emailCliente={fattura.clienteEmail ?? fattura.host.user.email} />
        </div>
      </div>

      {/* Anteprima fattura */}
      <div className="card p-8">
        {/* Intestazione */}
        <div className="flex justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🎭</span>
              <div>
                <p className="font-bold text-xl text-gray-900">Otium Week</p>
                <p className="text-sm text-gray-500">Piattaforma eventi italiani</p>
              </div>
            </div>
            <div className="text-sm text-gray-600 space-y-0.5">
              <p>info@otiumweek.it</p>
              <p>www.otiumweek.it</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-800 font-mono mb-2">FATTURA</p>
            <p className="text-xl font-mono font-semibold text-brand-700">{fattura.numero}</p>
            <div className="mt-3 text-sm text-gray-500 space-y-0.5">
              <p>Data: <span className="font-medium text-gray-700">{formatData(fattura.dataEmissione)}</span></p>
              {fattura.dataScadenza && (
                <p>Scadenza: <span className="font-medium text-gray-700">{formatData(fattura.dataScadenza)}</span></p>
              )}
            </div>
          </div>
        </div>

        {/* Dati cliente */}
        <div className="bg-gray-50 rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fatturato a</p>
          <p className="font-bold text-gray-900">{fattura.clienteNome}</p>
          {fattura.clientePIva && <p className="text-sm text-gray-600">P.IVA: {fattura.clientePIva}</p>}
          {fattura.clienteIndirizzo && <p className="text-sm text-gray-600">{fattura.clienteIndirizzo}</p>}
          {(fattura.clienteCitta || fattura.clienteCap) && (
            <p className="text-sm text-gray-600">
              {fattura.clienteCap} {fattura.clienteCitta} ({fattura.clienteProvincia})
            </p>
          )}
          {fattura.clienteEmail && <p className="text-sm text-gray-600">{fattura.clienteEmail}</p>}
          {fattura.clientePec && <p className="text-sm text-gray-600">PEC: {fattura.clientePec}</p>}
          {fattura.clienteSDI && <p className="text-sm text-gray-600">SDI: {fattura.clienteSDI}</p>}
        </div>

        {/* Tabella righe */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-sm font-semibold text-gray-600">Descrizione</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600 w-20">Qtà</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600 w-28">Prezzo</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600 w-20">IVA</th>
              <th className="text-right py-2 text-sm font-semibold text-gray-600 w-28">Totale</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((riga, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 text-sm text-gray-700">{riga.descrizione}</td>
                <td className="py-3 text-sm text-right text-gray-600">{riga.quantita}</td>
                <td className="py-3 text-sm text-right text-gray-600">{formatValuta(riga.prezzoUnitario)}</td>
                <td className="py-3 text-sm text-right text-gray-600">{riga.iva}%</td>
                <td className="py-3 text-sm text-right font-medium">{formatValuta(riga.totale)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totali */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Imponibile</span>
              <span>{formatValuta(fattura.imponibile)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA ({fattura.aliquotaIva}%)</span>
              <span>{formatValuta(fattura.iva)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t-2 border-gray-900 pt-2">
              <span>Totale</span>
              <span>{formatValuta(fattura.totale)}</span>
            </div>
          </div>
        </div>

        {/* Note */}
        {fattura.note && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Note</p>
            <p className="text-sm text-gray-600">{fattura.note}</p>
          </div>
        )}
      </div>
    </div>
  )
}
