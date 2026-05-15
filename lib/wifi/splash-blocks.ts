/**
 * Splash page blocks — sezioni opzionali inserite tra hero e form.
 * Permettono customizzazione drag-drop senza un full WYSIWYG.
 */

export type BlockType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button-link'
  | 'divider'
  | 'contact-info'

export interface BaseBlock {
  id: string  // uuid stabile, generato client-side
  type: BlockType
}

export interface HeadingBlock extends BaseBlock {
  type: 'heading'
  text: string
  size?: 'sm' | 'md' | 'lg'  // h3/h2/h1 equivalent
  align?: 'left' | 'center' | 'right'
}

export interface ParagraphBlock extends BaseBlock {
  type: 'paragraph'
  text: string
  align?: 'left' | 'center' | 'right'
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string  // URL o data URI
  alt?: string
  maxHeight?: number  // px (default 200)
  rounded?: boolean
}

export interface ButtonLinkBlock extends BaseBlock {
  type: 'button-link'
  text: string
  url: string
  variant?: 'primary' | 'outline'
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
}

export interface ContactInfoBlock extends BaseBlock {
  type: 'contact-info'
  telefono?: string
  email?: string
  indirizzo?: string
}

export type Block =
  | HeadingBlock | ParagraphBlock | ImageBlock
  | ButtonLinkBlock | DividerBlock | ContactInfoBlock

export interface BlockTypeMeta {
  type: BlockType
  label: string
  icon: string
  description: string
  defaultProps: () => Omit<Block, 'id'>
}

export const BLOCK_TYPES: BlockTypeMeta[] = [
  {
    type: 'heading',
    label: 'Titolo',
    icon: '📰',
    description: 'Intestazione di sezione',
    defaultProps: () => ({ type: 'heading', text: 'Nuovo titolo', size: 'md', align: 'center' }),
  },
  {
    type: 'paragraph',
    label: 'Paragrafo',
    icon: '📝',
    description: 'Blocco di testo',
    defaultProps: () => ({ type: 'paragraph', text: 'Inserisci qui il tuo testo.', align: 'center' }),
  },
  {
    type: 'image',
    label: 'Immagine',
    icon: '🖼️',
    description: 'Foto o illustrazione',
    defaultProps: () => ({ type: 'image', src: '', alt: '', maxHeight: 200, rounded: true }),
  },
  {
    type: 'button-link',
    label: 'Bottone link',
    icon: '🔘',
    description: 'CTA verso URL esterno',
    defaultProps: () => ({ type: 'button-link', text: 'Scopri di più', url: '', variant: 'outline' }),
  },
  {
    type: 'divider',
    label: 'Separatore',
    icon: '➖',
    description: 'Linea orizzontale',
    defaultProps: () => ({ type: 'divider' }),
  },
  {
    type: 'contact-info',
    label: 'Contatti',
    icon: '📞',
    description: 'Tel / email / indirizzo',
    defaultProps: () => ({ type: 'contact-info', telefono: '', email: '', indirizzo: '' }),
  },
]

export function makeBlockId(): string {
  return 'b-' + Math.random().toString(36).slice(2, 10)
}

export function createBlock(type: BlockType): Block {
  const meta = BLOCK_TYPES.find(b => b.type === type)
  if (!meta) throw new Error(`Unknown block type: ${type}`)
  return { ...meta.defaultProps(), id: makeBlockId() } as Block
}

// ─── Renderers (block → HTML stringa) ────────────────────────────────────

function esc(s: string | undefined): string {
  if (!s) return ''
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function renderBlock(block: Block, ctx: { colorePrimario: string; coloreTesto: string }): string {
  switch (block.type) {
    case 'heading': {
      const sizeStyle = { sm: '16px', md: '20px', lg: '26px' }[block.size ?? 'md']
      const align = block.align ?? 'center'
      return `<div class="otium-block otium-heading" style="text-align:${align};margin:18px 0 8px;">
        <div style="font-size:${sizeStyle};font-weight:700;color:${esc(ctx.coloreTesto)};line-height:1.3;">${esc(block.text)}</div>
      </div>`
    }
    case 'paragraph': {
      const align = block.align ?? 'center'
      return `<div class="otium-block otium-paragraph" style="text-align:${align};margin:12px 0;font-size:14px;color:${esc(ctx.coloreTesto)};opacity:0.8;line-height:1.5;">${esc(block.text)}</div>`
    }
    case 'image': {
      if (!block.src) return ''
      const radius = block.rounded ? '12px' : '0'
      const h = block.maxHeight ?? 200
      return `<div class="otium-block otium-image" style="margin:14px 0;text-align:center;">
        <img src="${esc(block.src)}" alt="${esc(block.alt)}" style="max-height:${h}px;max-width:100%;border-radius:${radius};display:inline-block;">
      </div>`
    }
    case 'button-link': {
      if (!block.url) return ''
      const isPrimary = block.variant === 'primary'
      const style = isPrimary
        ? `background:${esc(ctx.colorePrimario)};color:#fff;`
        : `background:transparent;color:${esc(ctx.colorePrimario)};border:2px solid ${esc(ctx.colorePrimario)};`
      return `<div class="otium-block otium-button-link" style="margin:14px 0;text-align:center;">
        <a href="${esc(block.url)}" target="_blank" rel="noopener" style="${style}display:inline-block;padding:10px 22px;border-radius:9px;text-decoration:none;font-weight:600;font-size:14px;">${esc(block.text)}</a>
      </div>`
    }
    case 'divider': {
      return `<div class="otium-block otium-divider" style="margin:18px 0;border-top:1px solid rgba(0,0,0,0.08);"></div>`
    }
    case 'contact-info': {
      const items: string[] = []
      if (block.telefono) items.push(`📞 <a href="tel:${esc(block.telefono)}" style="color:${esc(ctx.colorePrimario)};text-decoration:none;">${esc(block.telefono)}</a>`)
      if (block.email) items.push(`✉️ <a href="mailto:${esc(block.email)}" style="color:${esc(ctx.colorePrimario)};text-decoration:none;">${esc(block.email)}</a>`)
      if (block.indirizzo) items.push(`📍 ${esc(block.indirizzo)}`)
      if (items.length === 0) return ''
      return `<div class="otium-block otium-contact-info" style="margin:16px 0;text-align:center;font-size:13px;color:${esc(ctx.coloreTesto)};line-height:1.8;">${items.join('<br>')}</div>`
    }
    default: return ''
  }
}

export function renderBlocks(blocks: Block[] | undefined, ctx: { colorePrimario: string; coloreTesto: string }): string {
  if (!blocks || blocks.length === 0) return ''
  return blocks.map(b => renderBlock(b, ctx)).join('\n')
}
