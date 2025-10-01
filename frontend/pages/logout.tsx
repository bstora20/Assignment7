import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'

export default function Logout() {
  const { logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Clear all authentication data
    logout()
    
    // Clear localStorage completely (in case there are any leftover tokens)
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }

    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/auth/login')
    }, 1000)
  }, [logout, router])

  return (
    <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full border-2 border-secondary-300 border-t-primary-600 h-12 w-12 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-secondary-900 mb-2">Signing you out...</h1>
        <p className="text-secondary-600">You'll be redirected to the login page.</p>
      </div>
    </div>
  )
}