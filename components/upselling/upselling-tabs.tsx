'use client'

import { useState } from 'react'
import { BedDouble, Gift } from 'lucide-react'
import UpsellingBoard from '@/app/host/upselling/upselling-board'
import UpsellingCatalogo from './upselling-catalogo'

type Tab = 'regole' | 'catalogo'

export default function UpsellingTabs() {
  const [tab, setTab] = useState<Tab>('catalogo')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Upselling</h1>
        <p className="text-sm text-gray-500">
          Catalogo di offerte multi-touchpoint + regole specifiche per upgrade camera (assegnate al check-in).
        </p>
      </div>

      {/* Top tabs */}
      <div className="border-b border-gray-200 flex items-center gap-1 overflow-x-auto">
        <TabBtn active={tab === 'catalogo'} onClick={() => setTab('catalogo')} icon={Gift} label="Catalogo suggerimenti" />
        <TabBtn active={tab === 'regole'} onClick={() => setTab('regole')} icon={BedDouble} label="Regole upgrade camera" />
      </div>

      {tab === 'catalogo' && <UpsellingCatalogo />}
      {tab === 'regole' && <UpsellingBoard />}
    </div>
  )
}

function TabBtn({ active, onClick, icon: Icon, label }: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  )
}
