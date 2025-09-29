import { useRouter } from 'next/router'
import { useAuth } from '../../lib/auth'
import Layout from '../../components/layout/Layout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function AssistantDetail() {
  const router = useRouter()
  const { id } = router.query
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

  // Mock assistant data based on ID
  const getAssistantData = (assistantId: string) => {
    const assistants = {
      '1': {
        id: '1',
        name: 'Academic Support Assistant',
        description: 'Help with tutoring, writing center, study groups',
        department: 'Academic Support',
        status: 'active',
        documentsCount: 5,
        conversationsCount: 0,
        lastUpdated: 'Sept 29, 2024',
        createdAt: 'Sept 28, 2024'
      },
      '2': {
        id: '2', 
        name: 'Financial Aid Assistant',
        description: 'FAFSA, scholarships, emergency funds',
        department: 'Financial Aid',
        status: 'active',
        documentsCount: 8,
        conversationsCount: 0,
        lastUpdated: 'Sept 29, 2024',
        createdAt: 'Sept 27, 2024'
      },
      '3': {
        id: '3',
        name: 'Student Life Assistant',
        description: 'Campus recreation, counseling, career services',
        department: 'Student Life',
        status: 'active',
        documentsCount: 12,
        conversationsCount: 0,
        lastUpdated: 'Sept 29, 2024',
        createdAt: 'Sept 26, 2024'
      }
    }
    return assistants[assistantId as keyof typeof assistants]
  }

  const assistant = getAssistantData(id as string)

  if (!assistant) {
    return (
      <Layout>
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Assistant Not Found</h1>
            <p className="mt-2 text-gray-600">The assistant you're looking for doesn't exist.</p>
            <button 
              onClick={() => router.push('/assistants')}
              className="mt-4 btn-primary"
            >
              Back to Assistants
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-secondary-50">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <button
                  onClick={() => router.push('/assistants')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium mb-2"
                >
                  ← Back to Assistants
                </button>
                <h1 className="text-3xl font-bold text-secondary-900">
                  {assistant.name}
                </h1>
                <p className="mt-1 text-secondary-600">
                  {assistant.description}
                </p>
              </div>
              <div className="flex space-x-3">
                <button className="btn-outline">
                  Edit Assistant
                </button>
                <button className="btn-primary">
                  Test Assistant
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{assistant.documentsCount}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500 truncate">Documents</dt>
                    <dd className="text-lg font-semibold text-gray-900">{assistant.documentsCount}</dd>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{assistant.conversationsCount}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500 truncate">Conversations</dt>
                    <dd className="text-lg font-semibold text-gray-900">{assistant.conversationsCount}</dd>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                      assistant.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      <span className="text-white text-sm font-medium">
                        {assistant.status === 'active' ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                    <dd className="text-lg font-semibold text-gray-900 capitalize">{assistant.status}</dd>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">📅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <dt className="text-sm font-medium text-gray-500 truncate">Last Updated</dt>
                    <dd className="text-lg font-semibold text-gray-900">{assistant.lastUpdated}</dd>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Documents */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="text-lg font-medium text-gray-900">Knowledge Base Documents</h2>
                    <button className="btn-primary text-sm">
                      Add Documents
                    </button>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{assistant.department.toLowerCase().replace(/\s+/g, '-')}-guide.pdf</h3>
                          <p className="text-sm text-gray-600">{assistant.department} Services Guide • 1.2 MB</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Processed
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-medium">faq-{assistant.department.toLowerCase().replace(/\s+/g, '-')}.docx</h3>
                          <p className="text-sm text-gray-600">Frequently Asked Questions • 856 KB</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Processed
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h3 className="font-medium">contact-info.xlsx</h3>
                          <p className="text-sm text-gray-600">Contact Information Directory • 245 KB</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Processing
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Conversations */}
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Recent Conversations</h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="text-center py-8">
                      <p className="text-gray-500">No conversations yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Conversations will appear here once students start chatting with this assistant
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Assistant Info */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Assistant Information</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Department:</span>
                      <span className="ml-2 text-gray-900">{assistant.department}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <span className="ml-2 text-gray-900">{assistant.createdAt}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Updated:</span>
                      <span className="ml-2 text-gray-900">{assistant.lastUpdated}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Public URL:</span>
                      <div className="mt-1">
                        <code className="text-xs bg-gray-100 p-1 rounded">
                          /chat/{assistant.name.toLowerCase().replace(/\s+/g, '-')}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm">
                      📊 View Analytics
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm">
                      🧪 Run Tests
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm">
                      📥 Export Data
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-gray-50 text-sm">
                      🔗 Share Link
                    </button>
                    <button className="w-full text-left p-2 rounded hover:bg-red-50 text-red-600 text-sm">
                      🗑️ Delete Assistant
                    </button>
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