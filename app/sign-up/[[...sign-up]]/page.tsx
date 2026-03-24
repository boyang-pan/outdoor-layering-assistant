import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-base)] flex items-center justify-center px-4">
      <SignUp routing="path" path="/sign-up" />
    </div>
  )
}
