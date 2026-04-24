import { redirect } from 'next/navigation'
import { getHostId } from '@/lib/auth-middleware'
import BookingManagement from '@/components/booking-engine/booking-management'

export const metadata = { title: 'Booking Engine — Host' }
export const dynamic = 'force-dynamic'

export default async function BookingEnginePage() {
  const hostId = await getHostId()
  if (!hostId) redirect('/login')
  return <BookingManagement />
}
