import { useAuth } from '../../lib/auth'
import Layout from '../../components/layout/Layout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function Assistants() {
  const { user, loading, isAuthenticated } = useAuth()

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
                AI Assistants
              </h1>
              <p className="mt-1 text-secondary-600">
                Manage your student support assistants
              </p>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Available Assistants</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg">Academic Support</h3>
                  <p className="text-sm text-gray-600 mt-1">Help with tutoring, writing center, study groups</p>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg">Financial Aid</h3>
                  <p className="text-sm text-gray-600 mt-1">FAFSA, scholarships, emergency funds</p>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg">Student Life</h3>
                  <p className="text-sm text-gray-600 mt-1">Campus recreation, counseling, career services</p>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <button className="btn-primary">
                  Create New Assistant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}