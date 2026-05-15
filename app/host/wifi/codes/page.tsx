import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getHostId } from '@/lib/auth-middleware'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { isModuloAttivo } from '@/lib/moduli'
import CodesClient from './codes-client'

export const metadata = { title: 'Codici Wi-Fi — Otium' }

export default async function CodesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const hostId = await getHostId()
  if (!hostId) redirect('/login')

  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true, nomeAzienda: true, moduliAttivi: true },
  })
  if (!host) redirect('/host/dashboard')
  if (!isModuloAttivo(host.moduliAttivi, 'wifi')) redirect('/host/moduli')

  return <CodesClient hostNome={host.nomeAzienda} />
}
