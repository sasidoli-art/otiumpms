'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

interface SignaturePadProps {
  onSave: (base64: string) => void
  onClear?: () => void
  disabilitato?: boolean
}

/**
 * Componente canvas per firma digitale.
 * Supporta mouse, touch (tablet/telefono) e pointer events.
 * Esporta la firma come base64 PNG.
 */
export function SignaturePad({ onSave, onClear, disabilitato }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Setup canvas HiDPI
    const dpr = window.devicePixelRatio || 2
    canvas.width = canvas.offsetWidth * dpr
    canvas.height = canvas.offsetHeight * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.scale(dpr, dpr)
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  // Prevent scrolling when drawing on touch devices
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) e.preventDefault()
    }
    canvas.addEventListener('touchmove', preventScroll, { passive: false })
    return () => canvas.removeEventListener('touchmove', preventScroll)
  }, [isDrawing])

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()

    let clientX: number, clientY: number
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else if ('clientX' in e) {
      clientX = e.clientX
      clientY = e.clientY
    } else {
      return null
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (disabilitato) return
    const coords = getCoords(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 2
    ctx.beginPath()
    ctx.moveTo(coords.x * dpr, coords.y * dpr)
    setIsDrawing(true)
  }, [disabilitato, getCoords])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    if (!isDrawing || disabilitato) return
    const coords = getCoords(e)
    if (!coords) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 2
    ctx.lineTo(coords.x * dpr, coords.y * dpr)
    ctx.stroke()
    setIsEmpty(false)
  }, [isDrawing, disabilitato, getCoords])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    onClear?.()
  }

  const saveSignature = () => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return

    const base64 = canvas.toDataURL('image/png')
    onSave(base64)
  }

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          className={`w-full cursor-crosshair ${disabilitato ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ aspectRatio: '16/9', touchAction: 'none' }}
          // Mouse events
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          // Touch events (tablet/phone)
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          onTouchCancel={stopDrawing}
          // Pointer events (unified)
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>

      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={clearSignature}
          disabled={disabilitato || isEmpty}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
        >
          <RotateCcw size={16} />
          Cancella
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={saveSignature}
          disabled={disabilitato || isEmpty}
          className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition"
        >
          Salva Firma ✓
        </motion.button>
      </div>

      {isEmpty && (
        <p className="text-sm text-gray-500 text-center">Disegna la tua firma nel riquadro sopra</p>
      )}
    </div>
  )
}
