'use client'

import { useState, useMemo, useCallback, type ReactNode } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyState } from './empty-state'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  /** 'high'=always, 'medium'=tablet+, 'low'=desktop only */
  priority?: 'high' | 'medium' | 'low'
  width?: string
  render?: (row: T, index: number) => ReactNode
}

interface PaginationConfig {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number, pageSize: number) => void
}

interface Props<T extends { id?: string }> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyState?: { icon?: string; titolo: string; descrizione?: string }
  onRowClick?: (row: T) => void
  selectable?: boolean
  onSelectionChange?: (ids: string[]) => void
  bulkActions?: ReactNode
  pagination?: PaginationConfig
  defaultSort?: { key: string; direction: 'asc' | 'desc' }
  rowKey?: (row: T) => string
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DataTable<T extends { id?: string }>({
  columns, data, loading, emptyState, onRowClick,
  selectable, onSelectionChange, bulkActions,
  pagination, defaultSort, rowKey,
}: Props<T>) {
  const [sort, setSort] = useState(defaultSort ?? null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const getKey = useCallback((row: T, i: number) => rowKey?.(row) || (row as { id?: string }).id || String(i), [rowKey])

  // ── Sort ──
  const sorted = useMemo(() => {
    if (!sort) return data
    const { key, direction } = sort
    return [...data].sort((a, b) => {
      const av = (a as Record<string, unknown>)[key]
      const bv = (b as Record<string, unknown>)[key]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const diff = (av as number) - (bv as number)
      return direction === 'asc' ? diff : -diff
    })
  }, [data, sort])

  function toggleSort(key: string) {
    setSort(prev => {
      if (prev?.key !== key) return { key, direction: 'asc' }
      if (prev.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  // ── Selection ──
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      onSelectionChange?.(Array.from(next))
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set())
      onSelectionChange?.([])
    } else {
      const all = new Set(sorted.map((r, i) => getKey(r, i)))
      setSelected(all)
      onSelectionChange?.(Array.from(all))
    }
  }

  const allSelected = sorted.length > 0 && selected.size === sorted.length

  // ── Priority visibility classes ──
  function prioClass(p?: string) {
    if (p === 'low') return 'hidden lg:table-cell'
    if (p === 'medium') return 'hidden md:table-cell'
    return ''
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden">
        <div className="divide-y divide-[var(--border-default)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="skeleton h-4 flex-1" />
              <div className="skeleton h-4 w-20" />
              <div className="skeleton h-4 w-16 hidden md:block" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Empty ──
  if (sorted.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <EmptyState
          icon={emptyState?.icon}
          titolo={emptyState?.titolo ?? 'Nessun dato'}
          descrizione={emptyState?.descrizione}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Bulk actions bar */}
      {selectable && selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 mb-2 rounded-[var(--radius-lg)] bg-brand-50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-800">
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            {selected.size} selezionat{selected.size === 1 ? 'o' : 'i'}
          </span>
          <div className="flex-1" />
          {bulkActions}
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="hidden md:block rounded-[var(--radius-lg)] border border-[var(--border-default)] overflow-hidden bg-[var(--bg-elevated)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {selectable && (
                <th className="table-th w-10 pl-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-[var(--border-default)]" />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn('table-th', prioClass(col.priority), col.sortable && 'cursor-pointer select-none hover:text-[var(--text-primary)]')}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  aria-sort={col.sortable ? (sort?.key === col.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sort?.key === col.key
                        ? sort.direction === 'asc'
                          ? <ChevronUp size={12} />
                          : <ChevronDown size={12} />
                        : <ChevronsUpDown size={12} className="opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-default)]">
            {sorted.map((row, i) => {
              const key = getKey(row, i)
              const isSelected = selected.has(key)
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected
                      ? 'bg-brand-50/50 dark:bg-brand-950/10'
                      : 'hover:bg-[var(--bg-secondary)]',
                  )}
                >
                  {selectable && (
                    <td className="table-td w-10 pl-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleSelect(key)}
                        className="w-4 h-4 rounded border-[var(--border-default)]" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={cn('table-td', prioClass(col.priority))}>
                      {col.render
                        ? col.render(row, i)
                        : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards ── */}
      <div className="md:hidden space-y-2" role="list">
        {sorted.map((row, i) => {
          const key = getKey(row, i)
          const highCols = columns.filter(c => c.priority !== 'low' && c.priority !== 'medium')
          const isSelected = selected.has(key)

          return (
            <div
              key={key}
              role="listitem"
              onClick={() => onRowClick?.(row)}
              className={cn(
                'rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3.5',
                'transition-colors',
                onRowClick && 'cursor-pointer active:bg-[var(--bg-secondary)]',
                isSelected && 'border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-950/10',
              )}
            >
              {selectable && (
                <div className="flex justify-end mb-1" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(key)}
                    className="w-4 h-4 rounded border-[var(--border-default)]" />
                </div>
              )}
              {highCols.map(col => (
                <div key={col.key} className="py-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    {col.label}
                  </span>
                  <div className="text-sm text-[var(--text-primary)]">
                    {col.render ? col.render(row, i) : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {/* ── Pagination ── */}
      {pagination && (
        <Pagination {...pagination} />
      )}
    </div>
  )
}

// ─── Pagination ─────────────────────────────────────────────────────────────

function Pagination({ page, pageSize, total, onPageChange }: PaginationConfig) {
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between mt-3 px-1">
      <span className="text-xs text-[var(--text-secondary)]">
        {from}-{to} di {total}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={pageSize}
          onChange={e => onPageChange(1, Number(e.target.value))}
          className="text-xs border border-[var(--border-default)] rounded-[var(--radius-md)] px-2 py-1 bg-[var(--bg-primary)] text-[var(--text-primary)]"
        >
          {[20, 50, 100].map(n => (
            <option key={n} value={n}>{n} / pagina</option>
          ))}
        </select>
        <button
          onClick={() => onPageChange(page - 1, pageSize)}
          disabled={page <= 1}
          className="btn-icon disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-xs font-medium text-[var(--text-primary)] tabular-nums">
          {page}/{totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1, pageSize)}
          disabled={page >= totalPages}
          className="btn-icon disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
