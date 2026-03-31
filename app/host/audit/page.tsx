import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import AuditBoard from './audit-board'

export const metadata = { title: 'Registro Attività — Host' }

export default async function AuditPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <AuditBoard />
}
