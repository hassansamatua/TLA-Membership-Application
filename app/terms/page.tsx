import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
        <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
      </div>
      
      <div className="prose max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">1. Introduction</h2>
          <p className="mb-4">
            Welcome to Tanzania Library Association. These terms and conditions outline the rules and regulations for the use of our website and services.
          </p>
          <p>
            By accessing this website, we assume you accept these terms and conditions in full. Do not continue to use our services if you do not accept all of the terms and conditions stated on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">2. Membership</h2>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Membership is open to all individuals and organizations that meet our criteria.</li>
            <li>Membership fees are non-refundable.</li>
            <li>We reserve the right to accept or reject any membership application.</li>
            <li>Members are responsible for keeping their login credentials secure.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">3. Code of Conduct</h2>
          <p className="mb-4">
            Members agree to:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Respect all members and staff</li>
            <li>Use library resources responsibly</li>
            <li>Adhere to all library policies</li>
            <li>Not engage in any illegal activities on the premises</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">4. Intellectual Property</h2>
          <p className="mb-4">
            All content on this website, including text, graphics, logos, and images, is the property of Tanzania Library Association and is protected by copyright laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">5. Limitation of Liability</h2>
          <p className="mb-4">
            Tanzania Library Association will not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of or inability to use the services.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">6. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting on the website.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">7. Contact Us</h2>
          <p>
            If you have any questions about these Terms and Conditions, please contact us at:
          </p>
          <p className="mt-2">
            Tanzania Library Association<br />
            Email: info@tanzanialibrary.org<br />
            Phone: +255 XXX XXX XXX
          </p>
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200">
        <Link href="/privacy" className="text-green-600 hover:text-green-800">
          View our Privacy Policy →
        </Link>
      </div>
    </div>
  );
}
