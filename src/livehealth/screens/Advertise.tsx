import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Loader2,
  CheckCircle,
  MapPin,
  Eye,
  Edit,
  LogIn,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { TopBar } from "./SurveillanceMap";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthDialog } from "@/components/AuthDialog";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Advertise with us — themed (LiveHealth+) ad submission screen.
 *
 * Logic ported 1:1 from src/screens/mainpage/ui/AdvertiseForm.tsx:
 *  - same form fields + validation
 *  - same media upload (sponsored-videos / sponsored-images, fallback
 *    advertising-documents)
 *  - same can_user_submit rate-limit RPC
 *  - same review -> preview -> confirm flow
 *  - same insert into `advertising_submissions` (identical columns,
 *    payment_status: 'not_required', status: 'pending_review')
 *  - same post-submit behaviour: in-place success state (the old form does
 *    NOT navigate to a payment page; payment is requested later from the
 *    advertiser dashboard once status becomes approved_pending_payment).
 */

interface FormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  selectedPlan: string;
  adImage: File | null;
  adImageUrl: string;
  adTitle: string;
  adClickUrl: string;
  adLocation: string;
}

type MediaType = "image" | "video" | "gif" | "animation";

const ACCENT = "#4ee0c4";

export default function AdvertiseScreen() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [rateLimitCheck, setRateLimitCheck] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);

  const advertisingPlans = [
    {
      id: "basic",
      name: t("advertise.plans.basic.name"),
      price: t("advertise.plans.basic.price"),
      priceValue: 30,
      duration: t("advertise.plans.basic.duration"),
      features: [
        t("advertise.plans.basic.feature1"),
        t("advertise.plans.basic.feature2"),
        t("advertise.plans.basic.feature3"),
        t("advertise.plans.basic.feature4"),
      ],
    },
    {
      id: "professional",
      name: t("advertise.plans.professional.name"),
      price: t("advertise.plans.professional.price"),
      priceValue: 75,
      duration: t("advertise.plans.professional.duration"),
      features: [
        t("advertise.plans.professional.feature1"),
        t("advertise.plans.professional.feature2"),
        t("advertise.plans.professional.feature3"),
        t("advertise.plans.professional.feature4"),
        t("advertise.plans.professional.feature5"),
        t("advertise.plans.professional.feature6"),
      ],
    },
    {
      id: "enterprise",
      name: t("advertise.plans.enterprise.name"),
      price: t("advertise.plans.enterprise.price"),
      priceValue: 150,
      duration: t("advertise.plans.enterprise.duration"),
      features: [
        t("advertise.plans.enterprise.feature1"),
        t("advertise.plans.enterprise.feature2"),
        t("advertise.plans.enterprise.feature3"),
        t("advertise.plans.enterprise.feature4"),
        t("advertise.plans.enterprise.feature5"),
        t("advertise.plans.enterprise.feature6"),
        t("advertise.plans.enterprise.feature7"),
      ],
    },
  ];

  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    contactName: "",
    email: user?.email || "",
    phone: "",
    website: "",
    description: "",
    selectedPlan: "",
    adImage: null,
    adImageUrl: "",
    adTitle: "",
    adClickUrl: "",
    adLocation: "Global",
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getMediaType = (file: File): MediaType | null => {
    const type = file.type.toLowerCase();
    if (type.startsWith("image/")) {
      if (type === "image/gif") return "gif";
      if (type === "image/webp" || type === "image/apng") return "animation";
      return "image";
    }
    if (type.startsWith("video/")) return "video";
    return null;
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    const detectedType = getMediaType(file);
    if (!detectedType) {
      toast({
        title: t("advertise.errors.invalidFileTypeTitle"),
        description: t("advertise.errors.invalidFileTypeDesc"),
        variant: "destructive",
      });
      return;
    }

    const maxSize = detectedType === "video" ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = detectedType === "video" ? 15 : 10;

    if (file.size > maxSize) {
      toast({
        title: t("advertise.errors.fileTooLargeTitle"),
        description: t("advertise.errors.fileTooLargeDesc", { maxSize: maxSizeMB }),
        variant: "destructive",
      });
      return;
    }

    if (detectedType === "video") {
      const videoUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const duration = video.duration;
        window.URL.revokeObjectURL(videoUrl);
        if (duration > 60) {
          toast({
            title: t("advertise.errors.videoTooLongTitle"),
            description: t("advertise.errors.videoTooLongDesc"),
            variant: "destructive",
          });
          setFormData((prev) => ({ ...prev, adImage: null }));
          setMediaType(null);
          return;
        }
      };
      video.onerror = () => {
        window.URL.revokeObjectURL(videoUrl);
      };
      video.src = videoUrl;
    }

    setMediaType(detectedType);
    setFormData((prev) => ({ ...prev, adImage: file }));
  };

  const uploadAdMedia = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `ad-${user?.id || "anonymous"}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${fileExt}`;

      let bucket: string;
      if (mediaType === "video") {
        bucket = "sponsored-videos";
      } else {
        bucket = "sponsored-images";
      }

      const filePath = fileName;
      let uploadError: any = null;

      const { error: primaryError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: mediaType === "video" ? "86400" : "3600",
          upsert: false,
          contentType: file.type,
        });

      uploadError = primaryError;

      if (uploadError) {
        if (
          uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("not found")
        ) {
          if (mediaType === "video") {
            bucket = "advertising-documents";
            const { error: fallbackError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: "86400",
                upsert: false,
                contentType: file.type,
              });
            if (fallbackError) {
              console.error("Video upload error (fallback):", fallbackError);
              uploadError = fallbackError;
            } else {
              uploadError = null;
            }
          } else {
            bucket = "advertising-documents";
            const { error: fallbackError } = await supabase.storage
              .from(bucket)
              .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type,
              });
            if (fallbackError) {
              console.error("Image upload error (fallback):", fallbackError);
              uploadError = fallbackError;
            } else {
              uploadError = null;
            }
          }
        }
      }

      if (uploadError) {
        console.error("Media upload error:", uploadError);

        if (
          uploadError.message.includes("row-level security") ||
          uploadError.message.includes("permission")
        ) {
          toast({
            title: t("advertise.errors.uploadPermissionDeniedTitle"),
            description: t("advertise.errors.uploadPermissionDeniedDesc"),
            variant: "destructive",
          });
          return null;
        }

        if (
          uploadError.message.includes("File size") ||
          uploadError.message.includes("too large")
        ) {
          toast({
            title: t("advertise.errors.fileTooLargeTitle"),
            description: t("advertise.errors.fileTooLargeDesc", { maxSize: 10 }),
            variant: "destructive",
          });
          return null;
        }

        if (
          uploadError.message.includes("content type") ||
          uploadError.message.includes("not allowed")
        ) {
          toast({
            title: t("advertise.errors.invalidFileTypeTitle"),
            description: t("advertise.errors.invalidFileTypeDesc"),
            variant: "destructive",
          });
          return null;
        }

        toast({
          title: t("advertise.errors.uploadFailedTitle"),
          description: t("advertise.errors.uploadFailedDesc", { error: uploadError.message }),
          variant: "destructive",
        });
        return null;
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const mediaUrl = publicUrlData.publicUrl;

      console.log("Media uploaded successfully:", {
        bucket,
        filePath,
        mediaType,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        url: mediaUrl,
      });

      if (bucket === "advertising-documents") {
        console.warn(
          "Media uploaded to private bucket. Videos may not display properly. Consider creating sponsored-videos bucket."
        );
        toast({
          title: t("advertise.errors.uploadSuccessfulTitle"),
          description: t("advertise.errors.uploadSuccessfulDesc"),
          variant: "default",
        });
      }

      return mediaUrl;
    } catch (error: any) {
      console.error("Error uploading media:", error);
      toast({
        title: t("advertise.errors.uploadErrorTitle"),
        description: error.message || t("advertise.errors.uploadErrorDesc"),
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Check authentication and rate limits on mount
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const checkRateLimit = async () => {
      try {
        const { data, error } = await supabase.rpc("can_user_submit", {
          p_user_id: user.id,
        });
        if (error) {
          console.error("Rate limit check error:", error);
          return;
        }
        setRateLimitCheck(data);
      } catch (error) {
        console.error("Error checking rate limit:", error);
      }
    };

    checkRateLimit();
  }, [user, authLoading]);

  // Cleanup preview media URL when component unmounts or preview is closed
  useEffect(() => {
    return () => {
      if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  // Reset media type when file is cleared
  useEffect(() => {
    if (!formData.adImage) {
      setMediaType(null);
    }
  }, [formData.adImage]);

  // Form validation -> show preview
  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user) {
      setAuthDialogOpen(true);
      toast({
        title: t("advertise.errors.loginRequiredTitle"),
        description: t("advertise.errors.loginRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      toast({
        title: t("advertise.errors.limitReachedTitle"),
        description: rateLimitCheck.reason || t("advertise.errors.limitReachedDescFallback"),
        variant: "destructive",
      });
      return;
    }

    if (
      !formData.companyName ||
      !formData.contactName ||
      !formData.email ||
      !formData.selectedPlan
    ) {
      toast({
        title: t("advertise.errors.missingInfoTitle"),
        description: t("advertise.errors.missingInfoDesc"),
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: t("advertise.errors.invalidEmailTitle"),
        description: t("advertise.errors.invalidEmailDesc"),
        variant: "destructive",
      });
      return;
    }

    if (formData.adImage) {
      setPreviewImageUrl(URL.createObjectURL(formData.adImage));
      setMediaType(getMediaType(formData.adImage));
    } else if (formData.adImageUrl) {
      setPreviewImageUrl(formData.adImageUrl);
      const urlLower = formData.adImageUrl.toLowerCase();
      if (urlLower.includes(".mp4") || urlLower.includes(".webm") || urlLower.includes(".mov")) {
        setMediaType("video");
      } else if (urlLower.includes(".gif")) {
        setMediaType("gif");
      } else if (urlLower.includes(".webp") || urlLower.includes(".apng")) {
        setMediaType("animation");
      } else {
        setMediaType("image");
      }
    } else {
      setPreviewImageUrl(null);
      setMediaType(null);
    }

    setShowPreview(true);
    setTimeout(() => {
      const previewElement = document.getElementById("ad-preview-section");
      if (previewElement) {
        previewElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  // Final submission after preview confirmation
  const handleFinalSubmit = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      let imageUrl = formData.adImageUrl;
      if (formData.adImage) {
        const uploadedMediaUrl = await uploadAdMedia(formData.adImage);
        if (uploadedMediaUrl) {
          imageUrl = uploadedMediaUrl;
        }
      }

      const { data, error } = await supabase
        .from("advertising_submissions")
        .insert({
          user_id: user.id,
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email,
          phone: formData.phone || null,
          website: formData.website || null,
          description: formData.description || null,
          selected_plan: formData.selectedPlan,
          document_url: null,
          ad_title: formData.adTitle || null,
          ad_image_url: imageUrl || null,
          ad_click_url: formData.adClickUrl || null,
          ad_location: formData.adLocation || "Global",
          status: "pending_review",
          payment_status: "not_required",
        })
        .select("id")
        .single();

      if (error) {
        console.error("Database error:", error);
        throw new Error(error.message);
      }

      setSubmissionId(data.id);
      setSubmissionSuccess(true);

      toast({
        title: t("advertise.success.title"),
        description: t("advertise.success.desc"),
      });

      setFormData({
        companyName: "",
        contactName: "",
        email: user?.email || "",
        phone: "",
        website: "",
        description: "",
        selectedPlan: "",
        adImage: null,
        adImageUrl: "",
        adTitle: "",
        adClickUrl: "",
        adLocation: "Global",
      });
    } catch (error: any) {
      console.error("Submission error:", error);
      toast({
        title: t("advertise.errors.submitFailedTitle"),
        description: error.message || t("advertise.errors.submitFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewImageUrl);
      }
      setShowPreview(false);
      setPreviewImageUrl(null);
    }
  };

  const selectedPlanDetails = advertisingPlans.find((p) => p.id === formData.selectedPlan);

  // ---- themed style helpers -------------------------------------------------
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 12,
    color: "var(--ln-ink-3)",
    marginBottom: 6,
  };
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--ln-ink)",
    margin: "0 0 6px",
  };
  const fieldGap: React.CSSProperties = { marginBottom: 18 };

  const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="ln-app"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "grid",
        gridTemplateRows: "52px 1fr",
      }}
    >
      <TopBar active="none" />
      <div className="ln-pane" style={{ overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 28px 96px" }}>
          {children}
        </div>
      </div>
      <AuthDialog
        open={authDialogOpen}
        onOpenChange={(open) => setAuthDialogOpen(open)}
        mode="login"
      />
    </div>
  );

  // ---- success state --------------------------------------------------------
  if (submissionSuccess) {
    return (
      <Shell>
        <div
          style={{
            border: `1px solid color-mix(in oklab, ${ACCENT} 40%, transparent)`,
            background: `color-mix(in oklab, ${ACCENT} 8%, var(--ln-surface))`,
            padding: "32px 28px",
            textAlign: "center",
          }}
        >
          <CheckCircle className="w-14 h-14" style={{ color: ACCENT, margin: "0 auto 18px" }} />
          <h2 className="ln-display" style={{ fontSize: 26, margin: "0 0 12px" }}>
            {t("advertise.success.titleShort")}
          </h2>
          <p style={{ color: "var(--ln-ink-3)", fontSize: 14, margin: "0 0 24px" }}>
            {t("advertise.success.longDesc")}
          </p>

          <div
            style={{
              border: "1px solid var(--ln-line)",
              background: "var(--ln-surface)",
              padding: "18px 20px",
              textAlign: "left",
              marginBottom: 22,
            }}
          >
            <h3 style={sectionTitleStyle}>{t("advertise.success.nextStepsTitle")}</h3>
            <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4].map((n) => (
                <li key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span
                    style={{
                      flex: "0 0 auto",
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: ACCENT,
                      color: "#04201b",
                      fontSize: 12,
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginTop: 1,
                    }}
                  >
                    {n}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ln-ink-2)" }}>
                    <strong style={{ color: "var(--ln-ink)" }}>
                      {t(`advertise.success.step${n}Title`)}
                    </strong>
                    {t(`advertise.success.step${n}Body`)}
                  </span>
                </li>
              ))}
            </ol>
            <div
              style={{
                marginTop: 16,
                padding: "10px 12px",
                border: "1px solid var(--ln-line-2)",
                background: "var(--ln-surface-2)",
                fontSize: 12,
                color: "var(--ln-ink-3)",
              }}
            >
              {t("advertise.success.importantNote")}
            </div>
          </div>

          {submissionId && (
            <p className="ln-num" style={{ fontSize: 12, color: "var(--ln-ink-4)", marginBottom: 18 }}>
              {t("advertise.success.referenceId", { id: submissionId })}
            </p>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              className="ln-btn"
              onClick={() => {
                setSubmissionSuccess(false);
                setSubmissionId(null);
              }}
            >
              {t("advertise.success.submitAnother")}
            </button>
            <Link to="/advertising/dashboard" className="ln-btn is-primary">
              My ads
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- main form ------------------------------------------------------------
  return (
    <Shell>
      {/* Header */}
      <div style={{ display: "flex", marginBottom: 18 }}>
        <Link to="/map" className="ln-btn">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>
      <span className="ln-eyebrow">Advertise with us</span>
      <h1 className="ln-display" style={{ fontSize: 34, margin: "6px 0 8px", letterSpacing: "-0.02em" }}>
        Reach the people who watch outbreaks
      </h1>
      <p style={{ color: "var(--ln-ink-3)", fontSize: 14, margin: "0 0 28px", maxWidth: 560 }}>
        Put your brand in front of public-health professionals, providers, researchers, and policy
        makers. Submit your ad below — our team reviews every submission before it goes live.
      </p>

      {/* Auth notice */}
      {!user && !authLoading && (
        <div
          style={{
            marginBottom: 22,
            border: "1px solid color-mix(in oklab, var(--ln-warn) 35%, transparent)",
            background: "color-mix(in oklab, var(--ln-warn) 10%, transparent)",
            padding: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <LogIn className="w-5 h-5" style={{ color: "var(--ln-warn)", marginTop: 2, flex: "0 0 auto" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--ln-ink)" }}>
              {t("advertise.form.loginRequiredTitle")}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "4px 0 12px" }}>
              {t("advertise.form.loginRequiredBody")}
            </p>
            <button className="ln-btn is-primary" onClick={() => setAuthDialogOpen(true)}>
              {t("advertise.form.loginButton")}
            </button>
          </div>
        </div>
      )}

      {/* Rate limit warning */}
      {user && rateLimitCheck && !rateLimitCheck.allowed && (
        <div
          style={{
            marginBottom: 22,
            border: "1px solid color-mix(in oklab, var(--ln-crit) 35%, transparent)",
            background: "color-mix(in oklab, var(--ln-crit) 10%, transparent)",
            padding: 16,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle className="w-5 h-5" style={{ color: "var(--ln-crit)", marginTop: 2, flex: "0 0 auto" }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: "var(--ln-ink)" }}>
              {t("advertise.errors.limitReachedTitle")}
            </p>
            <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "4px 0 0" }}>
              {rateLimitCheck.reason}
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleReviewSubmit}>
        {/* Company info */}
        <div style={fieldGap}>
          <label className="ln-eyebrow" style={labelStyle} htmlFor="companyName">
            {t("advertise.form.companyNameLabel")}
          </label>
          <input
            id="companyName"
            className="ln-input"
            style={{ width: "100%" }}
            placeholder={t("advertise.form.companyNamePlaceholder")}
            value={formData.companyName}
            onChange={(e) => handleInputChange("companyName", e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div style={fieldGap}>
          <label className="ln-eyebrow" style={labelStyle} htmlFor="contactName">
            {t("advertise.form.contactNameLabel")}
          </label>
          <input
            id="contactName"
            className="ln-input"
            style={{ width: "100%" }}
            placeholder={t("advertise.form.contactNamePlaceholder")}
            value={formData.contactName}
            onChange={(e) => handleInputChange("contactName", e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            ...fieldGap,
          }}
        >
          <div>
            <label className="ln-eyebrow" style={labelStyle} htmlFor="email">
              {t("advertise.form.emailLabel")}
            </label>
            <input
              id="email"
              type="email"
              className="ln-input"
              style={{ width: "100%" }}
              placeholder={t("advertise.form.emailPlaceholder")}
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="ln-eyebrow" style={labelStyle} htmlFor="phone">
              {t("advertise.form.phoneLabel")}
            </label>
            <input
              id="phone"
              type="tel"
              className="ln-input"
              style={{ width: "100%" }}
              placeholder={t("advertise.form.phonePlaceholder")}
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div style={fieldGap}>
          <label className="ln-eyebrow" style={labelStyle} htmlFor="website">
            {t("advertise.form.websiteLabel")}
          </label>
          <input
            id="website"
            type="url"
            className="ln-input"
            style={{ width: "100%" }}
            placeholder={t("advertise.form.websitePlaceholder")}
            value={formData.website}
            onChange={(e) => handleInputChange("website", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div style={fieldGap}>
          <label className="ln-eyebrow" style={labelStyle} htmlFor="description">
            {t("advertise.form.descriptionLabel")}
          </label>
          <textarea
            id="description"
            className="ln-input"
            style={{ width: "100%", minHeight: 96, resize: "vertical" }}
            placeholder={t("advertise.form.descriptionPlaceholder")}
            rows={4}
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Ad content */}
        <div style={{ borderTop: "1px solid var(--ln-line)", paddingTop: 22, marginTop: 8 }}>
          <h3 style={{ ...sectionTitleStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <Eye className="w-4 h-4" style={{ color: ACCENT }} />
            {t("advertise.form.adContentTitle")}
          </h3>
          <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "0 0 18px" }}>
            {t("advertise.form.adContentBody")}
          </p>

          <div style={fieldGap}>
            <label className="ln-eyebrow" style={labelStyle} htmlFor="adTitle">
              {t("advertise.form.adTitleLabel")}
            </label>
            <input
              id="adTitle"
              className="ln-input"
              style={{ width: "100%" }}
              placeholder={t("advertise.form.adTitlePlaceholder")}
              value={formData.adTitle}
              onChange={(e) => handleInputChange("adTitle", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={fieldGap}>
            <label className="ln-eyebrow" style={labelStyle} htmlFor="adImage">
              {t("advertise.form.adImageLabel")}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                id="adImage"
                type="file"
                className="ln-input"
                style={{ width: "100%" }}
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/apng,video/mp4,video/webm,video/quicktime,video/x-msvideo"
                onChange={handleMediaUpload}
                disabled={isSubmitting || isUploading}
              />
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: ACCENT, flex: "0 0 auto" }} />
              ) : (
                <Upload className="w-4 h-4" style={{ color: "var(--ln-ink-4)", flex: "0 0 auto" }} />
              )}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ln-ink-4)", margin: "6px 0 0" }}>
              {t("advertise.form.adImageHelp")}
            </p>

            {formData.adImage && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12.5, color: ACCENT, margin: "0 0 8px" }}>
                  {t("advertise.form.selectedFile", { name: formData.adImage.name })}
                  {mediaType && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: "var(--ln-ink-4)" }}>
                      (
                      {mediaType === "video"
                        ? t("advertise.form.mediaTypeVideo")
                        : mediaType === "gif"
                        ? t("advertise.form.mediaTypeGif")
                        : mediaType === "animation"
                        ? t("advertise.form.mediaTypeAnimation")
                        : t("advertise.form.mediaTypeImage")}
                      )
                    </span>
                  )}
                </p>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: 140,
                    border: "1px solid var(--ln-line)",
                    background: "var(--ln-surface-2)",
                    overflow: "hidden",
                    borderRadius: 4,
                  }}
                >
                  {mediaType === "video" ? (
                    <video
                      src={URL.createObjectURL(formData.adImage)}
                      controls
                      muted
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(formData.adImage)}
                      alt="Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </div>
              </div>
            )}

            {formData.adImageUrl && !formData.adImage && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 11.5, color: "var(--ln-ink-4)", margin: "0 0 6px" }}>
                  {t("advertise.form.imageUrlLabel")}
                </p>
                <input
                  className="ln-input"
                  style={{ width: "100%" }}
                  placeholder="https://example.com/media.jpg or .mp4"
                  value={formData.adImageUrl}
                  onChange={(e) => handleInputChange("adImageUrl", e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}
          </div>

          <div style={fieldGap}>
            <label className="ln-eyebrow" style={labelStyle} htmlFor="adClickUrl">
              {t("advertise.form.clickUrlLabel")}
            </label>
            <input
              id="adClickUrl"
              type="url"
              className="ln-input"
              style={{ width: "100%" }}
              placeholder={t("advertise.form.clickUrlPlaceholder")}
              value={formData.adClickUrl}
              onChange={(e) => handleInputChange("adClickUrl", e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div style={fieldGap}>
            <label
              className="ln-eyebrow"
              style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}
              htmlFor="adLocation"
            >
              <MapPin className="w-3.5 h-3.5" />
              {t("advertise.form.locationLabel")}
            </label>
            <input
              id="adLocation"
              className="ln-input"
              style={{ width: "100%" }}
              placeholder={t("advertise.form.locationPlaceholder")}
              value={formData.adLocation}
              onChange={(e) => handleInputChange("adLocation", e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Plan selection */}
        <div style={{ borderTop: "1px solid var(--ln-line)", paddingTop: 22, marginTop: 8 }}>
          <label className="ln-eyebrow" style={{ ...labelStyle, marginBottom: 12 }}>
            {t("advertise.form.planLabel")}
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {advertisingPlans.map((plan) => {
              const isSelected = formData.selectedPlan === plan.id;
              return (
                <button
                  type="button"
                  key={plan.id}
                  onClick={() => !isSubmitting && handleInputChange("selectedPlan", plan.id)}
                  disabled={isSubmitting}
                  style={{
                    textAlign: "left",
                    cursor: isSubmitting ? "default" : "pointer",
                    padding: "16px 18px",
                    border: isSelected
                      ? `1.5px solid ${ACCENT}`
                      : "1px solid var(--ln-line)",
                    background: isSelected
                      ? `color-mix(in oklab, ${ACCENT} 10%, var(--ln-surface))`
                      : "var(--ln-surface)",
                    borderRadius: 6,
                    transition: "border-color .15s, background .15s",
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: isSelected ? `5px solid ${ACCENT}` : "2px solid var(--ln-line-2)",
                          background: "transparent",
                          flex: "0 0 auto",
                        }}
                      />
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ln-ink)" }}>
                          {plan.name}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--ln-ink-3)", marginLeft: 8 }}>
                          ({plan.duration})
                        </span>
                        {plan.id === "professional" && (
                          <span className="ln-chip" style={{ marginLeft: 8, color: ACCENT }}>
                            {t("advertise.plans.mostPopularBadge")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="ln-num" style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>
                      {plan.price}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedPlanDetails && (
            <div
              style={{
                marginTop: 14,
                border: "1px solid var(--ln-line)",
                background: "var(--ln-surface-2)",
                padding: "14px 16px",
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 8px", color: "var(--ln-ink)" }}>
                {t("advertise.form.selectedPlanPrefix")} {selectedPlanDetails.name}
              </p>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                {selectedPlanDetails.features.slice(0, 3).map((f, i) => (
                  <li key={i} style={{ fontSize: 12, color: "var(--ln-ink-3)", display: "flex", gap: 6 }}>
                    <span style={{ color: ACCENT }}>✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="ln-btn is-primary"
          style={{ width: "100%", marginTop: 26, justifyContent: "center", height: 44 }}
          disabled={
            isSubmitting ||
            isUploading ||
            !formData.selectedPlan ||
            !user ||
            rateLimitCheck?.allowed === false
          }
        >
          {!user ? (
            <>
              <LogIn className="w-4 h-4" />
              {t("advertise.form.submitLogin")}
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("advertise.form.submitting")}
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              {t("advertise.form.reviewTitle")}
            </>
          )}
        </button>
        <p style={{ fontSize: 11.5, color: "var(--ln-ink-4)", textAlign: "center", margin: "10px 0 0" }}>
          {t("advertise.form.submitDisclaimer")}
        </p>
      </form>

      {/* Preview / confirm */}
      {showPreview && (
        <div
          id="ad-preview-section"
          style={{
            marginTop: 32,
            border: `1px solid color-mix(in oklab, ${ACCENT} 30%, transparent)`,
            background: "var(--ln-surface)",
            padding: "22px 24px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <h3 style={{ ...sectionTitleStyle, display: "flex", alignItems: "center", gap: 8 }}>
                <Eye className="w-4 h-4" style={{ color: ACCENT }} />
                {t("advertise.form.previewTitle")}
              </h3>
              <p style={{ fontSize: 12.5, color: "var(--ln-ink-3)", margin: "4px 0 0" }}>
                {t("advertise.form.previewDescription")}
              </p>
            </div>
            <button
              className="ln-btn"
              onClick={() => {
                if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(previewImageUrl);
                }
                setShowPreview(false);
                setPreviewImageUrl(null);
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              {t("advertise.form.backToEdit")}
            </button>
          </div>

          {/* Ad rendering preview */}
          <div
            style={{
              background: "#2a4149",
              padding: 16,
              borderRadius: 6,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: formData.selectedPlan === "enterprise" ? 120 : 80,
                borderRadius: 6,
                overflow: "hidden",
                background: `linear-gradient(135deg, color-mix(in oklab, ${ACCENT} 25%, transparent), color-mix(in oklab, ${ACCENT} 45%, transparent))`,
              }}
            >
              {previewImageUrl && (
                <>
                  {mediaType === "video" ? (
                    <video
                      src={previewImageUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLVideoElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <img
                      src={previewImageUrl}
                      alt={formData.adTitle || formData.companyName}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(181deg, rgba(42,65,73,0) 0%, rgba(42,65,73,0.92) 100%)",
                    }}
                  />
                </>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ color: "#fff", fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.2 }}>
                      {formData.adTitle || formData.companyName}
                    </h4>
                    {formData.description && (
                      <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, margin: "2px 0 0", lineHeight: 1.2 }}>
                        {formData.description}
                      </p>
                    )}
                  </div>
                  {formData.adLocation && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        background: "rgba(0,0,0,0.3)",
                        color: "#fff",
                        fontSize: 10,
                        padding: "2px 6px",
                        borderRadius: 4,
                        flex: "0 0 auto",
                      }}
                    >
                      <MapPin className="w-3 h-3" />
                      {formData.adLocation}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      background: ACCENT,
                      color: "#04201b",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 4,
                      textTransform: "capitalize",
                    }}
                  >
                    {selectedPlanDetails?.name || formData.selectedPlan}
                  </span>
                  {formData.adClickUrl && <ExternalLink className="w-3 h-3" style={{ color: "rgba(255,255,255,0.6)" }} />}
                </div>
              </div>
            </div>
          </div>

          {/* Details summary */}
          <div
            style={{
              border: "1px solid var(--ln-line)",
              background: "var(--ln-surface-2)",
              padding: "14px 16px",
              marginBottom: 18,
            }}
          >
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: "0 0 10px", color: "var(--ln-ink)" }}>
              {t("advertise.form.adDetails")}
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                fontSize: 12.5,
              }}
            >
              <div>
                <span style={{ color: "var(--ln-ink-4)" }}>{t("advertise.form.adDetailsCompany")}</span>
                <p style={{ margin: "2px 0 0", color: "var(--ln-ink)", fontWeight: 500 }}>{formData.companyName}</p>
              </div>
              <div>
                <span style={{ color: "var(--ln-ink-4)" }}>{t("advertise.form.adDetailsPlan")}</span>
                <p style={{ margin: "2px 0 0", color: "var(--ln-ink)", fontWeight: 500 }}>
                  {selectedPlanDetails?.name || t("advertise.form.notProvided")}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--ln-ink-4)" }}>{t("advertise.form.adDetailsTitle")}</span>
                <p style={{ margin: "2px 0 0", color: "var(--ln-ink)", fontWeight: 500 }}>
                  {formData.adTitle || formData.companyName || t("advertise.form.notProvided")}
                </p>
              </div>
              <div>
                <span style={{ color: "var(--ln-ink-4)" }}>{t("advertise.form.adDetailsLocation")}</span>
                <p style={{ margin: "2px 0 0", color: "var(--ln-ink)", fontWeight: 500 }}>
                  {formData.adLocation || "Global"}
                </p>
              </div>
              {formData.adClickUrl && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <span style={{ color: "var(--ln-ink-4)" }}>{t("advertise.form.adDetailsClickUrl")}</span>
                  <p style={{ margin: "2px 0 0", color: "var(--ln-ink)", fontWeight: 500, wordBreak: "break-all" }}>
                    {formData.adClickUrl}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="ln-btn"
              style={{ flex: 1, justifyContent: "center", minWidth: 160 }}
              disabled={isSubmitting}
              onClick={() => {
                if (previewImageUrl && previewImageUrl.startsWith("blob:")) {
                  URL.revokeObjectURL(previewImageUrl);
                }
                setShowPreview(false);
                setPreviewImageUrl(null);
              }}
            >
              <Edit className="w-4 h-4" />
              {t("advertise.form.editAd")}
            </button>
            <button
              className="ln-btn is-primary"
              style={{ flex: 1, justifyContent: "center", minWidth: 160 }}
              onClick={handleFinalSubmit}
              disabled={isSubmitting || isUploading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("advertise.form.submitting")}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t("advertise.form.confirmSubmit")}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
