import { Helmet } from "react-helmet-async";
import { useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import outbreakNowLogo from "@/assets/outbreaknow-logo.png";
import { Footer } from "@/components/Footer";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { Shield, Lock, Eye, FileText, Mail } from "lucide-react";

const PrivacyPolicy = () => {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      <Helmet>
        <title>Privacy Policy | OutbreakNow</title>
        <meta name="description" content="OutbreakNow Privacy Policy - Learn how we protect your privacy and handle your personal information." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container-prose py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="transition-opacity hover:opacity-80">
              <img src={outbreakNowLogo} alt="OutbreakNow Logo" className="h-24 w-auto" />
            </Link>
            <div className="flex-1 flex items-center justify-end gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  {t("common.home")}
                </Button>
              </Link>
              <Link to="/map">
                <Button variant="ghost" size="sm">
                  {t("common.map")}
                </Button>
              </Link>

              {/* Language Selector */}
              <div className="ml-4">
                <label className="sr-only" htmlFor="privacy-language-select">
                  Select language
                </label>
                <select
                  id="privacy-language-select"
                  className="border border-border rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.nativeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="section pt-16 pb-12 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="container-prose">
            <div className="mx-auto max-w-4xl text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Privacy Policy
              </h1>
              <p className="text-lg text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy Content */}
        <section className="section py-12">
          <div className="container-prose">
            <div className="mx-auto max-w-4xl prose prose-slate dark:prose-invert">
              <div className="space-y-8">
                {/* Introduction */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-primary" />
                    Introduction
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    OutbreakNow ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <a href="https://outbreaknow.org" className="text-primary hover:underline">https://outbreaknow.org</a> and use our services.
                  </p>
                </div>

                {/* Information We Collect */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Eye className="w-6 h-6 text-primary" />
                    Information We Collect
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Personal Information</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        We may collect personal information that you voluntarily provide to us when you:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                        <li>Register for an account</li>
                        <li>Subscribe to our newsletter</li>
                        <li>Contact us via email or contact forms</li>
                        <li>Make a donation</li>
                        <li>Submit feedback or participate in surveys</li>
                      </ul>
                      <p className="text-muted-foreground leading-relaxed mt-4">
                        This information may include your name, email address, organization, and any other information you choose to provide.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Automatically Collected Information</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        When you visit our website, we automatically collect certain information about your device, including:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground ml-4">
                        <li>IP address</li>
                        <li>Browser type and version</li>
                        <li>Operating system</li>
                        <li>Pages you visit and time spent on pages</li>
                        <li>Referring website addresses</li>
                        <li>Date and time of access</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* How We Use Your Information */}
                <div>
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Lock className="w-6 h-6 text-primary" />
                    How We Use Your Information
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Process your donations and send receipts</li>
                    <li>Send you newsletters and updates (with your consent)</li>
                    <li>Respond to your inquiries and provide customer support</li>
                    <li>Monitor and analyze usage patterns to improve user experience</li>
                    <li>Detect, prevent, and address technical issues</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>

                {/* Data Protection */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Data Protection</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </div>

                {/* Data Sharing */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Data Sharing and Disclosure</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>With service providers who assist us in operating our website and conducting our business (under strict confidentiality agreements)</li>
                    <li>When required by law or to respond to legal process</li>
                    <li>To protect our rights, privacy, safety, or property</li>
                    <li>In connection with a merger, acquisition, or sale of assets (with notice to users)</li>
                  </ul>
                </div>

                {/* Cookies and Tracking */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Cookies and Tracking Technologies</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We use cookies and similar tracking technologies to track activity on our website and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our website.
                  </p>
                </div>

                {/* Your Rights */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Your Rights</h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Depending on your location, you may have the following rights regarding your personal information:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                    <li>Access: Request access to your personal information</li>
                    <li>Correction: Request correction of inaccurate information</li>
                    <li>Deletion: Request deletion of your personal information</li>
                    <li>Objection: Object to processing of your personal information</li>
                    <li>Portability: Request transfer of your personal information</li>
                    <li>Withdrawal: Withdraw consent where processing is based on consent</li>
                  </ul>
                </div>

                {/* Children's Privacy */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Children's Privacy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us, and we will take steps to delete such information.
                  </p>
                </div>

                {/* Changes to This Policy */}
                <div>
                  <h2 className="text-2xl font-bold mb-4">Changes to This Privacy Policy</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                  </p>
                </div>

                {/* Contact Us */}
                <div className="rounded-lg border bg-card p-6 mt-8">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <Mail className="w-6 h-6 text-primary" />
                    Contact Us
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    If you have any questions about this Privacy Policy, please contact us:
                  </p>
                  <div className="space-y-2">
                    <p className="text-foreground">
                      <strong>Email:</strong>{" "}
                      <a href="mailto:contact@theghqa.org" className="text-primary hover:underline">
                        contact@theghqa.org
                      </a>
                    </p>
                    <p className="text-foreground">
                      <strong>Website:</strong>{" "}
                      <a href="https://outbreaknow.org" className="text-primary hover:underline">
                        https://outbreaknow.org
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default PrivacyPolicy;

