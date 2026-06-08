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
import { DashboardScreen } from "./livehealth/screens/Dashboard";
import { NewsScreen } from "./livehealth/screens/News";
import { GlobalHealthIndexScreen } from "./livehealth/screens/GlobalHealthIndex";
import { WeeklyReportScreen } from "./livehealth/screens/WeeklyReport";
import { ZambiaDashboardScreen } from "./lusaka/screens/ZambiaDashboard";
import AdvertiseScreen from "./livehealth/screens/Advertise";

// Auxiliary pages kept from the existing app (still needed for payments, donations, admin, etc.)
import PartnershipScreen from "./livehealth/screens/Partnership";
import AboutScreen from "./livehealth/screens/About";
import PrivacyPolicyScreen from "./livehealth/screens/PrivacyPolicy";
import SettingsScreen from "./livehealth/screens/Settings";
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
import { ResetPasswordScreen } from "./screens/ResetPassword";
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
                    {/* Lusaka, Zambia demo dashboard — public so the partner team can
                        review the demo without an account. Reads hardcoded demo data
                        via useZambiaData(); swap that hook for the real feed later. */}
                    <Route path="/zambia" element={<ZambiaDashboardScreen />} />
                    {/* Advertise — public conversion page; form gates submit on auth itself */}
                    <Route path="/advertise" element={<AdvertiseScreen />} />
                    <Route
                      path="/dashboard"
                      element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>}
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
                    <Route
                      path="/settings"
                      element={<ProtectedRoute><SettingsScreen /></ProtectedRoute>}
                    />
                    {/* My Ads — themed page; rides the LiveHealth+ chrome (TopBar + BottomNav) */}
                    <Route
                      path="/dashboard/advertising"
                      element={<ProtectedRoute><UserAdvertisingDashboard /></ProtectedRoute>}
                    />
                  </Route>

                  {/* Password reset — public so the recovery email link always lands */}
                  <Route path="/reset-password" element={<ResetPasswordScreen />} />

                  {/* Themed About + Partnership + Privacy pages — public landing-adjacent surfaces */}
                  <Route path="/about" element={<AboutScreen />} />
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
