/**
 * Select — custom popover con opzioni styled.
 *
 * API:
 *   <Select
 *     value={v}
 *     onChange={setV}
 *     options={[{ value: 'a', label: 'Opzione A' }, ...]}
 *     placeholder="Seleziona…"
 *   />
 *
 * Perché custom e non nativo: il nativo <select> rende il dropdown con lo
 * stile dell'OS — non possiamo styled option hover/selected/animazione.
 *
 * Accessibilità: trigger ha role="combobox" + aria-expanded. Dropdown ha
 * role="listbox", opzioni role="option" + aria-selected. Click outside
 * chiude. Keyboard: Escape chiude, Arrow su/giù navigano, Enter seleziona.
 */
'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ButtonHTMLAttributes,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SelectOption<T extends string = string> = {
  value: T
  label: string
  disabled?: boolean
}

export type SelectProps<T extends string = string> = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'value' | 'defaultValue'
> & {
  value?: T | null
  defaultValue?: T
  onChange?: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  inputSize?: 'sm' | 'md' | 'lg'
  error?: boolean
  fullWidth?: boolean
}

const SIZE_CLASSES = {
  sm: 'h-9 text-[13px]',
  md: 'h-10 text-[14px]',
  lg: 'h-11 text-[15px]',
} as const

export const Select = forwardRef<HTMLButtonElement, SelectProps<string>>(
  function Select(
    {
      value,
      defaultValue,
      onChange,
      options,
      placeholder = 'Seleziona…',
      inputSize = 'md',
      error,
      fullWidth,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const [internalValue, setInternalValue] = useState<string | null>(defaultValue ?? null)
    const isControlled = value !== undefined
    const current = isControlled ? value : internalValue

    const [open, setOpen] = useState(false)
    const [focusedIdx, setFocusedIdx] = useState<number>(-1)

    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const listRef = useRef<HTMLUListElement | null>(null)
    const listboxId = useId()

    // Merge refs
    const setTriggerRef = useCallback((node: HTMLButtonElement | null) => {
      triggerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
    }, [ref])

    // Click outside to close
    useEffect(() => {
      if (!open) return
      function onDocClick(e: MouseEvent) {
        const target = e.target as Node
        if (triggerRef.current?.contains(target)) return
        if (listRef.current?.contains(target)) return
        setOpen(false)
      }
      document.addEventListener('mousedown', onDocClick)
      return () => document.removeEventListener('mousedown', onDocClick)
    }, [open])

    // Reset focused index when opening
    useEffect(() => {
      if (open) {
        const currentIdx = options.findIndex((o) => o.value === current)
        setFocusedIdx(currentIdx >= 0 ? currentIdx : 0)
      }
    }, [open, current, options])

    const selectedOption = options.find((o) => o.value === current)

    function commit(val: string) {
      if (!isControlled) setInternalValue(val)
      onChange?.(val)
      setOpen(false)
      triggerRef.current?.focus()
    }

    function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
      if (disabled) return
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIdx((i) => {
          let next = i + 1
          while (next < options.length && options[next].disabled) next++
          return next >= options.length ? i : next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIdx((i) => {
          let next = i - 1
          while (next >= 0 && options[next].disabled) next--
          return next < 0 ? i : next
        })
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const opt = options[focusedIdx]
        if (opt && !opt.disabled) commit(opt.value)
      } else if (e.key === 'Home') {
        e.preventDefault()
        setFocusedIdx(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        setFocusedIdx(options.length - 1)
      }
    }

    return (
      <div className={cn('relative inline-block', fullWidth && 'w-full')}>
        <button
          ref={setTriggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          aria-invalid={error || undefined}
          disabled={disabled}
          onClick={() => !disabled && setOpen((v) => !v)}
          onKeyDown={onTriggerKeyDown}
          className={cn(
            'w-full flex items-center gap-2 pl-3 pr-2 bg-white rounded-md border text-left',
            'transition-[border-color,box-shadow] duration-fast ease-out',
            SIZE_CLASSES[inputSize],

            !error && 'border-neutral-200 hover:border-neutral-300 hover:shadow-xs',
            !error && 'focus-visible:outline-none focus-visible:border-primary-500 focus-visible:shadow-focus',
            !error && open && 'border-primary-500 shadow-focus',

            error && 'border-error-500 focus-visible:outline-none focus-visible:shadow-focus-error',

            'disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed',
            className,
          )}
          {...rest}
        >
          <span className={cn('flex-1 truncate', !selectedOption && 'text-neutral-400')}>
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'w-4 h-4 text-neutral-400 shrink-0 transition-transform duration-fast',
              open && 'rotate-180',
            )}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={onListKeyDown}
            autoFocus
            className={cn(
              'absolute left-0 right-0 top-full z-20 mt-1.5',
              'bg-white rounded-lg border border-neutral-200 shadow-lg',
              'max-h-[200px] overflow-y-auto py-1',
              'origin-top animate-[selectIn_120ms_cubic-bezier(0.16,1,0.3,1)_both]',
            )}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === current
              const isFocused = idx === focusedIdx
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  data-focused={isFocused || undefined}
                  onMouseEnter={() => !opt.disabled && setFocusedIdx(idx)}
                  onClick={() => !opt.disabled && commit(opt.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-[14px] cursor-pointer',
                    'transition-colors duration-fast',
                    opt.disabled && 'text-neutral-300 cursor-not-allowed',
                    !opt.disabled && !isSelected && 'text-neutral-700 hover:bg-primary-50 data-[focused]:bg-primary-50',
                    !opt.disabled && isSelected && 'bg-primary-100 text-primary-900 font-medium data-[focused]:bg-primary-100',
                  )}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && <Check aria-hidden="true" className="w-4 h-4 text-primary-600 shrink-0" />}
                </li>
              )
            })}
            {options.length === 0 && (
              <li className="px-3 py-2 text-[13px] text-neutral-400 text-center italic">Nessuna opzione</li>
            )}
          </ul>
        )}
      </div>
    )
  },
) as <T extends string = string>(props: SelectProps<T> & { ref?: React.Ref<HTMLButtonElement> }) => React.ReactElement

export default Select
