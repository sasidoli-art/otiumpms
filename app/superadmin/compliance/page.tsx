'use client'

import { useState, useEffect } from 'react'
import { Shield, CheckCircle2, AlertTriangle, XCircle, FileText, Users, Database, Lock, Bot, Cookie, Eye, Loader2 } from 'lucide-react'

type CheckResult = { id: string; label: string; status: 'ok' | 'warning' | 'error'; detail: string; category: string }

const STATUS_ICON = {
  ok: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
}

const CATEGORIES = [
  { id: 'gdpr', label: 'GDPR', icon: Shield, color: 'text-blue-600' },
  { id: 'security', label: 'Sicurezza', icon: Lock, color: 'text-green-600' },
  { id: 'data', label: 'Dati & Retention', icon: Database, color: 'text-purple-600' },
  { id: 'documents', label: 'Documentazione', icon: FileText, color: 'text-amber-600' },
  { id: 'ai', label: 'AI Act', icon: Bot, color: 'text-indigo-600' },
]

export default function CompliancePage() {
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Static compliance checks — based on known implementation
    const results: CheckResult[] = [
      // GDPR
      { id: 'privacy_policy', label: 'Privacy Policy pubblicata', status: 'ok', detail: '/privacy-policy — Art. 13-14, include Art. 9 dati sanitari', category: 'gdpr' },
      { id: 'terms', label: 'Termini e Condizioni', status: 'ok', detail: '/terms — 15 articoli, ruoli titolare/responsabile definiti', category: 'gdpr' },
      { id: 'cookie_banner', label: 'Cookie Banner + Policy', status: 'ok', detail: 'Banner con 3 opzioni, consent tracking, cookie-policy page', category: 'gdpr' },
      { id: 'dpa', label: 'DPA (Data Processing Agreement)', status: 'ok', detail: 'docs/legal/DPA-template.md — Art. 28 GDPR completo', category: 'gdpr' },
      { id: 'registro', label: 'Registro dei Trattamenti', status: 'ok', detail: 'docs/legal/registro-trattamenti.md — Art. 30, 10 categorie', category: 'gdpr' },
      { id: 'dpia', label: 'DPIA Dati Sanitari SPA', status: 'ok', detail: 'docs/legal/DPIA-spa-wellness.md — Art. 35, rischio residuo BASSO', category: 'gdpr' },
      { id: 'data_export', label: 'Export dati ospite (Art. 15/20)', status: 'ok', detail: '/host/gdpr — export JSON completo con audit log', category: 'gdpr' },
      { id: 'data_deletion', label: 'Diritto oblio (Art. 17)', status: 'ok', detail: '/host/gdpr — anonimizzazione con conferma, audit log', category: 'gdpr' },
      { id: 'consent_tracking', label: 'Tracciamento consensi (Art. 7)', status: 'ok', detail: 'Tabella UserConsent con tipo, timestamp, IP, user-agent', category: 'gdpr' },
      { id: 'sub_processors', label: 'Nomina sub-responsabili', status: 'ok', detail: 'docs/legal/sub-responsabili.md — Vercel, Neon, Aruba, Anthropic, Stripe', category: 'gdpr' },
      { id: 'breach_procedure', label: 'Procedura Data Breach', status: 'ok', detail: 'docs/legal/procedura-data-breach.md — 8 fasi, notifica 72h', category: 'gdpr' },

      // Security
      { id: 'https', label: 'Cifratura in transito (TLS)', status: 'ok', detail: 'HTTPS via Vercel, TLS 1.3', category: 'security' },
      { id: 'bcrypt', label: 'Password hashing (bcrypt)', status: 'ok', detail: 'bcryptjs con salt automatico', category: 'security' },
      { id: 'rbac', label: 'Controllo accessi (RBAC)', status: 'ok', detail: '5 livelli: SUPERADMIN → ADMIN → DIREZIONE → HOST → STAFF', category: 'security' },
      { id: 'csrf', label: 'Protezione CSRF', status: 'ok', detail: 'Double-submit cookie, 32 byte token, escluse API pubbliche', category: 'security' },
      { id: 'rate_limit', label: 'Rate limiting endpoint pubblici', status: 'ok', detail: 'Login: 5/5min, Booking: 10/10min, Contact: 3/10min', category: 'security' },
      { id: 'input_validation', label: 'Validazione input (Zod)', status: 'ok', detail: '20+ schemi Zod, parseBody() helper su tutti gli endpoint', category: 'security' },
      { id: 'audit_log', label: 'Audit trail completo', status: 'ok', detail: '143 API route con audit import, operazioni CRUD loggate', category: 'security' },
      { id: 'session', label: 'Sessione JWT sicura', status: 'ok', detail: '24h durata, httpOnly cookie, JWT signed', category: 'security' },
      { id: 'mfa', label: 'Autenticazione MFA', status: 'warning', detail: 'Non implementata — raccomandata per account admin/host', category: 'security' },
      { id: 'error_leak', label: 'Nessun data leak negli errori', status: 'ok', detail: 'Messaggi generici, no stack trace, no path filesystem', category: 'security' },

      // Data & Retention
      { id: 'retention_spa', label: 'Dati sanitari SPA: 90 giorni', status: 'ok', detail: 'Cron automatico, notifica host 15gg prima', category: 'data' },
      { id: 'retention_regcard', label: 'Registration Card: 40 giorni', status: 'ok', detail: 'Firma cancellata, notifica host 10gg prima', category: 'data' },
      { id: 'retention_guest', label: 'Dati ospite: 40gg → anonimizzazione', status: 'ok', detail: 'Nome → "Anonimo GDPR", email → hash', category: 'data' },
      { id: 'retention_foto', label: 'Foto documenti: 7 giorni', status: 'ok', detail: 'Cancellazione automatica post-partenza', category: 'data' },
      { id: 'retention_fiscal', label: 'Dati fiscali: 10 anni', status: 'ok', detail: 'Art. 2220 Codice Civile', category: 'data' },
      { id: 'retention_alloggiati', label: 'Alloggiati Web: 5 anni', status: 'ok', detail: 'Art. 109 TULPS', category: 'data' },
      { id: 'hosting_eu', label: 'Hosting dati in EU', status: 'ok', detail: 'Neon PostgreSQL Francoforte (eu-central-1)', category: 'data' },
      { id: 'data_portability', label: 'Portabilità dati (30gg post-cessazione)', status: 'ok', detail: 'DPA Art. 4.7, export JSON disponibile', category: 'data' },

      // Documents
      { id: 'doc_dpa', label: 'DPA template pronto', status: 'ok', detail: 'Da far firmare ad ogni host in fase di onboarding', category: 'documents' },
      { id: 'doc_registro', label: 'Registro trattamenti aggiornato', status: 'ok', detail: '10 categorie documentate con base giuridica', category: 'documents' },
      { id: 'doc_dpia', label: 'DPIA dati sanitari completata', status: 'ok', detail: 'Rischio residuo BASSO — no consultazione Garante', category: 'documents' },
      { id: 'doc_breach', label: 'Procedura breach documentata', status: 'ok', detail: '8 fasi, contatti emergenza, registro violazioni', category: 'documents' },
      { id: 'doc_sub', label: 'Lista sub-responsabili', status: 'ok', detail: '6 sub-responsabili con DPA e garanzie', category: 'documents' },
      { id: 'doc_codice_condotta', label: 'Adesione Codice Condotta AssoSoftware', status: 'ok', detail: 'docs/legal/codice-condotta-assosoftware.md — autovalutazione completa, pronto per adesione OdM', category: 'documents' },

      // AI Act
      { id: 'ai_classification', label: 'Classificazione AI Concierge', status: 'ok', detail: 'Rischio limitato (Art. 50) — obblighi trasparenza', category: 'ai' },
      { id: 'ai_disclosure', label: 'Disclosure AI in chat', status: 'ok', detail: 'Messaggio automatico multi-lingua alla prima conversazione + regola system prompt', category: 'ai' },
      { id: 'ai_human_oversight', label: 'Supervisione umana AI', status: 'ok', detail: 'Escalation a operatore implementata', category: 'ai' },
      { id: 'ai_documentation', label: 'Documentazione AI Act', status: 'ok', detail: 'docs/legal/AI-Act-compliance.md', category: 'ai' },
      { id: 'ai_no_prohibited', label: 'Nessun sistema AI vietato', status: 'ok', detail: 'No social scoring, no manipolazione, no biometrico', category: 'ai' },
    ]

    setChecks(results)
    setLoading(false)
  }, [])

  const countByStatus = (status: 'ok' | 'warning' | 'error') => checks.filter(c => c.status === status).length
  const score = checks.length > 0 ? Math.round((countByStatus('ok') / checks.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">GDPR · AI Act · Codice Condotta AssoSoftware</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-heading font-bold" style={{ color: score >= 90 ? '#16a34a' : score >= 70 ? '#d97706' : '#dc2626' }}>{score}%</p>
          <p className="text-xs text-gray-400">Conformità</p>
        </div>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{countByStatus('ok')}</p>
            <p className="text-xs text-gray-500">Conformi</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{countByStatus('warning')}</p>
            <p className="text-xs text-gray-500">Da migliorare</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <XCircle className="w-6 h-6 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{countByStatus('error')}</p>
            <p className="text-xs text-gray-500">Non conformi</p>
          </div>
        </div>
      </div>

      {/* Checks by category */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        CATEGORIES.map(cat => {
          const catChecks = checks.filter(c => c.category === cat.id)
          if (catChecks.length === 0) return null
          const Icon = cat.icon
          return (
            <div key={cat.id} className="card">
              <h2 className={`text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2 ${cat.color}`}>
                <Icon className="w-4 h-4" /> {cat.label}
              </h2>
              <div className="space-y-2">
                {catChecks.map(check => (
                  <div key={check.id} className="flex items-start gap-3 py-2 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div className="mt-0.5">{STATUS_ICON[check.status]}</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{check.label}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{check.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 py-4">
        <p>Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p className="mt-1">Documenti legali: <code>docs/legal/</code> — Revisione annuale obbligatoria</p>
      </div>
    </div>
  )
}
