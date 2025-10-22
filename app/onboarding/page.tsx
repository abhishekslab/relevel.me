import { requireAuth, createServerClient } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import OnboardingForm from './_components/OnboardingForm'

export default async function OnboardingPage() {
  const session = await requireAuth()
  const supabase = createServerClient()

  // Check if profile is already complete
  const { data: user } = await supabase
    .from('users')
    .select('phone, first_name')
    .eq('id', session.user.id)
    .single()

  // If profile complete, redirect to dashboard
  // Dashboard will handle subscription check
  if (user?.phone && user?.first_name) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <OnboardingForm email={session.user.email || ''} />
      </div>
    </div>
  )
}
