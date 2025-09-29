import { useAuth } from '../../lib/auth'
import Layout from '../../components/layout/Layout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function Documents() {
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
                Document Library
              </h1>
              <p className="mt-1 text-secondary-600">
                Upload and manage documents for your assistants
              </p>
            </div>
            
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Documents</h2>
                <button className="btn-primary">
                  Upload Document
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">academic-support-guide.pdf</h3>
                    <p className="text-sm text-gray-600">Academic Support Services Guide • 1.0 MB</p>
                    <p className="text-xs text-gray-500">Uploaded Sept 28, 2024</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Processed
                    </span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">financial-aid-handbook.docx</h3>
                    <p className="text-sm text-gray-600">Financial Aid Handbook 2024-2025 • 2.0 MB</p>
                    <p className="text-xs text-gray-500">Uploaded Sept 27, 2024</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Processed
                    </span>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">student-life-services.xlsx</h3>
                    <p className="text-sm text-gray-600">Student Life Services Directory • 512 KB</p>
                    <p className="text-xs text-gray-500">Uploaded Sept 29, 2024</p>
                  </div>
                  <div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Processing
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}