'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Loader2, Save, BedDouble, User, FileText, Eye } from 'lucide-react'
import { ALIQUOTE_IVA } from '@/lib/iva'

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type PrenotazioneOpt = {
  id: string
  descrizione: string
  guestNome: string
  guestCognome: string
  guestEmail: string
  dataArrivo: string
  dataPartenza: string | null
  numOspiti: number
  prezzoTotale: number | null
  tassaSoggiorno: number | null
  unitaNome: string | null
  addebiti: { descrizione: string; quantita: number; prezzoUnitario: number; aliquotaIva: number }[]
}

type Riga = {
  id: string // tmp id client-side
  descrizione: string
  quantita: number
  prezzoUnitario: number
  iva: number
  naturaEsenzione?: string | null
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function NuovaFatturaForm({
  prenotazioni,
  prenotazioneIdIniziale,
}: {
  prenotazioni: PrenotazioneOpt[]
  prenotazioneIdIniziale: string | null
}) {
  const router = useRouter()
  const [sorgente, setSorgente] = useState<'prenotazione' | 'manuale'>(
    prenotazioneIdIniziale ? 'prenotazione' : 'manuale',
  )
  const [prenotazioneId, setPrenotazioneId] = useState<string>(prenotazioneIdIniziale ?? '')
  const [cliente, setCliente] = useState({
    nome: '',
    piva: '',
    cf: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    paese: 'Italia',
    email: '',
    pec: '',
    sdi: '',
  })
  const [righe, setRighe] = useState<Riga[]>([
    { id: crypto.randomUUID(), descrizione: '', quantita: 1, prezzoUnitario: 0, iva: 22 },
  ])
  const [dataScadenza, setDataScadenza] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [errore, setErrore] = useState('')

  // Precompilazione da prenotazione
  useEffect(() => {
    if (sorgente !== 'prenotazione' || !prenotazioneId) return
    const p = prenotazioni.find((x) => x.id === prenotazioneId)
    if (!p) return

    setCliente((c) => ({
      ...c,
      nome: `${p.guestCognome} ${p.guestNome}`.trim(),
      email: p.guestEmail,
    }))

    const newRighe: Riga[] = []

    // Soggiorno
    if (p.prezzoTotale && p.prezzoTotale > 0) {
      const notti = p.dataPartenza
        ? Math.max(1, Math.ceil((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))
        : 1
      newRighe.push({
        id: crypto.randomUUID(),
        descrizione: `${p.unitaNome ?? 'Soggiorno'} — ${notti} nott${notti === 1 ? 'e' : 'i'}`,
        quantita: notti,
        prezzoUnitario: Math.round((p.prezzoTotale / notti) * 100) / 100,
        iva: 10,
      })
    }

    // Addebiti extra
    for (const a of p.addebiti) {
      newRighe.push({
        id: crypto.randomUUID(),
        descrizione: a.descrizione,
        quantita: a.quantita,
        prezzoUnitario: a.prezzoUnitario,
        iva: a.aliquotaIva,
      })
    }

    // Tassa soggiorno (esente IVA - N1)
    if (p.tassaSoggiorno && p.tassaSoggiorno > 0) {
      const notti = p.dataPartenza
        ? Math.max(1, Math.ceil((new Date(p.dataPartenza).getTime() - new Date(p.dataArrivo).getTime()) / 86400000))
        : 1
      newRighe.push({
        id: crypto.randomUUID(),
        descrizione: 'Tassa di soggiorno',
        quantita: notti * p.numOspiti,
        prezzoUnitario: p.tassaSoggiorno,
        iva: 0,
        naturaEsenzione: 'N1',
      })
    }

    if (newRighe.length === 0) {
      newRighe.push({ id: crypto.randomUUID(), descrizione: 'Soggiorno', quantita: 1, prezzoUnitario: 0, iva: 10 })
    }
    setRighe(newRighe)
  }, [prenotazioneId, sorgente, prenotazioni])

  // Calcoli totali
  const totali = useMemo(() => {
    let imponibile = 0
    let iva = 0
    const perAliquota: Record<string, { imponibile: number; imposta: number; natura?: string | null }> = {}
    for (const r of righe) {
      const tot = r.quantita * r.prezzoUnitario
      const impostaRiga = tot * (r.iva / 100)
      imponibile += tot
      iva += impostaRiga
      const key = `${r.iva}_${r.naturaEsenzione ?? ''}`
      if (!perAliquota[key]) perAliquota[key] = { imponibile: 0, imposta: 0, natura: r.naturaEsenzione ?? null }
      perAliquota[key].imponibile += tot
      perAliquota[key].imposta += impostaRiga
    }
    imponibile = Math.round(imponibile * 100) / 100
    iva = Math.round(iva * 100) / 100
    const riepilogo = Object.entries(perAliquota).map(([key, v]) => ({
      aliquota: parseFloat(key.split('_')[0]),
      natura: v.natura,
      imponibile: Math.round(v.imponibile * 100) / 100,
      imposta: Math.round(v.imposta * 100) / 100,
    })).sort((a, b) => a.aliquota - b.aliquota)
    return { imponibile, iva, totale: Math.round((imponibile + iva) * 100) / 100, riepilogo }
  }, [righe])

  function addRiga() {
    setRighe((r) => [...r, { id: crypto.randomUUID(), descrizione: '', quantita: 1, prezzoUnitario: 0, iva: 22 }])
  }

  function updateRiga(id: string, patch: Partial<Riga>) {
    setRighe((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRiga(id: string) {
    setRighe((prev) => prev.filter((r) => r.id !== id))
  }

  async function salva() {
    setErrore('')
    if (righe.length === 0) { setErrore('Aggiungi almeno una riga'); return }
    if (righe.some((r) => !r.descrizione.trim())) { setErrore('Compila la descrizione di tutte le righe'); return }
    if (!cliente.nome.trim()) { setErrore('Nome cliente obbligatorio'); return }

    setSaving(true)

    // Modalità "da prenotazione": il server rigenera dalle prenotazione
    // Ma abbiamo gia' customizzato le righe qui — meglio chiamata manuale.
    const payload = {
      clienteNome: cliente.nome,
      clientePIva: cliente.piva || null,
      clienteCF: cliente.cf || null,
      clienteIndirizzo: cliente.indirizzo || null,
      clienteCitta: cliente.citta || null,
      clienteCap: cliente.cap || null,
      clienteProvincia: cliente.provincia || null,
      clientePaese: cliente.paese || 'Italia',
      clienteEmail: cliente.email || null,
      clientePec: cliente.pec || null,
      clienteSDI: cliente.sdi || null,
      righe: righe.map((r) => ({
        descrizione: r.descrizione,
        quantita: r.quantita,
        prezzoUnitario: r.prezzoUnitario,
        iva: r.iva,
      })),
      aliquotaIva: righe[0]?.iva ?? 22,
      dataScadenza: dataScadenza || null,
      note: note || null,
    }

    const res = await fetch('/api/host/fatture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setErrore(j.error || 'Errore salvataggio')
      setSaving(false)
      return
    }

    const fattura = await res.json()

    // Collega alla prenotazione se applicabile
    if (sorgente === 'prenotazione' && prenotazioneId) {
      await fetch(`/api/host/prenotazioni/${prenotazioneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fatturaId: fattura.id }),
      }).catch(() => { /* non bloccante */ })
    }

    router.push(`/host/fatture/${fattura.id}`)
  }

  function anteprimaPdf() {
    // Salva una bozza + apri PDF in nuova tab
    setErrore('Salva la fattura prima di generare il PDF.')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Colonna sinistra (2/3): form ── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Sorgente */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-brand-500" />
            <h2 className="text-base font-bold text-gray-900">Tipo fattura</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSorgente('prenotazione')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                sorgente === 'prenotazione' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <BedDouble className="w-5 h-5 text-brand-500 mb-2" />
              <p className="font-semibold text-gray-900">Da prenotazione</p>
              <p className="text-xs text-gray-500 mt-0.5">Precompila con dati soggiorno + addebiti + tassa</p>
            </button>
            <button
              type="button"
              onClick={() => setSorgente('manuale')}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                sorgente === 'manuale' ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <FileText className="w-5 h-5 text-brand-500 mb-2" />
              <p className="font-semibold text-gray-900">Manuale</p>
              <p className="text-xs text-gray-500 mt-0.5">Inserisci righe e cliente liberamente</p>
            </button>
          </div>

          {sorgente === 'prenotazione' && (
            <div className="mt-4">
              <label className="label">Seleziona prenotazione</label>
              <select
                value={prenotazioneId}
                onChange={(e) => setPrenotazioneId(e.target.value)}
                className="input"
              >
                <option value="">— seleziona —</option>
                {prenotazioni.map((p) => (
                  <option key={p.id} value={p.id}>{p.descrizione}</option>
                ))}
              </select>
              {prenotazioni.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Nessuna prenotazione non ancora fatturata.</p>
              )}
            </div>
          )}
        </div>

        {/* Cliente */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-brand-500" />
            <h2 className="text-base font-bold text-gray-900">Cliente</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Denominazione / Ragione sociale *</label>
              <input
                type="text"
                value={cliente.nome}
                onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                className="input"
                placeholder="Nome cognome (privato) oppure ragione sociale"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">P.IVA</label>
                <input type="text" value={cliente.piva} onChange={(e) => setCliente({ ...cliente, piva: e.target.value })} className="input" placeholder="IT12345678901" />
              </div>
              <div>
                <label className="label">Codice Fiscale</label>
                <input type="text" value={cliente.cf} onChange={(e) => setCliente({ ...cliente, cf: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Indirizzo</label>
              <input type="text" value={cliente.indirizzo} onChange={(e) => setCliente({ ...cliente, indirizzo: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">CAP</label>
                <input type="text" value={cliente.cap} onChange={(e) => setCliente({ ...cliente, cap: e.target.value })} className="input" maxLength={5} />
              </div>
              <div>
                <label className="label">Città</label>
                <input type="text" value={cliente.citta} onChange={(e) => setCliente({ ...cliente, citta: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Prov.</label>
                <input type="text" value={cliente.provincia} onChange={(e) => setCliente({ ...cliente, provincia: e.target.value })} className="input" maxLength={2} placeholder="MI" />
              </div>
            </div>
            <div>
              <label className="label">Paese</label>
              <input type="text" value={cliente.paese} onChange={(e) => setCliente({ ...cliente, paese: e.target.value })} className="input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Email</label>
                <input type="email" value={cliente.email} onChange={(e) => setCliente({ ...cliente, email: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">PEC</label>
                <input type="email" value={cliente.pec} onChange={(e) => setCliente({ ...cliente, pec: e.target.value })} className="input" />
              </div>
            </div>
            <div>
              <label className="label">Codice destinatario SDI (7 caratteri)</label>
              <input type="text" value={cliente.sdi} onChange={(e) => setCliente({ ...cliente, sdi: e.target.value })} className="input font-mono" maxLength={7} placeholder="es. ABCDEFG — lascia vuoto per privato (uso PEC)" />
              <p className="text-[11px] text-gray-400 mt-1">Se il cliente non ha SDI né PEC il sistema usa &quot;0000000&quot;.</p>
            </div>
          </div>
        </div>

        {/* Righe */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-gray-900">Righe fattura</h2>
            </div>
            <button type="button" onClick={addRiga} className="text-sm px-2.5 py-1.5 rounded bg-brand-50 text-brand-700 hover:bg-brand-100 flex items-center gap-1 font-medium">
              <Plus className="w-3.5 h-3.5" /> Aggiungi riga
            </button>
          </div>

          <div className="space-y-2">
            {righe.map((r, idx) => {
              const totale = r.quantita * r.prezzoUnitario
              return (
                <div key={r.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 md:col-span-5">
                    <input
                      type="text"
                      value={r.descrizione}
                      onChange={(e) => updateRiga(r.id, { descrizione: e.target.value })}
                      placeholder={`Descrizione riga ${idx + 1}`}
                      className="input"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-1">
                    <input
                      type="number"
                      min={0} step={0.5}
                      value={r.quantita}
                      onChange={(e) => updateRiga(r.id, { quantita: parseFloat(e.target.value) || 0 })}
                      className="input text-center"
                      placeholder="Qta"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      min={0} step={0.01}
                      value={r.prezzoUnitario}
                      onChange={(e) => updateRiga(r.id, { prezzoUnitario: parseFloat(e.target.value) || 0 })}
                      className="input text-right"
                      placeholder="€"
                    />
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <select
                      value={r.iva}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        updateRiga(r.id, {
                          iva: v,
                          naturaEsenzione: v === 0 ? (r.naturaEsenzione ?? 'N4') : null,
                        })
                      }}
                      className="input"
                    >
                      {ALIQUOTE_IVA.map((a) => (
                        <option key={a.valore} value={a.valore}>
                          {a.valore === 0 ? 'Esente' : `${a.valore}%`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-center justify-end text-sm font-semibold text-gray-800 pt-2">
                    €{totale.toFixed(2)}
                  </div>
                  <div className="col-span-12 md:col-span-1 flex items-start">
                    <button
                      type="button"
                      onClick={() => removeRiga(r.id)}
                      disabled={righe.length === 1}
                      className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30"
                      title="Rimuovi riga"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dati extra */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-900 mb-3">Dati aggiuntivi</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Data scadenza pagamento</label>
              <input type="date" value={dataScadenza} onChange={(e) => setDataScadenza(e.target.value)} className="input" />
            </div>
            <div>
              <label className="label">Note</label>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="Es. grazie per aver scelto la nostra struttura" />
            </div>
          </div>
        </div>

        {errore && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{errore}</div>
        )}

        <div className="flex gap-3 sticky bottom-4 bg-white p-3 rounded-lg shadow border border-gray-100">
          <button
            onClick={salva}
            disabled={saving}
            className="flex-1 btn-primary flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salva bozza
          </button>
          <button
            onClick={anteprimaPdf}
            disabled
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            title="Disponibile dopo il salvataggio"
          >
            <Eye className="w-4 h-4" /> Anteprima PDF
          </button>
        </div>
      </div>

      {/* ── Colonna destra (1/3): riepilogo ── */}
      <div className="space-y-4">
        <div className="card sticky top-4">
          <h3 className="text-base font-bold text-gray-900 mb-3">Riepilogo</h3>

          <div className="space-y-2 text-sm">
            {totali.riepilogo.length > 1 && (
              <div className="pb-2 border-b border-gray-100 space-y-1">
                {totali.riepilogo.map((r) => (
                  <div key={`${r.aliquota}_${r.natura ?? ''}`} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {r.aliquota === 0 ? `Esente (${r.natura ?? 'N4'})` : `IVA ${r.aliquota}%`}
                    </span>
                    <span className="font-mono text-gray-700">€{r.imponibile.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Imponibile</span>
              <span className="font-mono font-semibold">€{totali.imponibile.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">IVA</span>
              <span className="font-mono font-semibold">€{totali.iva.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Totale</span>
              <span className="font-mono font-bold text-lg text-brand-600">€{totali.totale.toFixed(2)}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-4 pt-3 border-t border-gray-100">
            Il numero fattura viene assegnato automaticamente al salvataggio (progressivo per anno).
            La fattura sara&apos; creata in stato <strong>BOZZA</strong>. Da lì potrai generare il PDF,
            inviarla al SDI e marcarla pagata.
          </p>
        </div>
      </div>
    </div>
  )
}
