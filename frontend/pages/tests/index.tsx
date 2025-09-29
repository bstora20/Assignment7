import { useAuth } from '../../lib/auth'
import Layout from '../../components/layout/Layout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function Tests() {
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
                Quality Assurance Tests
              </h1>
              <p className="mt-1 text-secondary-600">
                Run tests to ensure your assistants are working correctly
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Test Runner */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Run Tests</h2>
                
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium">Academic Support Assistant</h3>
                    <p className="text-sm text-gray-600 mt-1">5 test cases • Last run: 2 hours ago</p>
                    <div className="mt-3">
                      <button className="btn-primary text-sm">
                        Run Tests
                      </button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium">Financial Aid Assistant</h3>
                    <p className="text-sm text-gray-600 mt-1">8 test cases • Last run: 1 day ago</p>
                    <div className="mt-3">
                      <button className="btn-primary text-sm">
                        Run Tests
                      </button>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4">
                    <h3 className="font-medium">Student Life Assistant</h3>
                    <p className="text-sm text-gray-600 mt-1">12 test cases • Last run: 3 hours ago</p>
                    <div className="mt-3">
                      <button className="btn-primary text-sm">
                        Run Tests
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                  <button className="btn-outline w-full">
                    Run All Tests
                  </button>
                </div>
              </div>

              {/* Test Results */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Recent Test Results</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-green-800">Academic Support - Basic Questions</p>
                      <p className="text-sm text-green-600">All 5 tests passed</p>
                    </div>
                    <div className="text-green-600">
                      <span className="text-2xl">✓</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div>
                      <p className="font-medium text-yellow-800">Financial Aid - FAFSA Questions</p>
                      <p className="text-sm text-yellow-600">6 of 8 tests passed</p>
                    </div>
                    <div className="text-yellow-600">
                      <span className="text-2xl">⚠</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div>
                      <p className="font-medium text-green-800">Student Life - Recreation Hours</p>
                      <p className="text-sm text-green-600">All 4 tests passed</p>
                    </div>
                    <div className="text-green-600">
                      <span className="text-2xl">✓</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">15</div>
                      <div className="text-sm text-gray-500">Passed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">2</div>
                      <div className="text-sm text-gray-500">Warning</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">0</div>
                      <div className="text-sm text-gray-500">Failed</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Test History */}
            <div className="mt-8 bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Test History</h2>
              
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assistant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Test Suite
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Run Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Academic Support
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        Basic Questions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Passed
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        2 hours ago
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Financial Aid
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        FAFSA Questions
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Warning
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        1 day ago
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}