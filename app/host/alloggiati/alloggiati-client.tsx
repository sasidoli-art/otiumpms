'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useTranslations } from 'next-intl'
import { it } from 'date-fns/locale'
import {
  Download, AlertTriangle, CheckCircle2, Shield, Building2,
  ChevronDown, FileText, Loader2, ExternalLink, XCircle,
} from 'lucide-react'

type Struttura = {
  id: string
  nome: string
  citta: string | null
  alloggiatiAbilitato: boolean
  alloggiatiCodiceStruttura: string | null
  alloggiatiComuneIstat: string | null
  alloggiatiDenominazioneComune: string | null
}

type OspiteResult = {
  id: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  dataArrivo: string
  dataPartenza: string | null
  unitaNome: string | null
  guestSesso: string | null
  guestDataNascita: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  valido: boolean
  campiMancanti: string[]
}

type RisultatoQuery = {
  struttura: { id: string; nome: string; alloggiatiAbilitato: boolean; alloggiatiCodiceStruttura: string | null }
  ospiti: OspiteResult[]
  totale: number
  validi: number
  nonValidi: number
}

export default function AlloggiatiClient({ strutture }: { strutture: Struttura[] }) {
  const [strutturaId, setStrutturaId] = useState(strutture[0]?.id ?? '')
  const [da, setDa] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [a, setA] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [risultato, setRisultato] = useState<RisultatoQuery | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [errore, setErrore] = useState('')

  const strutturaSelezionata = strutture.find(s => s.id === strutturaId)

  async function caricaOspiti() {
    if (!strutturaId) return
    setLoading(true)
    setErrore('')
    setRisultato(null)
    try {
      const res = await fetch(`/api/host/alloggiati?strutturaId=${strutturaId}&da=${da}&a=${a}`)
      if (!res.ok) {
        const j = await res.json()
        setErrore(j.error || 'Errore nel caricamento')
        return
      }
      setRisultato(await res.json())
    } catch (err) { console.error(err) 
      setErrore('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  async function scaricaFile() {
    if (!risultato || risultato.validi === 0) return
    setDownloading(true)
    try {
      const res = await fetch('/api/host/alloggiati', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strutturaId, da, a }),
      })
      if (!res.ok) {
        const j = await res.json()
        setErrore(j.error || 'Errore nella generazione')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `alloggiati_${da}_${a}.txt`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) { console.error(err) 
      setErrore('Errore nel download')
    } finally {
      setDownloading(false)
    }
  }

  if (strutture.length === 0) {
    return (
      <div className="card py-16 flex flex-col items-center gap-3 text-gray-400">
        <Building2 className="w-10 h-10 opacity-30" />
        <p className="text-sm">Nessuna struttura attiva. Crea prima una struttura.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <Shield className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Formato Polizia di Stato</p>
            <p>
              Genera il file .txt nel formato standard <strong>Alloggiati Web</strong> per l&apos;invio
              delle schedine degli ospiti alla Questura. Il file contiene i dati anagrafici e del documento
              degli ospiti con arrivo nel periodo selezionato.
            </p>
            <p className="mt-1 text-blue-600">
              <a
                href="https://alloggiatiweb.poliziadistato.it"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
              >
                Portale Alloggiati Web <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Selezione struttura + periodo */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Struttura</label>
            <div className="relative">
              <select
                value={strutturaId}
                onChange={e => { setStrutturaId(e.target.value); setRisultato(null) }}
                className="input pr-8 appearance-none"
              >
                {strutture.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nome} {s.alloggiatiAbilitato ? '✓' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {strutturaSelezionata && !strutturaSelezionata.alloggiatiAbilitato && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Alloggiati non abilitato — configura dalle impostazioni struttura
              </p>
            )}
            {strutturaSelezionata?.alloggiatiCodiceStruttura && (
              <p className="text-xs text-gray-400 mt-1">
                Codice: {strutturaSelezionata.alloggiatiCodiceStruttura}
              </p>
            )}
          </div>
          <div>
            <label className="label">Data inizio (arrivi dal)</label>
            <input
              type="date"
              value={da}
              onChange={e => { setDa(e.target.value); setRisultato(null) }}
              className="input"
            />
          </div>
          <div>
            <label className="label">Data fine (arrivi fino al)</label>
            <input
              type="date"
              value={a}
              onChange={e => { setA(e.target.value); setRisultato(null) }}
              className="input"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={caricaOspiti}
            disabled={loading || !strutturaId}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {loading ? 'Caricamento...' : 'Verifica ospiti'}
          </button>
        </div>
      </div>

      {errore && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          {errore}
        </div>
      )}

      {/* Risultati */}
      {risultato && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-2xl font-bold text-gray-900">{risultato.totale}</p>
              <p className="text-xs text-gray-500">Ospiti nel periodo</p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-green-600">{risultato.validi}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Dati completi
              </p>
            </div>
            <div className="card text-center">
              <p className="text-2xl font-bold text-amber-600">{risultato.nonValidi}</p>
              <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Dati incompleti
              </p>
            </div>
          </div>

          {/* Bottone download */}
          {risultato.validi > 0 && risultato.struttura.alloggiatiCodiceStruttura && (
            <div className="card bg-green-50 border-green-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-800">
                  File pronto per {risultato.validi} ospiti
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Formato .txt compatibile con il portale Alloggiati Web della Polizia di Stato
                </p>
              </div>
              <button
                onClick={scaricaFile}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloading ? 'Generazione...' : 'Scarica file .txt'}
              </button>
            </div>
          )}

          {!risultato.struttura.alloggiatiCodiceStruttura && risultato.validi > 0 && (
            <div className="card bg-amber-50 border-amber-200">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Codice struttura mancante</p>
                  <p className="mt-0.5">
                    Per generare il file devi configurare il <strong>Codice Alloggiati</strong> (assegnato
                    dalla Questura) nelle impostazioni della struttura.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tabella ospiti */}
          <div className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Dettaglio ospiti</h2>
            {risultato.ospiti.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Nessun ospite con arrivo nel periodo selezionato
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Stato</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Ospite</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Arrivo</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Unità</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Documento</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Campi mancanti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {risultato.ospiti.map(o => (
                      <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2.5">
                          {o.valido ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                        </td>
                        <td className="py-2.5">
                          <p className="font-medium text-gray-900">{o.guestCognome} {o.guestNome}</p>
                          <p className="text-xs text-gray-400">{o.guestEmail}</p>
                        </td>
                        <td className="py-2.5 text-gray-600">
                          {format(new Date(o.dataArrivo), 'd MMM yyyy', { locale: it })}
                        </td>
                        <td className="py-2.5 text-gray-600">{o.unitaNome ?? '—'}</td>
                        <td className="py-2.5 text-gray-600">
                          {o.guestTipoDocumento
                            ? `${o.guestTipoDocumento} ${o.guestNumeroDocumento ?? ''}`
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="py-2.5">
                          {o.campiMancanti.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {o.campiMancanti.map(c => (
                                <span key={c} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                                  {c}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-green-600">Completo</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
