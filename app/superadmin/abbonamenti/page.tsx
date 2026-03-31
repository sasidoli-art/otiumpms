import { prisma } from '@/lib/db'

export const metadata = { title: 'Abbonamenti — SuperAdmin' }

export default async function SuperAdminAbbonamentiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Abbonamenti</h1>
        <p className="text-sm text-gray-500">In fase di sviluppo</p>
      </div>
      <div className="card py-12 flex flex-col items-center gap-2 text-gray-300">
        <p className="text-sm">Questa sezione sarà disponibile a breve.</p>
      </div>
    </div>
  )
}
