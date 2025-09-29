import { useAuth } from '../../lib/auth'
import Layout from '../../components/layout/Layout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function Settings() {
  const { user, loading, isAuthenticated, logout } = useAuth()

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
                Settings
              </h1>
              <p className="mt-1 text-secondary-600">
                Manage your account and application preferences
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Account Settings */}
              <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Account Information</h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={user?.firstName || ''}
                            className="mt-1 input"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={user?.lastName || ''}
                            className="mt-1 input"
                            readOnly
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={user?.email || ''}
                          className="mt-1 input"
                          readOnly
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={user?.institution || 'Vanderbilt University'}
                          className="mt-1 input"
                          readOnly
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <input
                          type="text"
                          value={user?.role || 'Staff'}
                          className="mt-1 input"
                          readOnly
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button className="btn-outline">
                        Edit Profile
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white shadow rounded-lg mt-8">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
                  </div>
                  <div className="px-6 py-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Email Notifications</h3>
                          <p className="text-sm text-gray-500">Receive email alerts for important events</p>
                        </div>
                        <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Test Completion Alerts</h3>
                          <p className="text-sm text-gray-500">Get notified when quality assurance tests complete</p>
                        </div>
                        <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Document Processing</h3>
                          <p className="text-sm text-gray-500">Alerts when documents are processed or fail to process</p>
                        </div>
                        <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Weekly Reports</h3>
                          <p className="text-sm text-gray-500">Receive weekly usage and analytics reports</p>
                        </div>
                        <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <button className="btn-primary">
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-6">
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  
                  <div className="space-y-3">
                    <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50">
                      <h4 className="font-medium text-gray-900">Change Password</h4>
                      <p className="text-sm text-gray-500">Update your account password</p>
                    </button>
                    
                    <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50">
                      <h4 className="font-medium text-gray-900">Download Data</h4>
                      <p className="text-sm text-gray-500">Export your assistant data</p>
                    </button>
                    
                    <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50">
                      <h4 className="font-medium text-gray-900">API Keys</h4>
                      <p className="text-sm text-gray-500">Manage API access tokens</p>
                    </button>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account</h3>
                  
                  <div className="space-y-3">
                    <button 
                      onClick={logout}
                      className="w-full text-left p-3 rounded-lg border hover:bg-red-50 border-red-200"
                    >
                      <h4 className="font-medium text-red-900">Sign Out</h4>
                      <p className="text-sm text-red-600">Sign out of your account</p>
                    </button>
                  </div>
                </div>

                {/* System Info */}
                <div className="bg-white shadow rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Application Version</span>
                      <span className="text-gray-900">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Login</span>
                      <span className="text-gray-900">Today, 2:30 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Created</span>
                      <span className="text-gray-900">Sept 29, 2024</span>
                    </div>
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