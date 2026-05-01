// app/terms/page.tsx
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — Finolis",
  description: "Finolis Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-8 py-5 flex items-center justify-between max-w-5xl mx-auto">
        Finolis
        <Link
          href="/privacy"
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          Privacy Policy →
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-3">
          Legal
        </p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: April 30, 2026</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-10">
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-600">By accessing or using Finolis (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service. These Terms constitute a legally binding agreement between you and Finolis (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              2. Description of Service
            </h2>
            <p className="text-gray-600">
              Finolis is a financial management platform that allows users to record, organize, and
              analyze personal and business expenses. The Service includes expense tracking, report
              generation, file attachments, and related features as described on our website.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">3. Eligibility</h2>
            <p className="text-gray-600">
              You must be at least 18 years of age to use this Service. By using Finolis, you
              represent and warrant that you have the legal capacity to enter into this agreement
              and that all information you provide is accurate and complete.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">4. User Accounts</h2>
            <p className="text-gray-600">
              To access certain features of the Service, you must create an account. You are
              responsible for maintaining the confidentiality of your account credentials and for
              all activity that occurs under your account. You agree to notify us immediately of any
              unauthorized use of your account. We reserve the right to terminate accounts that
              violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p className="text-gray-600">
              You agree not to use the Service to: (a) upload or transmit any content that is
              unlawful, harmful, or fraudulent; (b) attempt to gain unauthorized access to any part
              of the Service; (c) interfere with or disrupt the integrity or performance of the
              Service; (d) use the Service for any commercial purpose without our prior written
              consent; or (e) violate any applicable local, national, or international law or
              regulation.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              6. Financial Data Disclaimer
            </h2>
            <p className="text-gray-600">
              Finolis is a financial record-keeping tool and does not provide financial, investment,
              tax, or legal advice. The information provided through the Service is for
              organizational purposes only. You are solely responsible for the accuracy of data you
              enter and any decisions made based on information within the Service.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p className="text-gray-600">
              All content, features, and functionality of the Service — including but not limited to
              software, text, graphics, logos, and user interface design — are owned by Finolis and
              protected by applicable intellectual property laws. You may not reproduce, distribute,
              or create derivative works without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">8. Termination</h2>
            <p className="text-gray-600">
              We reserve the right to suspend or terminate your access to the Service at our sole
              discretion, without notice, for conduct that we believe violates these Terms or is
              harmful to other users, us, or third parties. Upon termination, your right to use the
              Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              9. Limitation of Liability
            </h2>
            <p className="text-gray-600">
              To the fullest extent permitted by law, Finolis shall not be liable for any indirect,
              incidental, special, consequential, or punitive damages arising from your use of or
              inability to use the Service. Our total liability for any claim arising from these
              Terms shall not exceed the amount you paid us in the twelve (12) months preceding the
              claim.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
            <p className="text-gray-600">
              We reserve the right to modify these Terms at any time. We will notify you of material
              changes via email or a prominent notice on the Service. Your continued use of the
              Service after changes become effective constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">11. Governing Law</h2>
            <p className="text-gray-600">
              These Terms are governed by and construed in accordance with the laws of the Republic
              of Peru, without regard to its conflict of law provisions. Any dispute arising from
              these Terms shall be subject to the exclusive jurisdiction of the courts located in
              Lima, Peru.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">12. Contact</h2>
            <p className="text-gray-600">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@finolis.app" className="text-violet-600 hover:underline">
                legal@finolis.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
