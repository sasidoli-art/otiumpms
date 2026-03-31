import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Bell, Mail, FileText, CreditCard, Globe, Shield, Info } from 'lucide-react'
import PasswordForm from './password-form'

export const metadata = { title: 'Impostazioni — Admin' }

export default async function ImpostazioniPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  // Valori env (mascherati per sicurezza)
  const smtpHost = process.env.EMAIL_HOST || '—'
  const smtpPort = process.env.EMAIL_PORT || '—'
  const smtpUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : '—'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '—'

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni</h1>
        <p className="mt-1 text-sm text-gray-500">Configurazione generale della piattaforma Otium Week.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Piattaforma — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Piattaforma</h2>
          </div>
          <div className="space-y-3">
            <InfoRow label="Nome piattaforma" value="Otium Week" />
            <InfoRow label="URL sito" value={appUrl} />
            <InfoRow label="Email supporto" value="info@otiumweek.it" />
          </div>
          <EnvNote />
        </div>

        {/* Notifiche — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Notifiche</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Nuova prenotazione ricevuta', attivo: true },
              { label: 'Pagamento ricevuto', attivo: true },
              { label: 'Nuovo host registrato', attivo: true },
              { label: 'Evento in attesa di approvazione', attivo: true },
              { label: 'Abbonamento in scadenza', attivo: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${item.attivo ? 'bg-green-400' : 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className={`ml-auto text-xs font-medium ${item.attivo ? 'text-green-600' : 'text-gray-400'}`}>
                  {item.attivo ? 'Attiva' : 'Disattivata'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-gray-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            La gestione preferenze notifiche sarà disponibile in un prossimo aggiornamento.
          </p>
        </div>

        {/* Email SMTP — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <Mail className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Email (SMTP)</h2>
          </div>
          <div className="space-y-3">
            <InfoRow label="Host SMTP" value={smtpHost} />
            <InfoRow label="Porta" value={smtpPort} />
            <InfoRow label="Utente" value={smtpUser} />
            <InfoRow label="Password" value="••••••••" />
          </div>
          <EnvNote />
        </div>

        {/* Fatturazione — read-only */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Fatturazione</h2>
          </div>
          <div className="space-y-3">
            <InfoRow label="Ragione sociale" value="Otium Week S.r.l." />
            <InfoRow label="P.IVA" value="IT00000000000" />
            <InfoRow label="Aliquota IVA default" value="22%" />
          </div>
          <EnvNote />
        </div>

        {/* Piani abbonamento — read-only tabella */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-brand-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Piani Abbonamento</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="table-th">Piano</th>
                  <th className="table-th">Prezzo</th>
                  <th className="table-th">Max eventi</th>
                  <th className="table-th">Max strutture</th>
                  <th className="table-th">Descrizione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { nome: 'Evento Singolo', prezzo: '€49', eventi: 1, strutture: 1, desc: 'Pubblicazione singolo evento' },
                  { nome: 'Visibilità Mensile', prezzo: '€149/mese', eventi: 10, strutture: 3, desc: 'Pubblicazione mensile illimitata' },
                  { nome: 'Partner Premium', prezzo: '€349/mese', eventi: 999, strutture: 10, desc: 'Visibilità premium + booking engine' },
                ].map((p, i) => (
                  <tr key={i}>
                    <td className="table-td font-medium">{p.nome}</td>
                    <td className="table-td text-brand-600 font-semibold">{p.prezzo}</td>
                    <td className="table-td">{p.eventi === 999 ? 'Illimitati' : p.eventi}</td>
                    <td className="table-td">{p.strutture}</td>
                    <td className="table-td text-gray-500">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sicurezza — FUNZIONANTE */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Sicurezza</h2>
          </div>
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}

// ─── Componenti helper ────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  )
}

function EnvNote() {
  return (
    <p className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-1.5">
      <Info className="w-3.5 h-3.5 shrink-0" />
      Configurato tramite variabili d&apos;ambiente (.env). Contatta lo sviluppatore per modifiche.
    </p>
  )
}
