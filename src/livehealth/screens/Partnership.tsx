import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Icon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { StatusPill } from "../components/StatusPill";
import { useLanguage } from "../../contexts/LanguageContext";
import { useBreakpoint } from "../lib/useBreakpoint";
import { T } from "../components/T";

const ACCENT = "#4ee0c4";

// Themed Partnership screen — re-implements the public partnership page on top
// of the LiveHealth+ design system so it matches the rest of the redesign. Form
// still posts to Formspree; copy still resolves through useLanguage().t() for
// the existing 10-language locale files.
const schema = z.object({
  name: z.string().min(2, "Please enter your name"),
  organization: z.string().min(2, "Please enter your organization"),
  email: z.string().email("Enter a valid email"),
  message: z.string().min(10, "Tell us a bit more about your goals"),
});
type FormValues = z.infer<typeof schema>;

export default function PartnershipScreen() {
  const location = useLocation();
  const canonical = `${window.location.origin}${location.pathname}`;
  const { t } = useLanguage();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTabletDown = bp !== "desktop";
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", organization: "", email: "", message: "" },
  });
  const { register, handleSubmit, reset, formState } = form;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("https://formspree.io/f/mlgrzwvr", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...values,
          _subject: `Partnership Inquiry from ${values.name} - ${values.organization}`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || data?.message || "Submission failed.");
      }
      setSubmitted(true);
      reset();
    } catch (e: any) {
      setSubmitError(e?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--ln-surface)",
    border: "1px solid var(--ln-line-2)",
    borderRadius: 6,
    padding: "10px 12px",
    color: "var(--ln-ink)",
    fontSize: 13.5,
    fontFamily: "var(--ln-font-sans)",
  };

  const collaborators = [
    { icon: <Icon.Globe />, label: t("landing.partnership.collaboratePublicHealth") },
    { icon: <Icon.News />, label: t("landing.partnership.collaborateUniversities") },
    { icon: <Icon.Pulse />, label: t("landing.partnership.collaborateHealthcare") },
    { icon: <Icon.Chart />, label: t("landing.partnership.collaborateTechnology") },
    { icon: <Icon.Layers />, label: t("landing.partnership.collaborateNgos") },
    { icon: <Icon.Sparkles />, label: t("landing.partnership.collaborateFoundations") },
  ];

  const reasons = [
    { k: "Advance", title: t("landing.partnership.whyAdvanceTitle"), body: t("landing.partnership.whyAdvanceBody") },
    { k: "Tech", title: t("landing.partnership.whyTechTitle"), body: t("landing.partnership.whyTechBody") },
    { k: "Systems", title: t("landing.partnership.whySystemsTitle"), body: t("landing.partnership.whySystemsBody") },
    { k: "Innovation", title: t("landing.partnership.whyInnovationTitle"), body: t("landing.partnership.whyInnovationBody") },
    { k: "Protect", title: t("landing.partnership.whyProtectTitle"), body: t("landing.partnership.whyProtectBody") },
    { k: "Prevent", title: t("landing.partnership.whyPreventTitle"), body: t("landing.partnership.whyPreventBody") },
  ];

  return (
    <div className="ln-app" style={{ minHeight: "100vh", background: "var(--ln-bg)", color: "var(--ln-ink)" }}>
      <Helmet>
        <title>Become a Partner | OutbreakNow</title>
        <meta
          name="description"
          content="Partner with OutbreakNow to build the next generation of real-time global outbreak intelligence and save lives."
        />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "12px 16px" : "18px 32px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-topbar)",
          gap: 12,
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 14 : 36, minWidth: 0 }}>
          <Link to="/" style={{ display: "inline-flex" }}>
            <Logo color={ACCENT} />
          </Link>
          {!isMobile && (
            <nav style={{ display: "flex", gap: 24 }}>
              {[
                { l: "Surveillance", to: "/map" },
                { l: "Analytics", to: "/dashboard" },
                { l: "News", to: "/news" },
                { l: "About", to: "/about" },
                { l: "Become a partner", to: "/partnership" },
              ].map((it) => (
                <Link
                  key={it.l}
                  to={it.to}
                  style={{ fontSize: 13, color: "var(--ln-ink-2)", textDecoration: "none" }}
                >
                  <T>{it.l}</T>
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {!isMobile && <StatusPill />}
          {!isMobile && <div style={{ width: 1, height: 18, background: "var(--ln-line)" }} />}
          <LanguageSelector />
          <ThemeToggle />
          <Link to="/map" className="ln-btn is-primary">
            <T>Open map</T> <Icon.ArrowR />
          </Link>
        </div>
      </header>

      <section
        style={{
          padding: isMobile ? "48px 18px 28px" : "72px 32px 36px",
          borderBottom: "1px solid var(--ln-line)",
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--ln-brand) 8%, transparent) 0%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <span className="ln-eyebrow"><T>Partnership</T></span>
          <h1
            className="ln-display"
            style={{
              fontSize: isMobile ? 36 : isTabletDown ? 56 : 72,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              margin: "10px 0 18px",
            }}
          >
            {t("landing.partnership.heroTitle")}
          </h1>
          <p
            style={{
              fontSize: isMobile ? 16 : 20,
              color: "var(--ln-ink-2)",
              lineHeight: 1.45,
              margin: "0 0 12px",
              maxWidth: 760,
              fontStyle: "italic",
            }}
          >
            {t("landing.partnership.heroSubtitle")}
          </p>
          <p
            style={{
              fontSize: isMobile ? 13.5 : 15,
              color: "var(--ln-ink-3)",
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 760,
            }}
          >
            {t("landing.partnership.heroBody")}
          </p>
        </div>
      </section>

      <section style={{ padding: isMobile ? "36px 18px" : "56px 32px", borderBottom: "1px solid var(--ln-line)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 22 : 32 }}>
            <span className="ln-eyebrow"><T>Who we work with</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 26 : 36, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              {t("landing.partnership.collaborateTitle")}
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : isTabletDown ? "repeat(3, 1fr)" : "repeat(6, 1fr)",
              gap: 12,
              marginBottom: 18,
            }}
          >
            {collaborators.map((c) => (
              <div
                key={c.label}
                style={{
                  border: "1px solid var(--ln-line)",
                  background: "var(--ln-surface)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 10,
                  transition: "border-color .15s, transform .15s",
                }}
              >
                <span style={{ color: "var(--ln-brand)" }}>{c.icon}</span>
                <span style={{ fontSize: 12.5, color: "var(--ln-ink-2)", lineHeight: 1.35 }}>{c.label}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              padding: 16,
              background: "color-mix(in oklab, var(--ln-brand) 8%, transparent)",
              border: "1px solid color-mix(in oklab, var(--ln-brand) 30%, transparent)",
              fontSize: 13,
              color: "var(--ln-ink-2)",
              lineHeight: 1.55,
            }}
          >
            {t("landing.partnership.collaborateNote")}
          </div>
        </div>
      </section>

      <section
        style={{
          padding: isMobile ? "36px 18px" : "56px 32px",
          borderBottom: "1px solid var(--ln-line)",
          background: "var(--ln-surface)",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <div style={{ marginBottom: isMobile ? 22 : 32 }}>
            <span className="ln-eyebrow"><T>Why partner</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 26 : 36, margin: "6px 0 0", letterSpacing: "-0.02em" }}
            >
              {t("landing.partnership.whyTitle")}
            </h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : isTabletDown ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            {reasons.map((r) => (
              <div
                key={r.k}
                style={{
                  border: "1px solid var(--ln-line)",
                  background: "var(--ln-bg)",
                  padding: 20,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 32,
                    height: 2,
                    background: "var(--ln-brand)",
                  }}
                />
                <h3 style={{ fontSize: 16, margin: "10px 0 8px", fontWeight: 500 }}>{r.title}</h3>
                <p style={{ fontSize: 13, color: "var(--ln-ink-3)", lineHeight: 1.55, margin: 0 }}>{r.body}</p>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 24,
              padding: "20px 22px",
              border: "1px solid color-mix(in oklab, var(--ln-brand) 30%, transparent)",
              background: "color-mix(in oklab, var(--ln-brand) 8%, transparent)",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: isMobile ? 14 : 16, color: "var(--ln-ink-2)", margin: "0 0 6px" }}>
              {t("landing.partnership.movementLine1")}
            </p>
            <p
              style={{
                fontSize: isMobile ? 16 : 18,
                color: "var(--ln-brand)",
                fontWeight: 500,
                margin: 0,
              }}
            >
              {t("landing.partnership.movementLine2")}
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: isMobile ? "36px 18px" : "64px 32px", borderBottom: "1px solid var(--ln-line)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ marginBottom: 22, textAlign: "center" }}>
            <span className="ln-eyebrow"><T>Get in touch</T></span>
            <h2
              className="ln-display"
              style={{ fontSize: isMobile ? 26 : 32, margin: "6px 0 8px", letterSpacing: "-0.02em" }}
            >
              {t("landing.partnership.formTitle")}
            </h2>
            <p style={{ fontSize: 14, color: "var(--ln-ink-3)", lineHeight: 1.5, margin: 0 }}>
              {t("landing.partnership.formSubtitle")}
            </p>
          </div>

          {submitted ? (
            <div
              style={{
                border: "1px solid color-mix(in oklab, var(--ln-brand) 40%, transparent)",
                background: "color-mix(in oklab, var(--ln-brand) 10%, transparent)",
                padding: "20px 22px",
                textAlign: "center",
              }}
            >
              <h3 style={{ fontSize: 18, color: "var(--ln-brand)", margin: "0 0 6px" }}><T>Thanks — message received.</T></h3>
              <p style={{ fontSize: 13.5, color: "var(--ln-ink-2)", margin: 0 }}>
                <T>We'll get back to you by email shortly.</T>
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              style={{
                border: "1px solid var(--ln-line)",
                background: "var(--ln-surface)",
                padding: isMobile ? "20px 18px" : "26px 28px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field
                  label={t("landing.partnership.formNameLabel")}
                  error={formState.errors.name?.message}
                >
                  <input
                    {...register("name")}
                    placeholder={t("landing.partnership.formNamePlaceholder")}
                    style={inputStyle}
                  />
                </Field>
                <Field
                  label={t("landing.partnership.formOrgLabel")}
                  error={formState.errors.organization?.message}
                >
                  <input
                    {...register("organization")}
                    placeholder={t("landing.partnership.formOrgPlaceholder")}
                    style={inputStyle}
                  />
                </Field>
              </div>
              <Field
                label={t("landing.partnership.formEmailLabel")}
                error={formState.errors.email?.message}
              >
                <input
                  type="email"
                  {...register("email")}
                  placeholder={t("landing.partnership.formEmailPlaceholder")}
                  style={inputStyle}
                />
              </Field>
              <Field
                label={t("landing.partnership.formMessageLabel")}
                error={formState.errors.message?.message}
              >
                <textarea
                  {...register("message")}
                  placeholder={t("landing.partnership.formMessagePlaceholder")}
                  rows={5}
                  style={{ ...inputStyle, resize: "vertical", minHeight: 110 }}
                />
              </Field>
              {submitError && (
                <div
                  style={{
                    padding: 10,
                    border: "1px solid color-mix(in oklab, var(--ln-crit) 40%, transparent)",
                    background: "color-mix(in oklab, var(--ln-crit) 10%, transparent)",
                    color: "var(--ln-crit)",
                    fontSize: 12.5,
                  }}
                >
                  {submitError}
                </div>
              )}
              <button
                type="submit"
                className="ln-btn is-primary"
                disabled={submitting}
                style={{ width: "100%", justifyContent: "center", padding: "12px 0", fontSize: 14 }}
              >
                {submitting ? <T>Submitting…</T> : t("landing.partnership.formSubmit")} <Icon.ArrowR />
              </button>
            </form>
          )}
        </div>
      </section>

      <SimpleFooter />
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontFamily: "var(--ln-font-mono)",
          fontSize: 10,
          letterSpacing: "0.1em",
          color: "var(--ln-ink-3)",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {error && (
        <span style={{ display: "block", fontSize: 11.5, color: "var(--ln-crit)", marginTop: 4 }}><T>{error}</T></span>
      )}
    </label>
  );
}

function SimpleFooter() {
  return (
    <footer
      style={{
        padding: "32px 32px 28px",
        background: "var(--ln-surface)",
        borderTop: "1px solid var(--ln-line)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          fontFamily: "var(--ln-font-mono)",
          fontSize: 11,
          color: "var(--ln-ink-4)",
        }}
      >
        <span>© {new Date().getFullYear()} EldoNova+ Technologies - New York, NY</span>
        <span>
          <Link to="/privacy" style={{ color: "var(--ln-ink-3)", textDecoration: "none", marginRight: 14 }}>
            <T>Privacy</T>
          </Link>
          <Link to="/partnership" style={{ color: "var(--ln-ink-3)", textDecoration: "none" }}>
            <T>Partnership</T>
          </Link>
        </span>
      </div>
    </footer>
  );
}
