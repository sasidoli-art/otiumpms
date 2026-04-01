import { prisma } from '@/lib/db'
import {
  Globe, Mail, Shield, Database, Info, AlertTriangle,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import ImpostazioniActions from './impostazioni-actions'

export const metadata = { title: 'Impostazioni — SuperAdmin' }

export default async function SuperAdminImpostazioniPage() {
  // Database check
  let dbConnected = false
  let dbInfo = ''
  try {
    await prisma.$queryRaw`SELECT 1`
    dbConnected = true
    dbInfo = 'PostgreSQL (Neon)' // TODO: i18n
  } catch {
    dbInfo = 'Connessione fallita'
  }

  const platformName = process.env.NEXT_PUBLIC_APP_NAME || 'Otium Week'
  const platformUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const supportEmail = process.env.SUPPORT_EMAIL || process.env.SMTP_USER || 'N/A'
  const smtpConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER)
  const sentryDsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || null
  const appVersion = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0'

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok
      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
      : <XCircle className="w-4 h-4 text-red-500" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Impostazioni piattaforma</h1>{/* TODO: i18n */}
        <p className="text-sm text-gray-500">Configurazione e stato del sistema</p>{/* TODO: i18n */}
      </div>

      {/* Informazioni piattaforma */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Informazioni piattaforma</h2>{/* TODO: i18n */}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Nome piattaforma" value={platformName} />
          <InfoRow label="URL" value={platformUrl} />
          <InfoRow label="Email supporto" value={supportEmail} />
          <InfoRow label="Versione" value={appVersion} />
        </div>
      </div>

      {/* Status servizi */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-brand-600" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">Stato servizi</h2>{/* TODO: i18n */}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-slate-300">SMTP (Email)</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon ok={smtpConfigured} />
              <Badge variant={smtpConfigured ? 'green' : 'red'}>
                {smtpConfigured ? 'Configurato' : 'Non configurato'}{/* TODO: i18n */}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Sentry (Error Tracking)</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon ok={!!sentryDsn} />
              <Badge variant={sentryDsn ? 'green' : 'yellow'}>
                {sentryDsn ? 'DSN configurato' : 'Non configurato'}{/* TODO: i18n */}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-800">
            <div className="flex items-center gap-3">
              <Database className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700 dark:text-slate-300">Database</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon ok={dbConnected} />
              <Badge variant={dbConnected ? 'green' : 'red'}>{dbInfo}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <ImpostazioniActions />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>{/* TODO: i18n */}
      <span className="text-sm text-gray-900 dark:text-slate-100 font-mono bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded">
        {value}
      </span>
    </div>
  )
}
