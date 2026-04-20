'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  FileDown, Shield, CheckCircle2, AlertTriangle, XCircle, Loader2,
  Users, Calendar, Building2, UserPlus, RefreshCw, ChevronDown, ChevronRight,
  ExternalLink, Pencil,
} from 'lucide-react'
import CompletaDatiModal, { type OspitePayload, type AccompagnatorePayload } from './completa-dati-modal'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type Stato = 'completo' | 'incompleto' | 'mancante'

type StrutturaInfo = {
  id: string
  nome: string
  alloggiatiAbilitato: boolean
  alloggiatiCodiceStruttura: string | null
  alloggiatiComuneIstat: string | null
  alloggiatiDenominazioneComune: string | null
}

type Accompagnatore = {
  id: string
  nome: string
  cognome: string
  sesso: string | null
  dataNascita: string | null
  luogoNascita: string | null
  provinciaNascita: string | null
  comuneNascitaIstat: string | null
  statoNascitaIstat: string | null
  cittadinanzaIstat: string | null
  tipoDocumento: string | null
  numeroDocumento: string | null
  comuneRilascioIstat: string | null
  provinciaRilascio: string | null
  isMinore: boolean
  stato: Stato
  campiMancanti: string[]
}

type Ospite = {
  id: string
  dataArrivo: string
  dataPartenza: string | null
  numOspiti: number
  guestNome: string
  guestCognome: string
  guestEmail: string
  guestTelefono: string | null
  guestSesso: string | null
  guestDataNascita: string | null
  guestLuogoNascita: string | null
  guestComuneNascitaIstat: string | null
  guestProvinciaNascita: string | null
  guestStatoNascitaIstat: string | null
  guestCittadinanzaIstat: string | null
  guestTipoDocumento: string | null
  guestNumeroDocumento: string | null
  guestLuogoRilascio: string | null
  guestComuneRilascioIstat: string | null
  guestProvinciaRilascio: string | null
  unitaNome: string | null
  accompagnatori: Accompagnatore[]
  stato: Stato
  campiMancanti: string[]
}

type ExportRec = {
  id: string
  dataExport: string
  numOspiti: number
  numAccompagnatori: number
  numIncompleti: number
  fileNome: string
  createdAt: string
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AlloggiatiExport({ strutture }: { strutture: StrutturaInfo[] }) {
  const attive = strutture.filter((s) => s.alloggiatiAbilitato && s.alloggiatiCodiceStruttura)
  const [strutturaId, setStrutturaId] = useState<string>(attive[0]?.id ?? strutture[0]?.id ?? '')
  const struttura = strutture.find((s) => s.id === strutturaId)

  // Default: ieri (arrivi da comunicare entro 24h)
  const ieri = new Date(Date.now() - 86400000)
  const [dataSel, setDataSel] = useState<string>(ieri.toISOString().slice(0, 10))

  const [ospiti, setOspiti] = useState<Ospite[]>([])
  const [stats, setStats] = useState({ totale: 0, completi: 0, incompleti: 0, mancanti: 0 })
  const [storico, setStorico] = useState<ExportRec[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [errore, setErrore] = useState('')
  const [completaId, setCompletaId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!strutturaId) return
    setLoading(true); setErrore('')
    const res = await fetch(`/api/host/alloggiati?strutturaId=${strutturaId}&data=${dataSel}`)
    if (res.ok) {
      const d = await res.json()
      setOspiti(d.ospiti)
      setStats({ totale: d.totale, completi: d.completi, incompleti: d.incompleti, mancanti: d.mancanti })
    } else {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore caricamento')
    }
    setLoading(false)
  }, [strutturaId, dataSel])

  const loadStorico = useCallback(async () => {
    if (!strutturaId) return
    const res = await fetch(`/api/host/alloggiati/storico?strutturaId=${strutturaId}`)
    if (res.ok) {
      const d = await res.json()
      setStorico(d.storico)
    }
  }, [strutturaId])

  useEffect(() => { load(); loadStorico() }, [load, loadStorico])

  async function esporta() {
    if (!strutturaId) return
    setErrore('')

    // Se ci sono incompleti, chiedi conferma
    if (stats.incompleti > 0) {
      if (!window.confirm(
        `${stats.incompleti} ospiti hanno dati incompleti e verranno esclusi dall'export. Procedere comunque?`,
      )) return
    }

    setExporting(true)
    const res = await fetch('/api/host/alloggiati/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strutturaId, data: dataSel, forzaIncompleti: stats.incompleti > 0 }),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore export')
      setExporting(false)
      return
    }

    // Estrai filename + scarica
    const cd = res.headers.get('Content-Disposition') ?? ''
    const match = cd.match(/filename="?([^"]+)"?/)
    const filename = match?.[1] ?? `Alloggiati_${dataSel}.txt`
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    setExporting(false)
    loadStorico() // refresh storico
  }

  const ospiteSel = completaId ? ospiti.find((o) => o.id === completaId) : null

  return (
    <div className="space-y-6">
      {/* Header info struttura */}
      <div className="card flex items-start gap-4">
        <div className="p-3 bg-brand-500/10 rounded-xl shrink-0">
          <Shield className="w-6 h-6 text-brand-500" />
        </div>
        <div className="flex-1">
          {attive.length === 0 ? (
            <div>
              <p className="font-semibold text-gray-900">Alloggiati Web non configurato</p>
              <p className="text-sm text-gray-500 mt-1">
                Nessuna struttura ha il codice Questura configurato. Vai nelle impostazioni della struttura e imposta
                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded ml-1">alloggiatiCodiceStruttura</code>.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={strutturaId}
                  onChange={(e) => setStrutturaId(e.target.value)}
                  className="text-base font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0 cursor-pointer"
                >
                  {strutture.map((s) => (
                    <option key={s.id} value={s.id} disabled={!s.alloggiatiAbilitato || !s.alloggiatiCodiceStruttura}>
                      {s.nome}{!s.alloggiatiCodiceStruttura ? ' (non configurata)' : ''}
                    </option>
                  ))}
                </select>
                {struttura?.alloggiatiCodiceStruttura && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                    Codice: {struttura.alloggiatiCodiceStruttura}
                  </span>
                )}
                {struttura?.alloggiatiDenominazioneComune && (
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {struttura.alloggiatiDenominazioneComune}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Invio dati ospiti alla Questura entro 24 ore dall&apos;arrivo (art. 109 TULPS).
              </p>
            </>
          )}
        </div>
      </div>

      {/* Selettore data + KPI */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-brand-500" />
            <div>
              <label className="label mb-1">Giorno arrivi da esportare</label>
              <input
                type="date"
                value={dataSel}
                onChange={(e) => setDataSel(e.target.value)}
                className="input"
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <button onClick={load} className="mt-5 p-2 rounded-lg text-gray-500 hover:bg-gray-100" title="Aggiorna">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 flex-1 max-w-xl">
            <KpiChip label="Totale" value={stats.totale} icon={<Users className="w-4 h-4" />} color="brand" />
            <KpiChip label="Completi" value={stats.completi} icon={<CheckCircle2 className="w-4 h-4" />} color="green" />
            <KpiChip label="Incompleti" value={stats.incompleti} icon={<AlertTriangle className="w-4 h-4" />} color="yellow" />
            <KpiChip label="Mancanti" value={stats.mancanti} icon={<XCircle className="w-4 h-4" />} color="red" />
          </div>
        </div>
      </div>

      {errore && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-start gap-2">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> {errore}
        </div>
      )}

      {/* Tabella ospiti */}
      <div className="card p-0 overflow-hidden">
        {ospiti.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-sm">
            {loading ? 'Caricamento…' : `Nessun arrivo per il ${format(new Date(dataSel), 'd MMMM yyyy', { locale: it })}`}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="table-th">Ospite</th>
                <th className="table-th hidden md:table-cell">Camera</th>
                <th className="table-th hidden md:table-cell">Check-in</th>
                <th className="table-th">Dati</th>
                <th className="table-th hidden lg:table-cell">Accompagnatori</th>
                <th className="table-th w-24"></th>
              </tr>
            </thead>
            <tbody>
              {ospiti.map((o) => (
                <OspiteRow
                  key={o.id}
                  ospite={o}
                  onCompleta={() => setCompletaId(o.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Export action */}
      <div className="card bg-gradient-to-br from-brand-500/5 to-brand-500/10 border border-brand-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <FileDown className="w-5 h-5 text-brand-500" />
              Genera file Alloggiati Web
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {stats.mancanti > 0
                ? <span className="text-red-600 font-medium">Impossibile esportare: {stats.mancanti} ospiti con dati minimi mancanti.</span>
                : stats.incompleti > 0
                ? <span className="text-yellow-700 font-medium">{stats.incompleti} ospiti con dati incompleti verranno esclusi.</span>
                : stats.totale > 0
                ? `Pronto per esportare ${stats.completi} ospiti.`
                : 'Nessun ospite da esportare per la data selezionata.'}
            </p>
          </div>
          <button
            onClick={esporta}
            disabled={exporting || stats.mancanti > 0 || stats.completi === 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Scarica file
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-brand-200/50 text-xs text-gray-600 flex items-start gap-2">
          <ExternalLink className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p>
            Carica il file sul portale ufficiale{' '}
            <a
              href="https://alloggiatiweb.poliziadistato.it/"
              target="_blank" rel="noopener noreferrer"
              className="text-brand-600 hover:underline font-medium"
            >
              Alloggiati Web Polizia di Stato →
            </a>
          </p>
        </div>
      </div>

      {/* Storico */}
      <div className="card">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" /> Storico export
        </h3>
        {storico.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Nessun export effettuato per questa struttura.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {storico.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-2.5">
                <div className={`p-1.5 rounded-lg shrink-0 ${e.numIncompleti > 0 ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-500'}`}>
                  {e.numIncompleti > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {format(new Date(e.dataExport), 'd MMMM yyyy', { locale: it })}
                    <span className="text-xs text-gray-400 ml-2">
                      · {e.numOspiti} ospiti + {e.numAccompagnatori} accompagnatori
                      {e.numIncompleti > 0 && <span className="text-yellow-600"> · {e.numIncompleti} incompleti esclusi</span>}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {e.fileNome} · generato il {format(new Date(e.createdAt), 'd MMM HH:mm', { locale: it })}
                  </p>
                </div>
                <a
                  href={`/api/host/alloggiati/storico/${e.id}`}
                  className="text-sm px-2.5 py-1 rounded text-brand-600 hover:bg-brand-50 flex items-center gap-1 font-medium"
                >
                  <FileDown className="w-3.5 h-3.5" /> Scarica
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {completaId && ospiteSel && (
        <CompletaDatiModal
          ospite={ospiteToPayload(ospiteSel)}
          accompagnatori={ospiteSel.accompagnatori.map(accToPayload)}
          onClose={() => setCompletaId(null)}
          onSaved={() => { setCompletaId(null); load() }}
        />
      )}
    </div>
  )
}

// ─── Row ospite con sezione accompagnatori espandibile ────────────────────────

function OspiteRow({ ospite: o, onCompleta }: { ospite: Ospite; onCompleta: () => void }) {
  const [open, setOpen] = useState(false)
  const cfg = STATO_CFG[o.stato]

  return (
    <>
      <tr className="border-b border-gray-50 hover:bg-gray-50/60 group">
        <td className="table-td">
          <div className="flex items-center gap-2">
            {o.accompagnatori.length > 0 && (
              <button onClick={() => setOpen((x) => !x)} className="p-0.5 text-gray-400 hover:text-gray-700">
                {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
            <div>
              <p className="font-semibold text-gray-900">{o.guestCognome} {o.guestNome}</p>
              <p className="text-xs text-gray-400">{o.guestEmail}</p>
            </div>
          </div>
        </td>
        <td className="table-td hidden md:table-cell text-gray-600">{o.unitaNome ?? '—'}</td>
        <td className="table-td hidden md:table-cell text-gray-600">
          {format(new Date(o.dataArrivo), 'd MMM', { locale: it })}
        </td>
        <td className="table-td">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${cfg.cls}`}
            title={o.campiMancanti.length > 0 ? `Mancanti: ${o.campiMancanti.join(', ')}` : undefined}
          >
            {cfg.icon} {cfg.label}
          </span>
        </td>
        <td className="table-td hidden lg:table-cell">
          {o.accompagnatori.length === 0 ? (
            <span className="text-xs text-gray-400">—</span>
          ) : (
            <span className="text-xs font-medium flex items-center gap-1">
              <UserPlus className="w-3 h-3 text-gray-400" /> {o.accompagnatori.length}
            </span>
          )}
        </td>
        <td className="table-td">
          <button
            onClick={onCompleta}
            className="text-sm px-2.5 py-1 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center gap-1 font-medium"
          >
            <Pencil className="w-3.5 h-3.5" /> Completa dati
          </button>
        </td>
      </tr>
      {open && o.accompagnatori.map((a) => {
        const acfg = STATO_CFG[a.stato]
        return (
          <tr key={a.id} className="border-b border-gray-50 bg-gray-50/30">
            <td className="table-td pl-8">
              <p className="text-sm text-gray-700">{a.cognome} {a.nome}{a.isMinore ? ' (minore)' : ''}</p>
            </td>
            <td className="table-td hidden md:table-cell text-gray-400 text-xs">Accompagnatore</td>
            <td className="table-td hidden md:table-cell"></td>
            <td className="table-td">
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold inline-flex items-center gap-1 ${acfg.cls}`}
                title={a.campiMancanti.length > 0 ? `Mancanti: ${a.campiMancanti.join(', ')}` : undefined}
              >
                {acfg.icon} {acfg.label}
              </span>
            </td>
            <td colSpan={2}></td>
          </tr>
        )
      })}
    </>
  )
}

const STATO_CFG: Record<Stato, { label: string; cls: string; icon: React.ReactNode }> = {
  completo: {
    label: 'Completo',
    cls: 'bg-green-50 text-green-700',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  incompleto: {
    label: 'Incompleto',
    cls: 'bg-yellow-50 text-yellow-700',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  mancante: {
    label: 'Mancante',
    cls: 'bg-red-50 text-red-700',
    icon: <XCircle className="w-3 h-3" />,
  },
}

function KpiChip({
  label, value, icon, color,
}: {
  label: string; value: number; icon: React.ReactNode; color: 'brand' | 'green' | 'yellow' | 'red'
}) {
  const colorMap = {
    brand: 'bg-brand-500/10 text-brand-500',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  }
  return (
    <div className="flex items-center gap-2">
      <div className={`p-1.5 rounded-lg ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-lg font-extrabold leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function ospiteToPayload(o: Ospite): OspitePayload {
  return {
    id: o.id,
    nome: o.guestNome,
    cognome: o.guestCognome,
    sesso: o.guestSesso,
    dataNascita: o.guestDataNascita,
    luogoNascita: o.guestLuogoNascita,
    comuneNascitaIstat: o.guestComuneNascitaIstat,
    provinciaNascita: o.guestProvinciaNascita,
    statoNascitaIstat: o.guestStatoNascitaIstat,
    cittadinanzaIstat: o.guestCittadinanzaIstat,
    tipoDocumento: o.guestTipoDocumento,
    numeroDocumento: o.guestNumeroDocumento,
    luogoRilascio: o.guestLuogoRilascio,
    comuneRilascioIstat: o.guestComuneRilascioIstat,
    provinciaRilascio: o.guestProvinciaRilascio,
    campiMancanti: o.campiMancanti,
  }
}

function accToPayload(a: Accompagnatore): AccompagnatorePayload {
  return {
    id: a.id,
    nome: a.nome,
    cognome: a.cognome,
    sesso: a.sesso,
    dataNascita: a.dataNascita,
    luogoNascita: a.luogoNascita,
    comuneNascitaIstat: a.comuneNascitaIstat,
    provinciaNascita: a.provinciaNascita,
    statoNascitaIstat: a.statoNascitaIstat,
    cittadinanzaIstat: a.cittadinanzaIstat,
    tipoDocumento: a.tipoDocumento,
    numeroDocumento: a.numeroDocumento,
    comuneRilascioIstat: a.comuneRilascioIstat,
    provinciaRilascio: a.provinciaRilascio,
    isMinore: a.isMinore,
    campiMancanti: a.campiMancanti,
  }
}
