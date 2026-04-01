'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, FileText, CreditCard, Waves } from 'lucide-react'
import { SignaturePad } from '@/components/spa/signature-pad'

interface Addebito {
  descrizione: string
  quantita: number
  prezzoUnitario: number
  totale: number
  data: string
}

interface Props {
  token: string
  tipo: 'checkin' | 'checkout' | 'spa_waiver'
  prenotazione: {
    id: string
    guestNome: string
    guestCognome: string
    guestEmail: string
    dataArrivo: string
    dataPartenza: string | null
    numOspiti: number
    prezzoTotale: number | null
    tassaSoggiorno: number | null
    regCardFirmata: boolean
    stato: string
    struttura: { nome: string; indirizzo: string | null; citta: string | null } | null
    unita: { nome: string } | null
    host: { nomeAzienda: string; regCardTerminiHtml: string | null; regCardPrivacyHtml: string | null } | null
    addebiti: Addebito[]
  }
}

const TIPO_CONFIG = {
  checkin: {
    icon: <FileText className="w-10 h-10 text-indigo-500" />,
    title: 'Registration Card',
    subtitle: 'Firma per completare il check-in',
    color: 'indigo',
    successMsg: 'Check-in completato!',
  },
  checkout: {
    icon: <CreditCard className="w-10 h-10 text-emerald-500" />,
    title: 'Conto di soggiorno',
    subtitle: 'Firma per presa visione del conto',
    color: 'emerald',
    successMsg: 'Conto firmato!',
  },
  spa_waiver: {
    icon: <Waves className="w-10 h-10 text-teal-500" />,
    title: 'Dichiarazione SPA',
    subtitle: 'Firma il consenso al trattamento',
    color: 'teal',
    successMsg: 'Consenso firmato!',
  },
}

export function KioskView({ token, tipo, prenotazione: p }: Props) {
  const config = TIPO_CONFIG[tipo]
  const [firma, setFirma] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [countdown, setCountdown] = useState(10)

  // Auto-reset dopo firma (torna a "pronto per il prossimo ospite")
  useEffect(() => {
    if (!done) return
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          // Reset
          setDone(false)
          setFirma(null)
          setCountdown(10)
          window.location.reload()
          return 10
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [done])

  async function handleSign() {
    if (!firma) return
    setLoading(true)

    const endpoint = tipo === 'checkin'
      ? `/api/checkin/${token}/registration-card`
      : `/api/kiosk/${token}/sign`

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo,
        firmaBase64: firma,
        accettazioneTermini: true,
        accettazionePrivacy: true,
      }),
    })

    setLoading(false)
    if (res.ok) setDone(true)
  }

  const totaleAddebiti = p.addebiti.reduce((s, a) => s + a.totale, 0)
  const totaleConto = (p.prezzoTotale ?? 0) + (p.tassaSoggiorno ?? 0) + totaleAddebiti

  // ═══ Schermata successo ═══
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{config.successMsg}</h1>
          <p className="text-lg text-gray-500 mb-2">
            Grazie, {p.guestNome}!
          </p>
          <p className="text-sm text-gray-400">
            Questa schermata si resetta tra {countdown} secondi
          </p>
          <div className="mt-6 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // ═══ Vista Kiosk ═══
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header con logo */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm">🏨</div>
          <div>
            <p className="font-bold text-sm">Otium Week</p>
            <p className="text-[10px] text-slate-400">{p.host?.nomeAzienda}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{p.guestNome} {p.guestCognome}</p>
          <p className="text-[10px] text-slate-400">{p.struttura?.nome}{p.unita ? ` · ${p.unita.nome}` : ''}</p>
        </div>
      </div>

      {/* Contenuto principale */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        {/* Titolo documento */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            {config.icon}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-gray-500 mt-1">{config.subtitle}</p>
        </div>

        {/* ═══ Contenuto per tipo ═══ */}

        {/* CHECKOUT: mostra il conto */}
        {tipo === 'checkout' && (
          <div className="space-y-4 mb-8">
            {/* Riepilogo soggiorno */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Arrivo</span>
                  <p className="font-medium">{new Date(p.dataArrivo).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p>
                </div>
                {p.dataPartenza && (
                  <div>
                    <span className="text-gray-500">Partenza</span>
                    <p className="font-medium">{new Date(p.dataPartenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dettaglio conto */}
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 text-gray-500 font-medium">Descrizione</th>
                    <th className="text-right px-4 py-2 text-gray-500 font-medium">Importo</th>
                  </tr>
                </thead>
                <tbody>
                  {p.prezzoTotale != null && p.prezzoTotale > 0 && (
                    <tr className="border-t">
                      <td className="px-4 py-2.5">Soggiorno</td>
                      <td className="px-4 py-2.5 text-right font-medium">€{p.prezzoTotale.toFixed(2)}</td>
                    </tr>
                  )}
                  {p.tassaSoggiorno != null && p.tassaSoggiorno > 0 && (
                    <tr className="border-t">
                      <td className="px-4 py-2.5 text-gray-500">Tassa di soggiorno</td>
                      <td className="px-4 py-2.5 text-right">€{p.tassaSoggiorno.toFixed(2)}</td>
                    </tr>
                  )}
                  {p.addebiti.map((a, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-2.5">
                        {a.descrizione}
                        {a.quantita > 1 && <span className="text-gray-400 text-xs"> ×{a.quantita}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">€{a.totale.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-gray-50">
                    <td className="px-4 py-3 font-bold text-base">TOTALE</td>
                    <td className="px-4 py-3 text-right font-bold text-base text-emerald-700">€{totaleConto.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Con la firma confermo di aver preso visione del conto sopra riportato.
            </p>
          </div>
        )}

        {/* CHECKIN: mostra T&C breve */}
        {tipo === 'checkin' && (
          <div className="space-y-4 mb-8">
            <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800">
              <p className="font-semibold mb-2">Termini e Condizioni</p>
              <p>Con la firma accetto i Termini e Condizioni del soggiorno e l'Informativa Privacy ai sensi del Reg. UE 2016/679 (GDPR).</p>
            </div>
          </div>
        )}

        {/* SPA WAIVER: messaggio breve */}
        {tipo === 'spa_waiver' && (
          <div className="space-y-4 mb-8">
            <div className="bg-teal-50 rounded-xl p-4 text-sm text-teal-800">
              <p className="font-semibold mb-2">Consenso al trattamento</p>
              <p>Dichiaro di aver comunicato tutte le condizioni mediche rilevanti e accetto le condizioni del servizio SPA.</p>
            </div>
          </div>
        )}

        {/* ═══ Area firma ═══ */}
        <div className="mb-6">
          <p className="text-center text-sm font-semibold text-gray-700 mb-3">
            ✍️ Firma qui sotto
          </p>
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-2">
            <SignaturePad onSave={(data) => setFirma(data)} />
          </div>
        </div>

        {/* Bottone conferma */}
        <button
          onClick={handleSign}
          disabled={!firma || loading}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl text-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Salvataggio...</>
          ) : (
            <><CheckCircle2 className="w-5 h-5" /> Conferma e firma</>
          )}
        </button>
      </div>
    </div>
  )
}
