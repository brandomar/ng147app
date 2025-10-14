import React from 'react';
import { useBrand } from '../../contexts/BrandContext';
import { getDefaultBrandConfig } from '../../lib/brandDefaults';

export const TermsAndConditions: React.FC = () => {
  const { brandConfig } = useBrand();
  
  // Fallback to defaults if brandConfig is not available
  const config = brandConfig || getDefaultBrandConfig();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Terms and Conditions
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-600 mb-8">
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-700 mb-4">
                By accessing and using {config.companyName}'s dashboard
                services, you accept and agree to be bound by the terms and
                provision of this agreement. If you do not agree to abide by the
                above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Description of Service
              </h2>
              <p className="text-gray-700 mb-4">
                {config.companyName} provides a business intelligence dashboard
                platform that allows users to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Connect and sync data from various business sources</li>
                <li>Visualize and analyze business metrics and KPIs</li>
                <li>Generate reports and insights from business data</li>
                <li>Collaborate on business intelligence across teams</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. User Responsibilities
              </h2>
              <p className="text-gray-700 mb-4">
                As a user of our service, you agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Provide accurate and complete information when creating your
                  account
                </li>
                <li>Maintain the security of your account credentials</li>
                <li>Use the service only for lawful business purposes</li>
                <li>Not attempt to gain unauthorized access to our systems</li>
                <li>
                  Not use the service to transmit malicious code or harmful
                  content
                </li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Respect the intellectual property rights of others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Data and Privacy
              </h2>
              <p className="text-gray-700 mb-4">
                Your use of our service is also governed by our Privacy Policy.
                By using our service, you consent to the collection and use of
                information as outlined in our Privacy Policy.
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  You retain ownership of all data you upload to our platform
                </li>
                <li>
                  We will not use your data for purposes other than providing
                  our service
                </li>
                <li>
                  You are responsible for ensuring you have the right to upload
                  and process your data
                </li>
                <li>
                  We implement appropriate security measures to protect your
                  data
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Service Availability
              </h2>
              <p className="text-gray-700 mb-4">
                We strive to maintain high service availability but cannot
                guarantee uninterrupted access. We may:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Perform scheduled maintenance that may temporarily interrupt
                  service
                </li>
                <li>Update or modify the service to improve functionality</li>
                <li>
                  Suspend service in case of security threats or violations
                </li>
                <li>Discontinue service with reasonable notice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Intellectual Property
              </h2>
              <p className="text-gray-700 mb-4">
                The service and its original content, features, and
                functionality are owned by {config.companyName} and are
                protected by international copyright, trademark, patent, trade
                secret, and other intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Limitation of Liability
              </h2>
              <p className="text-gray-700 mb-4">
                To the maximum extent permitted by law, {config.companyName}{" "}
                shall not be liable for any indirect, incidental, special,
                consequential, or punitive damages, including without
                limitation, loss of profits, data, use, goodwill, or other
                intangible losses, resulting from your use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Indemnification
              </h2>
              <p className="text-gray-700 mb-4">
                You agree to defend, indemnify, and hold harmless{" "}
                {config.companyName} and its officers, directors, employees, and
                agents from and against any claims, damages, obligations,
                losses, liabilities, costs, or debt, and expenses (including
                attorney's fees) arising from your use of the service or
                violation of these terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Termination
              </h2>
              <p className="text-gray-700 mb-4">
                We may terminate or suspend your account and access to the
                service immediately, without prior notice or liability, for any
                reason whatsoever, including without limitation if you breach
                the Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Governing Law
              </h2>
              <p className="text-gray-700 mb-4">
                These Terms shall be interpreted and governed by the laws of
                [Your Jurisdiction], without regard to its conflict of law
                provisions. Our failure to enforce any right or provision of
                these Terms will not be considered a waiver of those rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Changes to Terms
              </h2>
              <p className="text-gray-700 mb-4">
                We reserve the right, at our sole discretion, to modify or
                replace these Terms at any time. If a revision is material, we
                will try to provide at least 30 days notice prior to any new
                terms taking effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Contact Information
              </h2>
              <p className="text-gray-700 mb-4">
                If you have any questions about these Terms and Conditions,
                please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Email:</strong> {config.supportEmail}<br />
                  <strong>Company:</strong> {config.companyName}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
