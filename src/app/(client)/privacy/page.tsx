import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Finolis",
  description: "Finolis Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-5 flex items-center justify-between max-w-5xl mx-auto">
        Finolis
        <Link href="/terms" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
          Terms of Service →
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-3">
          Legal
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: April 30, 2026</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-10">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p className="text-gray-600">
              Finolis (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to
              protecting your personal information. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your data when you use our Service. Please read this
              policy carefully. If you disagree with its terms, please discontinue use of the
              Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              2. Information We Collect
            </h2>
            <p className="text-gray-600">
              We collect information you provide directly, including: (a){" "}
              <strong>Account data</strong> — your name, email address, and profile image obtained
              via Google OAuth; (b) <strong>Financial data</strong> — expense records, amounts,
              categories, and uploaded documents you input into the Service; (c){" "}
              <strong>Usage data</strong> — information about how you interact with the Service,
              including access times, pages viewed, and actions taken.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              3. How We Use Your Information
            </h2>
            <p className="text-gray-600">
              We use the information we collect to: operate and maintain the Service; authenticate
              your identity and manage your account; generate reports and analytics within your
              workspace; communicate with you regarding your account or the Service; improve and
              develop new features; and comply with applicable legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              4. Data Storage and Security
            </h2>
            <p className="text-gray-600">
              Your data is stored on secure servers provided by Supabase and Amazon Web Services
              (AWS), both of which maintain industry-standard security certifications. We implement
              technical and organizational measures to protect your data against unauthorized
              access, alteration, disclosure, or destruction. However, no method of electronic
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Third-Party Services</h2>
            <p className="text-gray-600">
              We use the following third-party services to operate the platform:{" "}
              <strong>Google OAuth</strong> for authentication; <strong>Supabase</strong> for
              database and storage; <strong>Resend</strong> for transactional email; and{" "}
              <strong>Vercel</strong> for hosting. These services may collect and process data in
              accordance with their own privacy policies. We do not sell your data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">6. Data Retention</h2>
            <p className="text-gray-600">
              We retain your personal data for as long as your account remains active or as needed
              to provide the Service. If you delete your account, we will delete or anonymize your
              data within 30 days, except where retention is required by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="text-gray-600">
              Depending on your jurisdiction, you may have the right to: access the personal data we
              hold about you; request correction of inaccurate data; request deletion of your data;
              object to or restrict certain processing activities; and data portability. To exercise
              any of these rights, contact us at{" "}
              <a href="mailto:privacy@finolis.app" className="text-violet-600 hover:underline">
                privacy@finolis.app
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">8. Cookies</h2>
            <p className="text-gray-600">
              We use session cookies strictly necessary for authentication and Service
              functionality. We do not use tracking cookies or third-party advertising cookies. You
              may configure your browser to refuse cookies, but this may affect certain features of
              the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-gray-600">
              The Service is not directed to individuals under the age of 18. We do not knowingly
              collect personal information from children. If you become aware that a child has
              provided us with personal data, please contact us and we will take steps to delete
              such information.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              10. Changes to This Policy
            </h2>
            <p className="text-gray-600">
              We may update this Privacy Policy from time to time. We will notify you of significant
              changes by posting the new policy on this page and updating the &quot;Last
              updated&quot; date. Your continued use of the Service after changes take effect
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p className="text-gray-600">
              For questions or concerns about this Privacy Policy, please contact our Data
              Protection team at{" "}
              <a href="mailto:privacy@finolis.app" className="text-violet-600 hover:underline">
                privacy@finolis.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
