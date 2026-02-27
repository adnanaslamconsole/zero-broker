import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl font-display font-bold mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 16, 2024</p>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p>
                ZeroBroker ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website zerobroker.in (the "Site") and use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
              <p>We collect information that you voluntarily provide to us when you register on the Site, express an interest in obtaining information about us or our products and services, when you participate in activities on the Site, or otherwise when you contact us.</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Personal Data:</strong> Name, email address, phone number, and other contact data.</li>
                <li><strong>Property Data:</strong> Information about properties you list or search for.</li>
                <li><strong>Usage Data:</strong> Information about how you use our website.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect or receive:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>To facilitate account creation and logon process.</li>
                <li>To send you marketing and promotional communications.</li>
                <li>To fulfill and manage your orders and listings.</li>
                <li>To protect our Services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Sharing Your Information</h2>
              <p>We may process or share your data that we hold based on the following legal basis:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Consent:</strong> We may process your data if you have given us specific consent to use your personal information for a specific purpose.</li>
                <li><strong>Legitimate Interests:</strong> We may process your data when it is reasonably necessary to achieve our legitimate business interests.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Contact Us</h2>
              <p>If you have questions or comments about this policy, you may email us at privacy@zerobroker.in or by post to:</p>
              <address className="mt-4 not-italic">
                ZeroBroker, Inc.<br />
                123 Tech Park<br />
                Bangalore, Karnataka 560001<br />
                India
              </address>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
