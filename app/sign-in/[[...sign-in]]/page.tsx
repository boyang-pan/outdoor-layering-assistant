import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center px-4">
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}
