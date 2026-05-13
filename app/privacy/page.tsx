import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
          <p className="mb-4">
            At Tanzania Library Association, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Information We Collect</h2>
          <p className="mb-2">We may collect the following types of information:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Personal identification information (Name, email address, phone number, etc.)</li>
            <li>Demographic information (age, gender, location, etc.)</li>
            <li>Membership details and transaction history</li>
            <li>Usage data and website analytics</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. How We Use Your Information</h2>
          <p className="mb-2">We may use the information we collect for various purposes, including to:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Process and manage your membership</li>
            <li>Communicate with you about your account or our services</li>
            <li>Improve our website and services</li>
            <li>Send promotional emails (you may opt-out at any time)</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Data Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or rent your personal information to third parties. We may share information with trusted third parties who assist us in operating our website and services, as long as they agree to keep this information confidential.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Your Rights</h2>
          <p className="mb-2">You have the right to:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Access your personal information</li>
            <li>Request correction of your personal information</li>
            <li>Request deletion of your personal information</li>
            <li>Object to processing of your personal information</li>
            <li>Request restriction of processing your personal information</li>
            <li>Request transfer of your personal information</li>
            <li>Withdraw consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Cookies</h2>
          <p className="mb-4">
            Our website uses cookies to enhance your experience. You can set your browser to refuse all or some browser cookies, but this may limit your ability to use certain features of our website.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">8. Changes to This Privacy Policy</h2>
          <p className="mb-4">
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2">
            Tanzania Library Association<br />
            Email: privacy@tanzanialibrary.org<br />
            Phone: +255 XXX XXX XXX
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <Link href="/terms" className="text-emerald-600 hover:text-emerald-800">
          View our Terms and Conditions →
        </Link>
      </div>
    </div>
  );
}
