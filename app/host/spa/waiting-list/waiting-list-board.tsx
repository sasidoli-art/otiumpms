'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Clock, ArrowLeft, Plus, Phone, CheckCircle2, XCircle, AlertTriangle,
  Search, Loader2, RefreshCw, X, Calendar, User, Mail, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'



// ─── Types ──────────────────────────────────────────────────────────────────

interface WaitingEntry {
  id: string
  guestNome: string
  guestEmail: string
  guestTelefono: string | null
  dataDesiderata: string
  fasceOrarie: string | null
  stato: string
  note: string | null
  notificatoAt: string | null
  createdAt: string
  trattamento: { id: string; nome: string; categoria?: string; durata?: number; prezzo?: number } | null
  terapista: { id: string; nome: string; cognome: string } | null
}

type StatoFilter = 'TUTTI' | 'IN_ATTESA' | 'CONTATTATO' | 'PRENOTATO' | 'SCADUTO' | 'CANCELLATO'

const STATO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  IN_ATTESA: { label: 'In attesa', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3.5 w-3.5" /> },
  CONTATTATO: { label: 'Contattato', color: 'bg-blue-100 text-blue-800', icon: <Phone className="h-3.5 w-3.5" /> },
  PRENOTATO: { label: 'Prenotato', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  SCADUTO: { label: 'Scaduto', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="h-3.5 w-3.5" /> },
  CANCELLATO: { label: 'Cancellato', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3.5 w-3.5" /> },
}

const FASCE_LABEL: Record<string, string> = {
  mattina: 'Mattina',
  pomeriggio: 'Pomeriggio',
  qualsiasi: 'Qualsiasi',
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function WaitingListBoard() {
  const _router = useRouter()
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<WaitingEntry[]>([])
  const [filtroStato, setFiltroStato] = useState<StatoFilter>('TUTTI')
  const [saving, setSaving] = useState(false)

  // Add modal
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    guestNome: '',
    guestEmail: '',
    guestTelefono: '',
    trattamentoId: '',
    dataDesiderata: '',
    fasceOrarie: 'qualsiasi',
    note: '',
  })

  // Turnaway modal
  const [turnawayModal, setTurnawayModal] = useState<WaitingEntry | null>(null)
  const [turnawayMotivo, setTurnawayMotivo] = useState<string>('PIENO')
  const [turnawayNote, setTurnawayNote] = useState('')

  const loadEntries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroStato !== 'TUTTI') params.set('stato', filtroStato)
      const res = await fetch(`/api/host/spa/waiting-list?${params}`)
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch (err) { console.error(err) }
    setLoading(false)
  }, [filtroStato])

  useEffect(() => { loadEntries() }, [loadEntries])

  // Add entry
  const handleAdd = async () => {
    if (!form.guestNome || !form.guestEmail || !form.dataDesiderata) return
    setSaving(true)
    try {
      const res = await fetch('/api/host/spa/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowAdd(false)
        setForm({ guestNome: '', guestEmail: '', guestTelefono: '', trattamentoId: '', dataDesiderata: '', fasceOrarie: 'qualsiasi', note: '' })
        await loadEntries()
      }
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  // Update status
  const handleUpdateStato = async (id: string, stato: string) => {
    setSaving(true)
    try {
      await fetch('/api/host/spa/waiting-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stato }),
      })
      await loadEntries()
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  // Log turnaway
  const handleTurnaway = async () => {
    if (!turnawayModal) return
    setSaving(true)
    try {
      // Log turnaway
      await fetch('/api/host/spa/turnaway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: turnawayModal.dataDesiderata,
          trattamentoId: turnawayModal.trattamento?.id ?? null,
          motivo: turnawayMotivo,
          guestNome: turnawayModal.guestNome,
          note: turnawayNote || null,
        }),
      })
      // Mark waiting list entry as expired/cancelled
      await fetch('/api/host/spa/waiting-list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: turnawayModal.id, stato: 'SCADUTO', note: `Turnaway: ${turnawayMotivo}` }),
      })
      setTurnawayModal(null)
      setTurnawayMotivo('PIENO')
      setTurnawayNote('')
      await loadEntries()
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const conteggi = {
    TUTTI: entries.length,
    IN_ATTESA: entries.filter((e) => e.stato === 'IN_ATTESA').length,
    CONTATTATO: entries.filter((e) => e.stato === 'CONTATTATO').length,
    PRENOTATO: entries.filter((e) => e.stato === 'PRENOTATO').length,
    SCADUTO: entries.filter((e) => e.stato === 'SCADUTO').length,
    CANCELLATO: entries.filter((e) => e.stato === 'CANCELLATO').length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/host/spa" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="p-2 bg-sky-100 rounded-lg">
            <Clock className="h-6 w-6 text-sky-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Waiting List SPA</h1>
            <p className="text-sm text-gray-500">Gestisci le richieste in lista d&apos;attesa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Aggiungi
          </button>
          <button
            onClick={loadEntries}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['TUTTI', 'IN_ATTESA', 'CONTATTATO', 'PRENOTATO', 'SCADUTO', 'CANCELLATO'] as StatoFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStato(s)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors border',
              filtroStato === s
                ? 'bg-sky-100 text-sky-800 border-sky-300'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            )}
          >
            {s === 'TUTTI' ? 'Tutti' : STATO_CONFIG[s]?.label ?? s} ({conteggi[s]})
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
        </div>
      ) : entries.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ospite</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Trattamento</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Data desiderata</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Fascia</th>
                <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Stato</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => {
                const stato = STATO_CONFIG[entry.stato]
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{entry.guestNome}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {entry.guestEmail}
                      </div>
                      {entry.guestTelefono && (
                        <div className="text-xs text-gray-400">{entry.guestTelefono}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-800">
                        {entry.trattamento?.nome ?? <span className="text-gray-400 italic">Non specificato</span>}
                      </div>
                      {entry.terapista && (
                        <div className="text-xs text-gray-400">
                          Terapista: {entry.terapista.nome} {entry.terapista.cognome}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-sm text-gray-800">
                        {new Date(entry.dataDesiderata).toLocaleDateString('it-IT')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs text-gray-600">
                        {FASCE_LABEL[entry.fasceOrarie ?? 'qualsiasi'] ?? entry.fasceOrarie}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {stato && (
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full', stato.color)}>
                          {stato.icon}
                          {stato.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {entry.stato === 'IN_ATTESA' && (
                          <>
                            <button
                              onClick={() => handleUpdateStato(entry.id, 'CONTATTATO')}
                              disabled={saving}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                              title="Slot disponibile — Contatta"
                            >
                              <Sparkles className="h-3 w-3" />
                              Contatta
                            </button>
                            <button
                              onClick={() => setTurnawayModal(entry)}
                              disabled={saving}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                              title="Non disponibile — Registra turnaway"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              Turnaway
                            </button>
                          </>
                        )}
                        {entry.stato === 'CONTATTATO' && (
                          <>
                            <button
                              onClick={() => handleUpdateStato(entry.id, 'PRENOTATO')}
                              disabled={saving}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Prenotato
                            </button>
                            <button
                              onClick={() => handleUpdateStato(entry.id, 'CANCELLATO')}
                              disabled={saving}
                              className="px-2 py-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Nessuna richiesta in lista d&apos;attesa</p>
          <p className="text-xs text-gray-400 mt-1">Aggiungi un ospite alla lista quando non ci sono slot disponibili</p>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Aggiungi alla lista d&apos;attesa</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome ospite *</label>
                  <input
                    type="text"
                    value={form.guestNome}
                    onChange={(e) => setForm({ ...form, guestNome: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={form.guestEmail}
                    onChange={(e) => setForm({ ...form, guestEmail: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                <input
                  type="tel"
                  value={form.guestTelefono}
                  onChange={(e) => setForm({ ...form, guestTelefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data desiderata *</label>
                  <input
                    type="date"
                    value={form.dataDesiderata}
                    onChange={(e) => setForm({ ...form, dataDesiderata: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fascia oraria</label>
                  <select
                    value={form.fasceOrarie}
                    onChange={(e) => setForm({ ...form, fasceOrarie: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="qualsiasi">Qualsiasi</option>
                    <option value="mattina">Mattina</option>
                    <option value="pomeriggio">Pomeriggio</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !form.guestNome || !form.guestEmail || !form.dataDesiderata}
                className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:opacity-50"
              >
                {saving ? 'Salvataggio...' : 'Aggiungi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Turnaway Modal */}
      {turnawayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Registra Turnaway</h3>
              <button onClick={() => setTurnawayModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Registra il motivo per cui <strong>{turnawayModal.guestNome}</strong> non ha potuto prenotare.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                <select
                  value={turnawayMotivo}
                  onChange={(e) => setTurnawayMotivo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="PIENO">Pieno (nessuno slot)</option>
                  <option value="NON_DISPONIBILE">Terapista/cabina non disponibile</option>
                  <option value="ORARIO">Orario non compatibile</option>
                  <option value="PREZZO">Prezzo troppo alto</option>
                  <option value="ALTRO">Altro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea
                  value={turnawayNote}
                  onChange={(e) => setTurnawayNote(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Dettagli aggiuntivi..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setTurnawayModal(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleTurnaway}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Registrazione...' : 'Registra turnaway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
