'use client'

import React from 'react'
import Link from 'next/link'
import {
  MapPin, Users, Calendar, ShoppingCart, Wrench, Settings, Trophy,
  LogIn, Home, Plus, BarChart, Mail, Phone, CreditCard, AlertCircle,
  FileText, Eye, Zap, Inbox, BookOpen, Lightbulb
} from 'lucide-react'

const sections = [
  {
    title: '👤 Accesso',
    icon: LogIn,
    description: 'Gestione login e autenticazione',
    links: [
      { label: 'Login', href: '/login', role: 'PUBLIC' },
      { label: 'Gestione Sessione', href: '#', role: 'DOCS' }
    ]
  },
  {
    title: '📚 BOOKING - Flusso Ospite',
    icon: BookOpen,
    color: 'blue',
    description: 'Self-booking per alloggi e SPA',
    links: [
      { label: 'Booking Alloggio', href: '/book', role: 'PUBLIC' },
      { label: 'Booking SPA', href: '/book/spa', role: 'PUBLIC' },
      { label: 'Check-in Self-Service', href: '/checkin', role: 'PUBLIC' },
      { label: 'Riepilogo Prenotazioni', href: '/book/my-bookings', role: 'GUEST' }
    ]
  },
  {
    title: '🏨 HOST - Gestione Struttura',
    icon: Home,
    color: 'green',
    description: 'Dashboard per gestori di strutture',
    subsections: [
      {
        title: 'Dashboard Principale',
        links: [
          { label: 'Home Host', href: '/host', role: 'HOST' },
          { label: 'Overview Prenotazioni', href: '/host/prenotazioni', role: 'HOST' }
        ]
      },
      {
        title: 'Alloggi & Disponibilità',
        links: [
          { label: 'Lista Camere', href: '/host/camere', role: 'HOST' },
          { label: 'Calendario Disponibilità', href: '/host/disponibilita', role: 'HOST' },
          { label: 'Prezzi & Tariffe', href: '/host/tariffe', role: 'HOST' },
          { label: 'Blocchi Date', href: '/host/blocchi', role: 'HOST' }
        ]
      },
      {
        title: '👥 Gestione Ospiti',
        links: [
          { label: 'Lista Ospiti CRM', href: '/host/ospiti', role: 'HOST' },
          { label: 'Messaggi Ospiti', href: '/host/messaggi', role: 'HOST' },
          { label: 'Documenti & T&C', href: '/host/documenti', role: 'HOST' }
        ]
      },
      {
        title: '💆 SPA - Dichiarazioni & Pagamenti',
        links: [
          { label: 'Dashboard SPA Waiver', href: '/host/spa', role: 'HOST' },
          { label: 'Waiver Ospiti', href: '/host/spa/waivers', role: 'HOST' },
          { label: 'Report Dichiarazioni', href: '/host/spa/reports', role: 'HOST' },
          { label: 'Riconciliazione Pagamenti', href: '/host/spa/pagamenti', role: 'HOST' }
        ]
      },
      {
        title: '🧹 Housekeeping & Manutenzione',
        links: [
          { label: 'Task Pulizie', href: '/host/housekeeping/task', role: 'HOST' },
          { label: 'Segnalazioni Manutenzione', href: '/host/housekeeping/segnalazioni', role: 'HOST' },
          { label: 'Calendario Pulizie', href: '/host/housekeeping/calendario', role: 'HOST' }
        ]
      },
      {
        title: '📊 Fatturazione & Incassi',
        links: [
          { label: 'Fatture Emesse', href: '/host/fatture', role: 'HOST' },
          { label: 'Riconciliazione Pagamenti', href: '/host/pagamenti', role: 'HOST' },
          { label: 'Rendiconti Mensili', href: '/host/rendiconti', role: 'HOST' }
        ]
      },
      {
        title: '⚙️ Impostazioni Struttura',
        links: [
          { label: 'Dati Struttura', href: '/host/settings/struttura', role: 'HOST' },
          { label: 'Utenti & Ruoli', href: '/host/settings/utenti', role: 'HOST' },
          { label: 'Integrazioni', href: '/host/settings/integrazioni', role: 'HOST' }
        ]
      }
    ]
  },
  {
    title: '👑 ADMIN - Gestione Piattaforma',
    icon: Settings,
    color: 'red',
    description: 'Controllo completo della piattaforma',
    subsections: [
      {
        title: 'Overview Admin',
        links: [
          { label: 'Dashboard Admin', href: '/admin', role: 'ADMIN' },
          { label: 'Statistiche Piattaforma', href: '/admin/analytics', role: 'ADMIN' }
        ]
      },
      {
        title: '🏢 Gestione Host',
        links: [
          { label: 'Lista Host', href: '/admin/host', role: 'ADMIN' },
          { label: 'Crea Nuovo Host', href: '/admin/host/create', role: 'ADMIN' },
          { label: 'Sospensioni & Blocchi', href: '/admin/host/blocchi', role: 'ADMIN' }
        ]
      },
      {
        title: '🏨 Gestione Strutture',
        links: [
          { label: 'Tutte le Strutture', href: '/admin/strutture', role: 'ADMIN' },
          { label: 'Catalogo Servizi', href: '/admin/servizi', role: 'ADMIN' },
          { label: 'Modelli Waiver', href: '/admin/waiver-templates', role: 'ADMIN' }
        ]
      },
      {
        title: '💰 Fatturazione & Incassi',
        links: [
          { label: 'Fatture Emesse', href: '/admin/fatture', role: 'ADMIN' },
          { label: 'Riconciliazione Pagamenti', href: '/admin/pagamenti', role: 'ADMIN' },
          { label: 'Rendiconti SDI', href: '/admin/sdi', role: 'ADMIN' },
          { label: 'Abbonamenti', href: '/admin/abbonamenti', role: 'ADMIN' }
        ]
      },
      {
        title: '📋 Segnalazioni & Support',
        links: [
          { label: 'Ticket Support', href: '/admin/tickets', role: 'ADMIN' },
          { label: 'Segnalazioni Utenti', href: '/admin/segnalazioni', role: 'ADMIN' }
        ]
      },
      {
        title: '⚙️ Configurazione Piattaforma',
        links: [
          { label: 'Impostazioni Globali', href: '/admin/settings', role: 'ADMIN' },
          { label: 'Template Email', href: '/admin/email-templates', role: 'ADMIN' },
          { label: 'Lingue & Locali', href: '/admin/locali', role: 'ADMIN' }
        ]
      }
    ]
  },
  {
    title: '🔌 API Routes & Endpoints',
    icon: Zap,
    description: 'Backend endpoints per client',
    subsections: [
      {
        title: 'Auth & Session',
        links: [
          { label: 'POST /auth/session', href: '#', role: 'DOCS' },
          { label: 'POST /auth/signin', href: '#', role: 'DOCS' },
          { label: 'POST /auth/signout', href: '#', role: 'DOCS' }
        ]
      },
      {
        title: 'Booking & Prenotazioni',
        links: [
          { label: 'GET /api/booking/strutture', href: '#', role: 'DOCS' },
          { label: 'POST /api/booking/create', href: '#', role: 'DOCS' },
          { label: 'GET /api/booking/disponibilita', href: '#', role: 'DOCS' },
          { label: 'GET /api/booking/my-bookings', href: '#', role: 'DOCS' }
        ]
      },
      {
        title: 'SPA Waiver & Pagamenti',
        links: [
          { label: 'POST /api/spa/waiver', href: '#', role: 'DOCS' },
          { label: 'GET /api/spa/waiver/:id', href: '#', role: 'DOCS' },
          { label: 'POST /api/spa/pagamento', href: '#', role: 'DOCS' },
          { label: 'GET /api/spa/pagamento/:id', href: '#', role: 'DOCS' },
          { label: 'GET /api/host/spa/appuntamenti', href: '#', role: 'DOCS' }
        ]
      },
      {
        title: 'Host Management',
        links: [
          { label: 'GET /api/host/camere', href: '#', role: 'DOCS' },
          { label: 'GET /api/host/prenotazioni', href: '#', role: 'DOCS' },
          { label: 'POST /api/host/fatture', href: '#', role: 'DOCS' },
          { label: 'GET /api/host/ospiti', href: '#', role: 'DOCS' }
        ]
      }
    ]
  },
  {
    title: '👤 Test Accounts',
    icon: Users,
    description: 'Credenziali per testing',
    special: true,
    content: (
      <div className="space-y-3">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-900 mb-1">👑 Admin Account</p>
          <p className="text-sm text-blue-800"><strong>Email:</strong> admin@otiumweek.it</p>
          <p className="text-sm text-blue-800"><strong>Password:</strong> (default seed - check db:seed)</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="font-semibold text-green-900 mb-1">🏨 Host Account</p>
          <p className="text-sm text-green-800"><strong>Email:</strong> host@example.com</p>
          <p className="text-sm text-green-800"><strong>Password:</strong> (configure in localhost)</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="font-semibold text-purple-900 mb-1">👤 Guest Account</p>
          <p className="text-sm text-purple-800"><strong>Email:</strong> guest@example.com</p>
          <p className="text-sm text-purple-800"><strong>Password:</strong> (optional - self-registration)</p>
        </div>
      </div>
    )
  },
  {
    title: '📚 Database & Schema',
    icon: BookOpen,
    description: 'Modelli dati principali',
    special: true,
    content: (
      <div className="space-y-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="font-semibold text-gray-900 mb-2">Core Models</p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>User</strong> - Utenti (Host, Admin)</li>
            <li>• <strong>Host</strong> - Gestori strutture (multi-tenant)</li>
            <li>• <strong>Struttura</strong> - Strutture ricettive</li>
            <li>• <strong>UnitaPrenotabile</strong> - Camere/unità</li>
            <li>• <strong>Prenotazione</strong> - Booking alloggio</li>
            <li>• <strong>AppuntamentoSpa</strong> - Prenotazioni SPA</li>
            <li>• <strong>WaiverSpa</strong> - Dichiarazioni cliniche</li>
            <li>• <strong>PagamentoSpa</strong> - Pagamenti SPA</li>
            <li>• <strong>Fattura</strong> - Fatture elettroniche (SDI)</li>
            <li>• <strong>TaskHK</strong> - Task housekeeping</li>
          </ul>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={() => window.location.href = 'http://localhost:5555'}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <Eye size={16} /> Prisma Studio
          </button>
          <a
            href="/api/schema" 
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition text-sm font-medium flex items-center justify-center gap-2"
          >
            <FileText size={16} /> Schema JSON
          </a>
        </div>
      </div>
    )
  },
  {
    title: '🔧 Comandi Disponibili',
    icon: Wrench,
    description: 'CLI e terminal commands',
    special: true,
    content: (
      <div className="space-y-2">
        {[
          { cmd: 'npm run dev', desc: 'Start dev server (port 3000)' },
          { cmd: 'npm run build', desc: 'Production build' },
          { cmd: 'npm run lint', desc: 'ESLint check' },
          { cmd: 'npm run db:push', desc: 'Sync schema to DB' },
          { cmd: 'npm run db:generate', desc: 'Regenerate Prisma types' },
          { cmd: 'npm run db:seed', desc: 'Seed database (admin account)' },
          { cmd: 'npm run db:studio', desc: 'Open Prisma Studio (http://localhost:5555)' }
        ].map((item, idx) => (
          <div key={idx} className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm border border-gray-700">
            <p>$ {item.cmd}</p>
            <p className="text-gray-400 text-xs mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    )
  }
]

function LinkButton({ href, label, role }: { href: string; label: string; role: string }) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'PUBLIC':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      case 'GUEST':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200'
      case 'HOST':
        return 'bg-green-100 text-green-700 hover:bg-green-200'
      case 'ADMIN':
        return 'bg-red-100 text-red-700 hover:bg-red-200'
      case 'DOCS':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }
  }

  const isExternal = href.startsWith('http')
  const isInternal = href.startsWith('/')

  if (href === '#') {
    return (
      <span className={`px-3 py-2 rounded text-sm font-medium transition ${getRoleColor(role)}`}>
        {label}
      </span>
    )
  }

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`px-3 py-2 rounded text-sm font-medium transition ${getRoleColor(role)} flex items-center gap-1 group`}
      >
        {label}
        <span className="group-hover:translate-x-1 transition">↗</span>
      </a>
    )
  }

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded text-sm font-medium transition ${getRoleColor(role)}`}
    >
      {label}
    </Link>
  )
}

export default function TestSitemapPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center gap-3">
            <MapPin className="w-10 h-10 text-blue-400" />
            Sitemap Gestionale Otium
          </h1>
          <p className="text-gray-300 text-lg">
            Mappa completa di tutti i servizi, pagine e API del sistema
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => {
            const Icon = section.icon
            const color = section.color || 'gray'

            return (
              <div key={idx} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition">
                {/* Header */}
                <div className={`bg-gradient-to-r from-${color}-600 to-${color}-700 px-6 py-4 text-white`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="w-8 h-8" />
                      <div>
                        <h2 className="text-2xl font-bold">{section.title}</h2>
                        <p className="text-white text-opacity-90 text-sm mt-1">{section.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  {section.special ? (
                    section.content
                  ) : !section.subsections ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {section.links?.map((link, lidx) => (
                        <LinkButton key={lidx} {...link} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {section.subsections.map((sub, sidx) => (
                        <div key={sidx}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">{sub.title}</h3>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 ml-0 md:ml-4">
                            {sub.links.map((link, lidx) => (
                              <LinkButton key={lidx} {...link} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6 text-center">
          <p className="text-gray-600 mb-4">
            Per domande technical: consultare <strong>CLAUDE.md</strong> nella root del progetto
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
              Next.js 16 + React 18
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
              TypeScript 5 + Tailwind CSS
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
              Prisma 5 + PostgreSQL
            </span>
            <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
              NextAuth 4 (JWT)
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
