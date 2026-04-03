'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Crown, ArrowLeft, Plus, Trash2, Save, Users, Star, TrendingUp,
  Gift, Search, MoreHorizontal, Award, ChevronDown, ChevronUp, X,
  Loader2, RefreshCw
} from 'lucide-react'
import { formatValuta, cn } from '@/lib/utils'



// ─── Types ──────────────────────────────────────────────────────────────────

interface Livello {
  id?: string
  nome: string
  puntiMinimi: number
  scontoPercentuale: number
  colore: string
  ordine: number
  benefici?: string | null
}

interface Programma {
  id: string
  nome: string
  descrizione?: string | null
  puntiPerEuro: number
  puntiPerVisita: number
  attivo: boolean
  livelli: Livello[]
  stats?: {
    totaleMembri: number
    puntiEmessi: number
    puntiUtilizzati: number
  }
}

interface Membro {
  id: string
  puntiAccumulati: number
  puntiUtilizzati: number
  saldoPunti: number
  ultimaAttivita: string | null
  ospite: {
    id: string
    nome: string
    cognome: string
    email: string
    telefono?: string | null
    vip: boolean
  }
  livello: { id: string; nome: string; colore: string; scontoPercentuale: number } | null
  livelloCalcolato: { id: string; nome: string; colore: string; scontoPercentuale: number } | null
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function LoyaltyManager() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [programma, setProgramma] = useState<Programma | null>(null)
  const [membri, setMembri] = useState<Membro[]>([])
  const [membriTotale, setMembriTotale] = useState(0)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'config' | 'members'>('config')

  // Form state
  const [formNome, setFormNome] = useState('Programma Fedeltà SPA')
  const [formPuntiPerEuro, setFormPuntiPerEuro] = useState(1)
  const [formPuntiPerVisita, setFormPuntiPerVisita] = useState(10)
  const [formLivelli, setFormLivelli] = useState<Livello[]>([
    { nome: 'Bronze', puntiMinimi: 0, scontoPercentuale: 0, colore: '#cd7f32', ordine: 0 },
    { nome: 'Silver', puntiMinimi: 100, scontoPercentuale: 5, colore: '#c0c0c0', ordine: 1 },
    { nome: 'Gold', puntiMinimi: 500, scontoPercentuale: 10, colore: '#ffd700', ordine: 2 },
    { nome: 'Platinum', puntiMinimi: 1000, scontoPercentuale: 15, colore: '#e5e4e2', ordine: 3 },
  ])

  // Add points modal
  const [pointsModal, setPointsModal] = useState<{ membroId: string; nome: string } | null>(null)
  const [pointsTipo, setPointsTipo] = useState<'ACCUMULO' | 'UTILIZZO' | 'BONUS'>('BONUS')
  const [pointsAmount, setPointsAmount] = useState(0)
  const [pointsDescrizione, setPointsDescrizione] = useState('')

  // Enroll modal
  const [enrollModal, setEnrollModal] = useState(false)
  const [enrollOspiteId, setEnrollOspiteId] = useState('')

  const loadProgramma = useCallback(async () => {
    try {
      const res = await fetch('/api/host/spa/loyalty')
      const data = await res.json()
      if (data.programma) {
        setProgramma(data.programma)
        setFormNome(data.programma.nome)
        setFormPuntiPerEuro(data.programma.puntiPerEuro)
        setFormPuntiPerVisita(data.programma.puntiPerVisita)
        if (data.programma.livelli.length > 0) {
          setFormLivelli(data.programma.livelli)
        }
      }
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [])

  const loadMembri = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/host/spa/loyalty/members?${params}`)
      const data = await res.json()
      setMembri(data.membri ?? [])
      setMembriTotale(data.totale ?? 0)
    } catch (err) { console.error(err) }
  }, [search])

  useEffect(() => { loadProgramma() }, [loadProgramma])
  useEffect(() => {
    if (tab === 'members') loadMembri()
  }, [tab, loadMembri])

  // Save program config
  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/host/spa/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formNome,
          puntiPerEuro: formPuntiPerEuro,
          puntiPerVisita: formPuntiPerVisita,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        // Save levels
        if (data.id) {
          await fetch('/api/host/spa/loyalty', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ programmaId: data.id, livelli: formLivelli }),
          })
        }
        await loadProgramma()
      }
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  // Add points
  const handleAddPoints = async () => {
    if (!pointsModal || !pointsAmount || !pointsDescrizione) return
    setSaving(true)
    try {
      await fetch('/api/host/spa/loyalty/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membroId: pointsModal.membroId,
          tipo: pointsTipo,
          punti: pointsAmount,
          descrizione: pointsDescrizione,
        }),
      })
      setPointsModal(null)
      setPointsAmount(0)
      setPointsDescrizione('')
      await loadMembri()
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  // Enroll member
  const handleEnroll = async () => {
    if (!enrollOspiteId) return
    setSaving(true)
    try {
      const res = await fetch('/api/host/spa/loyalty/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ospiteId: enrollOspiteId }),
      })
      if (res.ok) {
        setEnrollModal(false)
        setEnrollOspiteId('')
        await loadMembri()
        await loadProgramma()
      }
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  // Level helpers
  const addLevel = () => {
    setFormLivelli([
      ...formLivelli,
      { nome: '', puntiMinimi: 0, scontoPercentuale: 0, colore: '#6b7280', ordine: formLivelli.length },
    ])
  }

  const removeLevel = (idx: number) => {
    setFormLivelli(formLivelli.filter((_, i) => i !== idx))
  }

  const updateLevel = (idx: number, field: keyof Livello, value: string | number) => {
    setFormLivelli(formLivelli.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/host/spa" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 bg-amber-100 rounded-lg">
            <Crown className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Programma Fedeltà</h1>
            <p className="text-sm text-gray-500">Gestisci il programma fedeltà SPA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab('config')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === 'config' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Configurazione
          </button>
          <button
            onClick={() => setTab('members')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === 'members' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            Membri ({programma?.stats?.totaleMembri ?? 0})
          </button>
        </div>
      </div>

      {/* Stats KPI */}
      {programma?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Totale membri</span>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{programma.stats.totaleMembri}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Punti emessi</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{programma.stats.puntiEmessi.toLocaleString('it-IT')}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Punti utilizzati</span>
              <Gift className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{programma.stats.puntiUtilizzati.toLocaleString('it-IT')}</div>
          </div>
        </div>
      )}

      {/* Config Tab */}
      {tab === 'config' && (
        <div className="space-y-6">
          {/* Program settings */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Impostazioni programma</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome programma</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punti per euro speso</label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={formPuntiPerEuro}
                  onChange={(e) => setFormPuntiPerEuro(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bonus punti per visita</label>
                <input
                  type="number"
                  min={0}
                  value={formPuntiPerVisita}
                  onChange={(e) => setFormPuntiPerVisita(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Levels editor */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Livelli fedeltà</h2>
              <button
                onClick={addLevel}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Aggiungi livello
              </button>
            </div>

            <div className="space-y-3">
              {formLivelli.map((livello, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <input
                    type="color"
                    value={livello.colore}
                    onChange={(e) => updateLevel(idx, 'colore', e.target.value)}
                    className="h-8 w-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    placeholder="Nome livello"
                    value={livello.nome}
                    onChange={(e) => updateLevel(idx, 'nome', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      placeholder="Punti min"
                      value={livello.puntiMinimi}
                      onChange={(e) => updateLevel(idx, 'puntiMinimi', parseInt(e.target.value) || 0)}
                      className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <span className="text-xs text-gray-400">pt</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      placeholder="Sconto %"
                      value={livello.scontoPercentuale}
                      onChange={(e) => updateLevel(idx, 'scontoPercentuale', parseFloat(e.target.value) || 0)}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <span className="text-xs text-gray-400">%</span>
                  </div>
                  <button
                    onClick={() => removeLevel(idx)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Save button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salva configurazione
            </button>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {tab === 'members' && (
        <div className="space-y-4">
          {/* Actions bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per nome o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setEnrollModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Iscrivi ospite
            </button>
            <button
              onClick={loadMembri}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Members table */}
          {membri.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ospite</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Livello</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Punti</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ultima attività</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {membri.map((m) => {
                    const livello = m.livelloCalcolato || m.livello
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {m.ospite.vip && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {m.ospite.nome} {m.ospite.cognome}
                              </div>
                              <div className="text-xs text-gray-500">{m.ospite.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {livello ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full text-white"
                              style={{ backgroundColor: livello.colore || '#6b7280' }}
                            >
                              <Award className="h-3 w-3" />
                              {livello.nome}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {m.saldoPunti.toLocaleString('it-IT')}
                          </div>
                          <div className="text-xs text-gray-400">
                            tot: {m.puntiAccumulati.toLocaleString('it-IT')}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                          {m.ultimaAttivita
                            ? new Date(m.ultimaAttivita).toLocaleDateString('it-IT')
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              setPointsModal({
                                membroId: m.id,
                                nome: `${m.ospite.nome} ${m.ospite.cognome}`,
                              })
                            }
                            className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                          >
                            + Punti
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Nessun membro iscritto al programma</p>
              <p className="text-xs text-gray-400 mt-1">Usa il pulsante &ldquo;Iscrivi ospite&rdquo; per aggiungere il primo membro</p>
            </div>
          )}
        </div>
      )}

      {/* Points Modal */}
      {pointsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Gestisci punti</h3>
              <button onClick={() => setPointsModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{pointsModal.nome}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo operazione</label>
                <select
                  value={pointsTipo}
                  onChange={(e) => setPointsTipo(e.target.value as 'ACCUMULO' | 'UTILIZZO' | 'BONUS')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="BONUS">Bonus</option>
                  <option value="ACCUMULO">Accumulo</option>
                  <option value="UTILIZZO">Utilizzo (deduzione)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punti</label>
                <input
                  type="number"
                  min={1}
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={pointsDescrizione}
                  onChange={(e) => setPointsDescrizione(e.target.value)}
                  placeholder="es. Bonus compleanno, Utilizzo sconto..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setPointsModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleAddPoints}
                disabled={saving || !pointsAmount || !pointsDescrizione}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {enrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Iscrivi ospite</h3>
              <button onClick={() => setEnrollModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Inserisci l&apos;ID dell&apos;ospite dal CRM per iscriverlo al programma fedeltà.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Ospite CRM</label>
              <input
                type="text"
                value={enrollOspiteId}
                onChange={(e) => setEnrollOspiteId(e.target.value)}
                placeholder="ID ospite..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEnrollModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleEnroll}
                disabled={saving || !enrollOspiteId}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Iscrizione...' : 'Iscrivi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
