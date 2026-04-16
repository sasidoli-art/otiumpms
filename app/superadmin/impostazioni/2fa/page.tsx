import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { TwoFactorClient } from './two-factor-client'

export const metadata = { title: '2FA — SuperAdmin' }
export const dynamic = 'force-dynamic'

export default async function TwoFactorPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPERADMIN') redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  })

  return (
    <TwoFactorClient
      email={user?.email ?? ''}
      enabled={user?.twoFactorEnabled ?? false}
      backupCodesRemaining={user?.twoFactorBackupCodes?.length ?? 0}
    />
  )
}
