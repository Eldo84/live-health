import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AppLayout } from "./layouts/AppLayout";
import { FullscreenProvider } from "./contexts/FullscreenContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SidebarProvider } from "./contexts/SidebarContext";

// New LiveHealth+ redesign
import { LiveHealthHost } from "./livehealth/LiveHealthHost";
import { AdminShell } from "./livehealth/AdminShell";
import { LandingRoute } from "./livehealth/screens/LandingRoute";
import { MapScreen } from "./livehealth/screens/Map";
import { AnalyticsDashboardScreen } from "./livehealth/screens/AnalyticsDashboard";
import { NewsScreen } from "./livehealth/screens/News";
import { GlobalHealthIndexScreen } from "./livehealth/screens/GlobalHealthIndex";
import { WeeklyReportScreen } from "./livehealth/screens/WeeklyReport";

// Auxiliary pages kept from the existing app (still needed for payments, donations, admin, etc.)
import PartnershipScreen from "./livehealth/screens/Partnership";
import PrivacyPolicyScreen from "./livehealth/screens/PrivacyPolicy";
import {
  PaymentPage,
  PaymentSuccess,
  PaymentCancelled,
  UserAdvertisingDashboard,
  AdminAdvertisingPanel,
} from "./screens/Advertising";
import { DonationSuccess } from "./screens/Donate/DonationSuccess";
import { DonationCancelled } from "./screens/Donate/DonationCancelled";
import { AdminDashboard } from "./screens/Admin/AdminDashboard";
import { AdminAlertReviewPanel } from "./screens/Admin/AdminAlertReviewPanel";
import { AdminNotificationPanel } from "./screens/Admin/AdminNotificationPanel";
import { AdminFeedbackPanel } from "./screens/Admin/AdminFeedbackPanel";
import { WeeklyReport } from "./screens/Dashboard/WeeklyReport";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { News } from "./screens/News";
import { PageTracking } from "./components/PageTracking";
import { initGA4 } from "./lib/analytics";

initGA4();

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <PageTracking />
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <FullscreenProvider>
                <Routes>
                  {/*
                   * Auth model: landing surfaces (landing page, map, partnership,
                   * privacy) are public so unauth visitors can browse and convert.
                   * App surfaces (dashboard, news, GHI, admin) are gated — they
                   * pop the AuthDialog and redirect to /map on cancel. Stripe
                   * callback URLs stay public so checkout returns always land.
                   */}
                  <Route element={<LiveHealthHost />}>
                    <Route path="/" element={<LandingRoute />} />
                    <Route path="/map" element={<MapScreen />} />
                    <Route
                      path="/dashboard"
                      element={<ProtectedRoute><AnalyticsDashboardScreen /></ProtectedRoute>}
                    />
                    <Route
                      path="/dashboard/weekly-report"
                      element={<ProtectedRoute><WeeklyReportScreen /></ProtectedRoute>}
                    />
                    <Route path="/news" element={<ProtectedRoute><NewsScreen /></ProtectedRoute>} />
                    <Route
                      path="/global-health-index"
                      element={<ProtectedRoute><GlobalHealthIndexScreen /></ProtectedRoute>}
                    />
                  </Route>

                  {/* Themed Partnership + Privacy pages — public landing-adjacent surfaces */}
                  <Route path="/partnership" element={<PartnershipScreen />} />
                  <Route path="/privacy" element={<PrivacyPolicyScreen />} />

                  {/* Legacy /news/legacy retains the old experience for anyone with that URL */}
                  <Route path="/news/legacy" element={<AppLayout />}>
                    <Route index element={<ProtectedRoute><News /></ProtectedRoute>} />
                  </Route>

                  {/* Legacy weekly report kept for direct deep-links / printable view */}
                  <Route path="/dashboard/weekly-report/legacy" element={<AppLayout />}>
                    <Route index element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
                  </Route>

                  {/* Advertising routes — payment callbacks stay public for Stripe returns */}
                  <Route path="/advertising" element={<AppLayout />}>
                    <Route
                      path="payment/:submissionId"
                      element={<ProtectedRoute><PaymentPage /></ProtectedRoute>}
                    />
                    <Route path="payment/success" element={<PaymentSuccess />} />
                    <Route path="payment/cancelled" element={<PaymentCancelled />} />
                  </Route>
                  <Route
                    path="/payment/:submissionId"
                    element={<ProtectedRoute><PaymentPage /></ProtectedRoute>}
                  />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancelled" element={<PaymentCancelled />} />

                  {/* Donation callbacks stay public so Stripe returns always land */}
                  <Route path="/donate/success" element={<DonationSuccess />} />
                  <Route path="/donate/cancelled" element={<DonationCancelled />} />

                  {/* User advertising dashboard */}
                  <Route path="/dashboard/advertising" element={<AppLayout />}>
                    <Route index element={<ProtectedRoute><UserAdvertisingDashboard /></ProtectedRoute>} />
                  </Route>

                  {/* Admin routes — themed shell matching LiveHealth+ chrome */}
                  <Route path="/admin" element={<ProtectedRoute><AdminShell /></ProtectedRoute>}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="advertising" element={<AdminAdvertisingPanel />} />
                    <Route path="alerts" element={<AdminAlertReviewPanel />} />
                    <Route path="feedback" element={<AdminFeedbackPanel />} />
                    <Route path="notifications" element={<AdminNotificationPanel />} />
                  </Route>
                </Routes>
              </FullscreenProvider>
            </SidebarProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
