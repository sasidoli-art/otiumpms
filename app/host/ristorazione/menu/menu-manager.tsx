'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import {
  Plus, Pencil, Trash2, X, ChevronDown, ChevronUp,
  UtensilsCrossed, Loader2, Coffee, Sun, Moon, GripVertical,
  ToggleLeft, ToggleRight, Eye,
} from 'lucide-react'
import Link from 'next/link'



// ─── Tipi ─────────────────────────────────────────────────────────────────────

type TipoPasto = 'COLAZIONE' | 'PRANZO' | 'CENA'

type CategoriaPiatto =
  | 'PRIMO' | 'SECONDO' | 'CONTORNO' | 'DOLCE' | 'BEVANDA'
  | 'ANTIPASTO' | 'FRUTTA'
  | 'COLAZIONE_DOLCE' | 'COLAZIONE_SALATA' | 'COLAZIONE_BEVANDA'

type Piatto = {
  id?: string
  categoria: CategoriaPiatto
  nome: string
  descrizione: string
  allergeni: string[]
  prezzo: number | null
  ordine: number
  disponibile: boolean
}

type Menu = {
  id: string
  strutturaId: string
  strutturaNome: string
  tipoPasto: TipoPasto
  data: string
  isTemplate: boolean
  giornoSettimana: number | null
  nome: string | null
  note: string | null
  attivo: boolean
  piatti: Piatto[]
}

type Struttura = { id: string; nome: string }

// ─── Costanti ─────────────────────────────────────────────────────────────────

const TIPO_PASTO_LABEL: Record<TipoPasto, string> = {
  COLAZIONE: 'Colazione',
  PRANZO: 'Pranzo',
  CENA: 'Cena',
}

const TIPO_PASTO_ICON: Record<TipoPasto, typeof Coffee> = {
  COLAZIONE: Coffee,
  PRANZO: Sun,
  CENA: Moon,
}

const TIPO_PASTO_COLOR: Record<TipoPasto, string> = {
  COLAZIONE: 'text-amber-600 bg-amber-100',
  PRANZO: 'text-orange-600 bg-orange-100',
  CENA: 'text-indigo-600 bg-indigo-100',
}

const CATEGORIE_COLAZIONE: CategoriaPiatto[] = ['COLAZIONE_DOLCE', 'COLAZIONE_SALATA', 'COLAZIONE_BEVANDA']
const CATEGORIE_PRANZO_CENA: CategoriaPiatto[] = ['ANTIPASTO', 'PRIMO', 'SECONDO', 'CONTORNO', 'DOLCE', 'BEVANDA']

const CATEGORIA_LABEL: Record<CategoriaPiatto, string> = {
  ANTIPASTO: 'Antipasti',
  PRIMO: 'Primi piatti',
  SECONDO: 'Secondi piatti',
  CONTORNO: 'Contorni',
  DOLCE: 'Dolci',
  BEVANDA: 'Bevande',
  FRUTTA: 'Frutta',
  COLAZIONE_DOLCE: 'Colazione dolce',
  COLAZIONE_SALATA: 'Colazione salata',
  COLAZIONE_BEVANDA: 'Bevande colazione',
}

const ALLERGENI_DISPONIBILI = [
  { id: 'glutine', label: 'Glutine', emoji: '🌾' },
  { id: 'lattosio', label: 'Lattosio', emoji: '🥛' },
  { id: 'uova', label: 'Uova', emoji: '🥚' },
  { id: 'arachidi', label: 'Arachidi', emoji: '🥜' },
  { id: 'frutta_a_guscio', label: 'Frutta a guscio', emoji: '🌰' },
  { id: 'pesce', label: 'Pesce', emoji: '🐟' },
  { id: 'crostacei', label: 'Crostacei', emoji: '🦐' },
  { id: 'soia', label: 'Soia', emoji: '🫘' },
  { id: 'sedano', label: 'Sedano', emoji: '🥬' },
  { id: 'senape', label: 'Senape', emoji: '🟡' },
  { id: 'sesamo', label: 'Sesamo', emoji: '⚪' },
  { id: 'lupini', label: 'Lupini', emoji: '🟤' },
  { id: 'molluschi', label: 'Molluschi', emoji: '🐚' },
  { id: 'solfiti', label: 'Solfiti', emoji: '🍷' },
]

const GIORNI_SETTIMANA = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica']

// ─── Componente principale ────────────────────────────────────────────────────

export default function MenuManager() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [strutture, setStrutture] = useState<Struttura[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Filtri
  const [filtroStruttura, setFiltroStruttura] = useState<string>('')
  const [filtroTipo, setFiltroTipo] = useState<TipoPasto | ''>('')
  const [filtroData, setFiltroData] = useState(format(new Date(), 'yyyy-MM-dd'))

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editMenu, setEditMenu] = useState<Partial<Menu> | null>(null)
  const [editPiatti, setEditPiatti] = useState<Piatto[]>([])

  // ─── Caricamento dati ───────────────────────────────────────────────────────

  const caricaStrutture = useCallback(async () => {
    const res = await fetch('/api/host/strutture')
    if (res.ok) {
      const data = await res.json()
      const list = (data.strutture || data || []) as Struttura[]
      setStrutture(list)
      if (list.length > 0 && !filtroStruttura) {
        setFiltroStruttura(list[0].id)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const caricaMenus = useCallback(async () => {
    if (!filtroStruttura) return
    setLoading(true)
    const params = new URLSearchParams({ strutturaId: filtroStruttura, data: filtroData })
    if (filtroTipo) params.set('tipoPasto', filtroTipo)
    const res = await fetch(`/api/host/ristorazione/menu?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMenus(data.menus || [])
    }
    setLoading(false)
  }, [filtroStruttura, filtroTipo, filtroData])

  useEffect(() => { caricaStrutture() }, [caricaStrutture])
  useEffect(() => { caricaMenus() }, [caricaMenus])

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  const apriNuovoMenu = () => {
    const tipoPasto: TipoPasto = (filtroTipo as TipoPasto) || 'PRANZO'
    const categorie = tipoPasto === 'COLAZIONE' ? CATEGORIE_COLAZIONE : CATEGORIE_PRANZO_CENA
    const piattiDefault: Piatto[] = categorie.flatMap((cat, ci) =>
      Array.from({ length: 3 }, (_, i) => ({
        categoria: cat,
        nome: '',
        descrizione: '',
        allergeni: [],
        prezzo: null,
        ordine: ci * 10 + i,
        disponibile: true,
      }))
    )
    setEditMenu({
      strutturaId: filtroStruttura,
      tipoPasto,
      data: filtroData,
      isTemplate: false,
      giornoSettimana: null,
      nome: '',
      note: '',
      attivo: true,
    })
    setEditPiatti(piattiDefault)
    setModalOpen(true)
  }

  const apriModificaMenu = (menu: Menu) => {
    setEditMenu({ ...menu })
    setEditPiatti([...menu.piatti.map(p => ({ ...p }))])
    setModalOpen(true)
  }

  const salvaMenu = async () => {
    if (!editMenu) return
    setSaving(true)
    const piattiValidi = editPiatti.filter(p => p.nome.trim() !== '')
    const body = {
      ...editMenu,
      piatti: piattiValidi.map((p, i) => ({ ...p, ordine: i })),
    }
    const isEdit = !!editMenu.id
    const url = isEdit
      ? `/api/host/ristorazione/menu/${editMenu.id}`
      : '/api/host/ristorazione/menu'
    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      setModalOpen(false)
      setEditMenu(null)
      caricaMenus()
    }
    setSaving(false)
  }

  const eliminaMenu = async (id: string) => {
    if (!confirm('Eliminare questo menu? Le scelte degli ospiti associate verranno perse.')) return
    const res = await fetch(`/api/host/ristorazione/menu/${id}`, { method: 'DELETE' })
    if (res.ok) caricaMenus()
  }

  const toggleAttivo = async (menu: Menu) => {
    await fetch(`/api/host/ristorazione/menu/${menu.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attivo: !menu.attivo }),
    })
    caricaMenus()
  }

  // ─── Helpers piatti ─────────────────────────────────────────────────────────

  const categoriePerTipo = (tipo: TipoPasto) =>
    tipo === 'COLAZIONE' ? CATEGORIE_COLAZIONE : CATEGORIE_PRANZO_CENA

  const aggiungiPiatto = (categoria: CategoriaPiatto) => {
    setEditPiatti(prev => [
      ...prev,
      {
        categoria,
        nome: '',
        descrizione: '',
        allergeni: [],
        prezzo: null,
        ordine: prev.length,
        disponibile: true,
      },
    ])
  }

  const aggiornaPiatto = (index: number, field: keyof Piatto, value: unknown) => {
    setEditPiatti(prev => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const rimuoviPiatto = (index: number) => {
    setEditPiatti(prev => prev.filter((_, i) => i !== index))
  }

  const toggleAllergene = (index: number, allergeneId: string) => {
    setEditPiatti(prev =>
      prev.map((p, i) => {
        if (i !== index) return p
        const has = p.allergeni.includes(allergeneId)
        return { ...p, allergeni: has ? p.allergeni.filter(a => a !== allergeneId) : [...p.allergeni, allergeneId] }
      })
    )
  }

  // ─── Cambio tipo pasto nel modal: rigenera le categorie ─────────────────────

  const cambiaTipoPasto = (tipo: TipoPasto) => {
    setEditMenu(prev => prev ? { ...prev, tipoPasto: tipo } : prev)
    const categorie = categoriePerTipo(tipo)
    const piattiDefault: Piatto[] = categorie.flatMap((cat, ci) =>
      Array.from({ length: 3 }, (_, i) => ({
        categoria: cat,
        nome: '',
        descrizione: '',
        allergeni: [],
        prezzo: null,
        ordine: ci * 10 + i,
        disponibile: true,
      }))
    )
    setEditPiatti(piattiDefault)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-title-box">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-amber-500" />
            Gestione Menu {/* TODO: i18n */}
          </h1>
          <p className="text-sm text-gray-500">Crea e modifica i menu giornalieri per la tua struttura</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/host/ristorazione"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
          >
            <Eye className="w-4 h-4" /> Vedi scelte ospiti {/* TODO: i18n */}
          </Link>
          <button
            onClick={apriNuovoMenu}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuovo menu {/* TODO: i18n */}
          </button>
        </div>
      </div>

      {/* Filtri */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Struttura */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Struttura</label>
            <select
              value={filtroStruttura}
              onChange={e => setFiltroStruttura(e.target.value)}
              className="input text-sm min-w-[180px]"
            >
              {strutture.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Tipo pasto */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Pasto</label>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value as TipoPasto | '')}
              className="input text-sm min-w-[140px]"
            >
              <option value="">Tutti</option>
              <option value="COLAZIONE">Colazione</option>
              <option value="PRANZO">Pranzo</option>
              <option value="CENA">Cena</option>
            </select>
          </div>

          {/* Data */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase">Data</label>
            <input
              type="date"
              value={filtroData}
              onChange={e => setFiltroData(e.target.value)}
              className="input text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista menu */}
      {loading ? (
        <div className="card py-12 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : menus.length === 0 ? (
        <div className="card py-12 flex flex-col items-center gap-3 text-gray-300">
          <UtensilsCrossed className="w-10 h-10 opacity-30" />
          <p className="text-sm text-gray-400">Nessun menu trovato per questa data</p>
          <button onClick={apriNuovoMenu} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Crea il primo menu
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {menus.map(menu => {
            const Icon = TIPO_PASTO_ICON[menu.tipoPasto]
            return (
              <div key={menu.id} className={`card hover:shadow-md transition-shadow ${!menu.attivo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${TIPO_PASTO_COLOR[menu.tipoPasto]}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {menu.nome || TIPO_PASTO_LABEL[menu.tipoPasto]}
                      </p>
                      <p className="text-xs text-gray-500">
                        {menu.isTemplate
                          ? `Template — ${GIORNI_SETTIMANA[menu.giornoSettimana ?? 0]}`
                          : format(new Date(menu.data + 'T12:00'), 'd MMMM yyyy', { locale: it })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleAttivo(menu)}
                    title={menu.attivo ? 'Disattiva' : 'Attiva'}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {menu.attivo
                      ? <ToggleRight className="w-6 h-6 text-green-500" />
                      : <ToggleLeft className="w-6 h-6" />}
                  </button>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  {menu.piatti.length} piatti · {TIPO_PASTO_LABEL[menu.tipoPasto]}
                </p>

                {menu.note && (
                  <p className="text-xs text-gray-400 mb-3 italic truncate">{menu.note}</p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => apriModificaMenu(menu)}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Modifica
                  </button>
                  <span className="text-gray-200">|</span>
                  <button
                    onClick={() => eliminaMenu(menu.id)}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Elimina
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modal Crea / Modifica Menu ────────────────────────────────────────── */}
      {modalOpen && editMenu && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-8">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editMenu.id ? 'Modifica menu' : 'Nuovo menu'} {/* TODO: i18n */}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Metadati menu */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Struttura</label>
                  <select
                    value={editMenu.strutturaId || ''}
                    onChange={e => setEditMenu(prev => prev ? { ...prev, strutturaId: e.target.value } : prev)}
                    className="input text-sm w-full mt-1"
                  >
                    {strutture.map(s => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Tipo pasto</label>
                  <select
                    value={editMenu.tipoPasto || 'PRANZO'}
                    onChange={e => cambiaTipoPasto(e.target.value as TipoPasto)}
                    className="input text-sm w-full mt-1"
                    disabled={!!editMenu.id}
                  >
                    <option value="COLAZIONE">Colazione</option>
                    <option value="PRANZO">Pranzo</option>
                    <option value="CENA">Cena</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Data</label>
                  <input
                    type="date"
                    value={editMenu.data ? (editMenu.data.length > 10 ? editMenu.data.slice(0, 10) : editMenu.data) : ''}
                    onChange={e => setEditMenu(prev => prev ? { ...prev, data: e.target.value } : prev)}
                    className="input text-sm w-full mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase">Nome (opzionale)</label>
                  <input
                    type="text"
                    value={editMenu.nome || ''}
                    onChange={e => setEditMenu(prev => prev ? { ...prev, nome: e.target.value } : prev)}
                    placeholder="es. Menu del giorno"
                    className="input text-sm w-full mt-1"
                  />
                </div>
              </div>

              {/* Template ricorrente */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editMenu.isTemplate ?? false}
                    onChange={e => setEditMenu(prev => prev ? { ...prev, isTemplate: e.target.checked, giornoSettimana: e.target.checked ? 0 : null } : prev)}
                    className="rounded border-gray-300"
                  />
                  Menu template (ricorrente) {/* TODO: i18n */}
                </label>
                {editMenu.isTemplate && (
                  <select
                    value={editMenu.giornoSettimana ?? 0}
                    onChange={e => setEditMenu(prev => prev ? { ...prev, giornoSettimana: parseInt(e.target.value) } : prev)}
                    className="input text-sm"
                  >
                    {GIORNI_SETTIMANA.map((g, i) => (
                      <option key={i} value={i}>{g}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">Note (solo staff)</label>
                <textarea
                  value={editMenu.note || ''}
                  onChange={e => setEditMenu(prev => prev ? { ...prev, note: e.target.value } : prev)}
                  placeholder="Informazioni interne per lo staff cucina..."
                  className="input text-sm w-full mt-1"
                  rows={2}
                />
              </div>

              {/* ─── Piatti per categoria ─────────────────────────────────────── */}
              <div className="space-y-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b pb-2">
                  Piatti del menu {/* TODO: i18n */}
                </h3>

                {categoriePerTipo((editMenu.tipoPasto as TipoPasto) || 'PRANZO').map(categoria => {
                  const piattiCat = editPiatti
                    .map((p, i) => ({ ...p, _index: i }))
                    .filter(p => p.categoria === categoria)

                  return (
                    <CategoriaSection
                      key={categoria}
                      categoria={categoria}
                      piatti={piattiCat}
                      onAggiungi={() => aggiungiPiatto(categoria)}
                      onAggiorna={aggiornaPiatto}
                      onRimuovi={rimuoviPiatto}
                      onToggleAllergene={toggleAllergene}
                    />
                  )
                })}
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={salvaMenu}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editMenu.id ? 'Salva modifiche' : 'Crea menu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sezione categoria piatti ─────────────────────────────────────────────────

function CategoriaSection({
  categoria,
  piatti,
  onAggiungi,
  onAggiorna,
  onRimuovi,
  onToggleAllergene,
}: {
  categoria: CategoriaPiatto
  piatti: (Piatto & { _index: number })[]
  onAggiungi: () => void
  onAggiorna: (index: number, field: keyof Piatto, value: unknown) => void
  onRimuovi: (index: number) => void
  onToggleAllergene: (index: number, allergeneId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700">
          {CATEGORIA_LABEL[categoria]} ({piatti.filter(p => p.nome.trim()).length})
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {piatti.map((piatto) => (
            <PiattoRow
              key={piatto._index}
              piatto={piatto}
              index={piatto._index}
              onAggiorna={onAggiorna}
              onRimuovi={onRimuovi}
              onToggleAllergene={onToggleAllergene}
            />
          ))}

          <button
            onClick={onAggiungi}
            className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium mt-2"
          >
            <Plus className="w-3.5 h-3.5" /> Aggiungi piatto {/* TODO: i18n */}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Riga singolo piatto ──────────────────────────────────────────────────────

function PiattoRow({
  piatto,
  index,
  onAggiorna,
  onRimuovi,
  onToggleAllergene,
}: {
  piatto: Piatto & { _index: number }
  index: number
  onAggiorna: (index: number, field: keyof Piatto, value: unknown) => void
  onRimuovi: (index: number) => void
  onToggleAllergene: (index: number, allergeneId: string) => void
}) {
  const [showAllergeni, setShowAllergeni] = useState(false)

  return (
    <div className="border border-gray-100 rounded-lg p-3 bg-white hover:border-gray-200 transition-colors">
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-gray-300 mt-2.5 flex-shrink-0 cursor-grab" />

        <div className="flex-1 grid grid-cols-12 gap-2">
          {/* Nome */}
          <div className="col-span-5">
            <input
              type="text"
              value={piatto.nome}
              onChange={e => onAggiorna(index, 'nome', e.target.value)}
              placeholder="Nome piatto *"
              className="input text-sm w-full"
            />
          </div>

          {/* Descrizione */}
          <div className="col-span-4">
            <input
              type="text"
              value={piatto.descrizione || ''}
              onChange={e => onAggiorna(index, 'descrizione', e.target.value)}
              placeholder="Descrizione breve"
              className="input text-sm w-full"
            />
          </div>

          {/* Prezzo */}
          <div className="col-span-2">
            <input
              type="number"
              step="0.50"
              value={piatto.prezzo ?? ''}
              onChange={e => onAggiorna(index, 'prezzo', e.target.value ? parseFloat(e.target.value) : null)}
              placeholder="€ extra"
              className="input text-sm w-full"
            />
          </div>

          {/* Azioni */}
          <div className="col-span-1 flex items-center justify-end gap-1">
            <button
              onClick={() => setShowAllergeni(!showAllergeni)}
              title="Allergeni"
              className={`p-1 rounded hover:bg-gray-100 text-xs ${piatto.allergeni.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}
            >
              🏷️
            </button>
            <button
              onClick={() => onRimuovi(index)}
              title="Rimuovi"
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Allergeni chips */}
      {showAllergeni && (
        <div className="mt-2 ml-6 flex flex-wrap gap-1.5">
          {ALLERGENI_DISPONIBILI.map(a => {
            const selected = piatto.allergeni.includes(a.id)
            return (
              <button
                key={a.id}
                onClick={() => onToggleAllergene(index, a.id)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {a.emoji} {a.label}
              </button>
            )
          })}
        </div>
      )}

      {/* Allergeni selezionati (mini badges) */}
      {!showAllergeni && piatto.allergeni.length > 0 && (
        <div className="mt-1.5 ml-6 flex flex-wrap gap-1">
          {piatto.allergeni.map(aId => {
            const a = ALLERGENI_DISPONIBILI.find(x => x.id === aId)
            return a ? (
              <span key={aId} className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-600 border border-amber-200">
                {a.emoji} {a.label}
              </span>
            ) : null
          })}
        </div>
      )}
    </div>
  )
}
