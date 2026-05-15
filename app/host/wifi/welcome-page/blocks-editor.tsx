'use client'

import { useState } from 'react'
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Block, BlockType, HeadingBlock, ParagraphBlock, ImageBlock, ButtonLinkBlock, ContactInfoBlock } from '@/lib/wifi/splash-blocks'
import { BLOCK_TYPES, createBlock } from '@/lib/wifi/splash-blocks'
import ImageUploadField from './image-upload-field'

interface Props {
  blocks: Block[]
  onChange: (next: Block[]) => void
}

export default function BlocksEditor({ blocks, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = blocks.findIndex(b => b.id === active.id)
    const newIdx = blocks.findIndex(b => b.id === over.id)
    if (oldIdx >= 0 && newIdx >= 0) onChange(arrayMove(blocks, oldIdx, newIdx))
  }

  function addBlock(type: BlockType) {
    const b = createBlock(type)
    onChange([...blocks, b])
    setPickerOpen(false)
    setExpandedId(b.id)
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    onChange(blocks.map(b => b.id === id ? { ...b, ...patch } as Block : b))
  }

  function removeBlock(id: string) {
    onChange(blocks.filter(b => b.id !== id))
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Blocchi personalizzati</h2>
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
        >
          {pickerOpen ? '✕ Chiudi' : '+ Aggiungi blocco'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Sezioni opzionali tra l&apos;header e il form. Trascina per riordinare.
      </p>

      {pickerOpen && (
        <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
          {BLOCK_TYPES.map(t => (
            <button
              key={t.type}
              type="button"
              onClick={() => addBlock(t.type)}
              className="p-3 bg-white border rounded-lg hover:border-indigo-400 text-left transition-colors"
            >
              <div className="text-xl mb-1">{t.icon}</div>
              <div className="text-xs font-medium">{t.label}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{t.description}</div>
            </button>
          ))}
        </div>
      )}

      {blocks.length === 0 && !pickerOpen ? (
        <div className="text-center py-8 border-2 border-dashed rounded-lg text-sm text-gray-500">
          Nessun blocco personalizzato. Premi <strong>+ Aggiungi blocco</strong> per iniziare.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  isExpanded={expandedId === block.id}
                  onToggle={() => setExpandedId(expandedId === block.id ? null : block.id)}
                  onChange={patch => updateBlock(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

// ─── Single sortable block ──────────────────────────────────────────────

function SortableBlock({
  block, isExpanded, onToggle, onChange, onRemove,
}: {
  block: Block
  isExpanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<Block>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const meta = BLOCK_TYPES.find(t => t.type === block.type)!
  const summary = blockSummary(block)

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-2 py-2 bg-gray-50">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600" type="button">
          ⠿
        </button>
        <button type="button" onClick={onToggle} className="flex-1 text-left flex items-center gap-2 min-w-0">
          <span className="text-lg">{meta.icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-medium">{meta.label}</div>
            <div className="text-xs text-gray-500 truncate">{summary}</div>
          </div>
        </button>
        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700 text-sm px-2" title="Elimina">
          🗑
        </button>
      </div>
      {isExpanded && (
        <div className="p-3 border-t bg-white space-y-2">
          <BlockEditor block={block} onChange={onChange} />
        </div>
      )}
    </div>
  )
}

function blockSummary(b: Block): string {
  switch (b.type) {
    case 'heading': return b.text || '(vuoto)'
    case 'paragraph': return b.text.slice(0, 60) + (b.text.length > 60 ? '…' : '')
    case 'image': return b.src ? (b.src.startsWith('data:') ? 'Immagine caricata' : b.src) : '(nessuna immagine)'
    case 'button-link': return `${b.text} → ${b.url || '(no url)'}`
    case 'divider': return '(linea orizzontale)'
    case 'contact-info': return [b.telefono, b.email, b.indirizzo].filter(Boolean).join(' · ') || '(vuoto)'
  }
}

// ─── Property panel per ogni tipo ──────────────────────────────────────

function BlockEditor({ block, onChange }: { block: Block; onChange: (p: Partial<Block>) => void }) {
  switch (block.type) {
    case 'heading': return <HeadingEditor block={block} onChange={onChange} />
    case 'paragraph': return <ParagraphEditor block={block} onChange={onChange} />
    case 'image': return <ImageEditor block={block} onChange={onChange} />
    case 'button-link': return <ButtonEditor block={block} onChange={onChange} />
    case 'divider': return <div className="text-xs text-gray-500">Nessuna opzione</div>
    case 'contact-info': return <ContactEditor block={block} onChange={onChange} />
  }
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

function HeadingEditor({ block, onChange }: { block: HeadingBlock; onChange: (p: Partial<HeadingBlock>) => void }) {
  return (
    <>
      <MiniField label="Testo">
        <input type="text" value={block.text} onChange={e => onChange({ text: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
      <div className="grid grid-cols-2 gap-2">
        <MiniField label="Dimensione">
          <select value={block.size ?? 'md'} onChange={e => onChange({ size: e.target.value as HeadingBlock['size'] })} className="w-full px-2 py-1.5 border rounded text-sm">
            <option value="sm">Piccolo</option>
            <option value="md">Medio</option>
            <option value="lg">Grande</option>
          </select>
        </MiniField>
        <MiniField label="Allineamento">
          <select value={block.align ?? 'center'} onChange={e => onChange({ align: e.target.value as HeadingBlock['align'] })} className="w-full px-2 py-1.5 border rounded text-sm">
            <option value="left">Sinistra</option>
            <option value="center">Centro</option>
            <option value="right">Destra</option>
          </select>
        </MiniField>
      </div>
    </>
  )
}

function ParagraphEditor({ block, onChange }: { block: ParagraphBlock; onChange: (p: Partial<ParagraphBlock>) => void }) {
  return (
    <>
      <MiniField label="Testo">
        <textarea value={block.text} onChange={e => onChange({ text: e.target.value })} rows={3} className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
      <MiniField label="Allineamento">
        <select value={block.align ?? 'center'} onChange={e => onChange({ align: e.target.value as ParagraphBlock['align'] })} className="w-full px-2 py-1.5 border rounded text-sm">
          <option value="left">Sinistra</option>
          <option value="center">Centro</option>
          <option value="right">Destra</option>
        </select>
      </MiniField>
    </>
  )
}

function ImageEditor({ block, onChange }: { block: ImageBlock; onChange: (p: Partial<ImageBlock>) => void }) {
  return (
    <>
      <ImageUploadField
        label="Immagine"
        value={block.src}
        onChange={v => onChange({ src: v })}
        kind="background"
        hint="JPG/PNG, max 10 MB"
      />
      <MiniField label="Testo alternativo (alt)">
        <input type="text" value={block.alt ?? ''} onChange={e => onChange({ alt: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
      <div className="grid grid-cols-2 gap-2">
        <MiniField label="Altezza max (px)">
          <input type="number" value={block.maxHeight ?? 200} onChange={e => onChange({ maxHeight: Number(e.target.value) })} min={50} max={600} className="w-full px-2 py-1.5 border rounded text-sm" />
        </MiniField>
        <label className="flex items-end gap-2 pb-1 cursor-pointer">
          <input type="checkbox" checked={block.rounded ?? true} onChange={e => onChange({ rounded: e.target.checked })} />
          <span className="text-sm">Angoli arrotondati</span>
        </label>
      </div>
    </>
  )
}

function ButtonEditor({ block, onChange }: { block: ButtonLinkBlock; onChange: (p: Partial<ButtonLinkBlock>) => void }) {
  return (
    <>
      <MiniField label="Testo bottone">
        <input type="text" value={block.text} onChange={e => onChange({ text: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
      <MiniField label="URL">
        <input type="text" value={block.url} onChange={e => onChange({ url: e.target.value })} placeholder="https://..." className="w-full px-2 py-1.5 border rounded text-sm font-mono" />
      </MiniField>
      <MiniField label="Stile">
        <select value={block.variant ?? 'outline'} onChange={e => onChange({ variant: e.target.value as ButtonLinkBlock['variant'] })} className="w-full px-2 py-1.5 border rounded text-sm">
          <option value="outline">Outline (contorno)</option>
          <option value="primary">Primario (riempito)</option>
        </select>
      </MiniField>
    </>
  )
}

function ContactEditor({ block, onChange }: { block: ContactInfoBlock; onChange: (p: Partial<ContactInfoBlock>) => void }) {
  return (
    <>
      <MiniField label="Telefono">
        <input type="tel" value={block.telefono ?? ''} onChange={e => onChange({ telefono: e.target.value })} placeholder="+39 ..." className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
      <MiniField label="Email">
        <input type="email" value={block.email ?? ''} onChange={e => onChange({ email: e.target.value })} placeholder="info@..." className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
      <MiniField label="Indirizzo">
        <input type="text" value={block.indirizzo ?? ''} onChange={e => onChange({ indirizzo: e.target.value })} placeholder="Via ..., Città" className="w-full px-2 py-1.5 border rounded text-sm" />
      </MiniField>
    </>
  )
}
