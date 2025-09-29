import { useState } from 'react'
import { useAuth } from '../../lib/auth'
import Layout from '../../components/layout/Layout'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

export default function NewAssistant() {
  const { user, loading, isAuthenticated } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      alert('Assistant created successfully! (Demo)')
    }, 2000)
  }

  return (
    <Layout>
      <div className="min-h-screen bg-secondary-50">
        <div className="py-6">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-secondary-900">
                Create New Assistant
              </h1>
              <p className="mt-1 text-secondary-600">
                Set up a new AI assistant for your department or service area
              </p>
            </div>
            
            <div className="bg-white shadow rounded-lg">
              <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Assistant Configuration</h2>
                </div>
                
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 gap-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Assistant Name *
                        </label>
                        <input
                          type="text"
                          className="mt-1 input"
                          placeholder="e.g., Academic Support Assistant"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Department/Service Area *
                        </label>
                        <select className="mt-1 input" required>
                          <option value="">Select a department</option>
                          <option value="academic">Academic Support</option>
                          <option value="financial">Financial Aid</option>
                          <option value="student-life">Student Life</option>
                          <option value="registrar">Registrar</option>
                          <option value="housing">Housing & Residence Life</option>
                          <option value="health">Health Services</option>
                          <option value="career">Career Services</option>
                          <option value="library">Library Services</option>
                          <option value="it">IT Support</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Description *
                      </label>
                      <textarea
                        rows={3}
                        className="mt-1 input"
                        placeholder="Brief description of what this assistant will help with..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Welcome Message
                      </label>
                      <textarea
                        rows={3}
                        className="mt-1 input"
                        placeholder="Hi! I'm here to help you with academic support questions. How can I assist you today?"
                      />
                    </div>

                    {/* Advanced Settings */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Response Length
                          </label>
                          <select className="mt-1 input">
                            <option value="short">Short (1-2 sentences)</option>
                            <option value="medium" selected>Medium (1-2 paragraphs)</option>
                            <option value="long">Long (Detailed explanations)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Response Tone
                          </label>
                          <select className="mt-1 input">
                            <option value="professional" selected>Professional</option>
                            <option value="friendly">Friendly</option>
                            <option value="casual">Casual</option>
                            <option value="formal">Formal</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" />
                          <span className="ml-2 text-sm text-gray-700">
                            Enable conversation history tracking
                          </span>
                        </label>
                      </div>

                      <div className="mt-2">
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">
                            Send email notifications for new conversations
                          </span>
                        </label>
                      </div>

                      <div className="mt-2">
                        <label className="flex items-center">
                          <input type="checkbox" className="h-4 w-4 text-primary-600 rounded" defaultChecked />
                          <span className="ml-2 text-sm text-gray-700">
                            Include this assistant in public directory
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Knowledge Base */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Knowledge Base</h3>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="mb-4">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Upload documents to train your assistant
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          Supported formats: PDF, DOC, DOCX, TXT, CSV, XLS, XLSX
                        </p>
                        <button type="button" className="btn-outline">
                          Choose Files
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-2">
                        You can also add documents later from the assistant management page.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Creating...</span>
                      </>
                    ) : (
                      'Create Assistant'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}