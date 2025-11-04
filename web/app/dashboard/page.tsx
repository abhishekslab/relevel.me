import { requireSubscription } from '@/lib/auth/server'
import DashboardClient from './_components/DashboardClient'

export default async function DashboardPage() {
  // This will redirect to /pricing if no active subscription
  const userWithSub = await requireSubscription()

  // If we get here, user has active subscription
  return <DashboardClient />
}
