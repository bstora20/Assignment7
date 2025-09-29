import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAuth } from '../lib/auth'
import Layout from '../components/layout/Layout'
import Dashboard from '../components/dashboard/Dashboard'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <Layout>
      <div className="min-h-screen bg-secondary-50">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-secondary-900">
                Welcome back, {user?.firstName} {user?.lastName}
              </h1>
              <p className="mt-1 text-secondary-600">
                Manage your student support assistants and view analytics
              </p>
            </div>
            
            <Dashboard />
          </div>
        </div>
      </div>
    </Layout>
  )
}