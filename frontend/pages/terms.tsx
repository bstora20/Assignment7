export default function Terms() {
  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <h1 className="text-3xl font-bold text-secondary-900 mb-8">
              Terms of Service
            </h1>
            
            <div className="prose max-w-none">
              <p className="text-gray-600 mb-6">
                Last updated: September 29, 2024
              </p>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                <p className="text-gray-700 mb-4">
                  By accessing and using the Student Support Assistant application, you accept and agree to be bound by the terms and provision of this agreement.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Use License</h2>
                <p className="text-gray-700 mb-4">
                  Permission is granted to temporarily use the Student Support Assistant application for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  <li>modify or copy the materials</li>
                  <li>use the materials for any commercial purpose or for any public display</li>
                  <li>attempt to reverse engineer any software contained in the application</li>
                  <li>remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Privacy and Data Protection</h2>
                <p className="text-gray-700 mb-4">
                  Your privacy is important to us. We collect and use information in accordance with our Privacy Policy. By using this service, you agree to the collection and use of information in accordance with our privacy practices.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibond text-gray-900 mb-4">4. User Responsibilities</h2>
                <p className="text-gray-700 mb-4">
                  Users are responsible for:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4">
                  <li>Maintaining the confidentiality of their account credentials</li>
                  <li>Using the service in compliance with applicable laws and regulations</li>
                  <li>Not uploading or sharing inappropriate, harmful, or illegal content</li>
                  <li>Respecting the rights and privacy of other users</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Service Availability</h2>
                <p className="text-gray-700 mb-4">
                  We strive to maintain high availability of our services, but we do not guarantee uninterrupted access. The service may be temporarily unavailable for maintenance, upgrades, or due to technical difficulties.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Limitation of Liability</h2>
                <p className="text-gray-700 mb-4">
                  In no event shall the Student Support Assistant application or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the application's website.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Changes to Terms</h2>
                <p className="text-gray-700 mb-4">
                  We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Your continued use of the service after any changes constitutes acceptance of the new terms.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact Information</h2>
                <p className="text-gray-700 mb-4">
                  If you have any questions about these Terms of Service, please contact your system administrator or IT support team.
                </p>
              </section>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <button 
                onClick={() => window.history.back()}
                className="btn-primary"
              >
                Back to Registration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}