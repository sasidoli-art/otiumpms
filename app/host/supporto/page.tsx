import { redirect } from 'next/navigation'
import { getHostId } from '@/lib/auth-middleware'
import SupportoLista from './supporto-lista'

export default async function SupportoPage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <div>
          <h1 className="page-title">Supporto</h1>
          <p className="text-sm text-gray-500">
            Apri un ticket per ricevere assistenza dal team Otium.
          </p>
        </div>
      </div>
      <SupportoLista />
    </div>
  )
}
