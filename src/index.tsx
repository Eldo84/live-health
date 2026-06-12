import { StrictMode, Suspense, lazy, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { FullscreenProvider } from "./contexts/FullscreenContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SidebarProvider } from "./contexts/SidebarContext";

// New LiveHealth+ redesign — the host shell stays eager (it's the chrome every
// screen needs); the screens themselves are lazy so each route only downloads
// its own chunk. Before this split the whole app shipped as one ~2MB bundle,
// which is why the map took so long to appear on slow connections.
import { LiveHealthHost } from "./livehealth/LiveHealthHost";
import { initInstallCapture } from "./livehealth/lib/installPrompt";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PageTracking } from "./components/PageTracking";
import { initGA4 } from "./lib/analytics";

// Route-level code splitting. `from` adapts named exports to React.lazy's
// default-export contract.
const from = <T extends ComponentType<any>>(loader: () => Promise<T>) =>
  lazy(() => loader().then((C) => ({ default: C })));

const LandingRoute = from(() => import("./livehealth/screens/LandingRoute").then((m) => m.LandingRoute));
const MapScreen = from(() => import("./livehealth/screens/Map").then((m) => m.MapScreen));
const DashboardScreen = from(() => import("./livehealth/screens/Dashboard").then((m) => m.DashboardScreen));
const NewsScreen = from(() => import("./livehealth/screens/News").then((m) => m.NewsScreen));
const GlobalHealthIndexScreen = from(() =>
  import("./livehealth/screens/GlobalHealthIndex").then((m) => m.GlobalHealthIndexScreen)
);
const WeeklyReportScreen = from(() => import("./livehealth/screens/WeeklyReport").then((m) => m.WeeklyReportScreen));
const ZambiaDashboardScreen = from(() => import("./lusaka/screens/ZambiaDashboard").then((m) => m.ZambiaDashboardScreen));
const AdminShell = from(() => import("./livehealth/AdminShell").then((m) => m.AdminShell));
const AdvertiseScreen = lazy(() => import("./livehealth/screens/Advertise"));

// Auxiliary pages kept from the existing app (still needed for payments, donations, admin, etc.)
const PartnershipScreen = lazy(() => import("./livehealth/screens/Partnership"));
const AboutScreen = lazy(() => import("./livehealth/screens/About"));
const PrivacyPolicyScreen = lazy(() => import("./livehealth/screens/PrivacyPolicy"));
const SettingsScreen = lazy(() => import("./livehealth/screens/Settings"));
const PaymentPage = from(() => import("./screens/Advertising").then((m) => m.PaymentPage));
const PaymentSuccess = from(() => import("./screens/Advertising").then((m) => m.PaymentSuccess));
const PaymentCancelled = from(() => import("./screens/Advertising").then((m) => m.PaymentCancelled));
const UserAdvertisingDashboard = from(() =>
  import("./screens/Advertising").then((m) => m.UserAdvertisingDashboard)
);
const AdminAdvertisingPanel = from(() => import("./screens/Advertising").then((m) => m.AdminAdvertisingPanel));
const DonationSuccess = from(() => import("./screens/Donate/DonationSuccess").then((m) => m.DonationSuccess));
const DonationCancelled = from(() => import("./screens/Donate/DonationCancelled").then((m) => m.DonationCancelled));
const AdminDashboard = from(() => import("./screens/Admin/AdminDashboard").then((m) => m.AdminDashboard));
const AdminAlertReviewPanel = from(() =>
  import("./screens/Admin/AdminAlertReviewPanel").then((m) => m.AdminAlertReviewPanel)
);
const AdminNotificationPanel = from(() =>
  import("./screens/Admin/AdminNotificationPanel").then((m) => m.AdminNotificationPanel)
);
const AdminFeedbackPanel = from(() => import("./screens/Admin/AdminFeedbackPanel").then((m) => m.AdminFeedbackPanel));
const WeeklyReport = from(() => import("./screens/Dashboard/WeeklyReport").then((m) => m.WeeklyReport));
const ResetPasswordScreen = from(() => import("./screens/ResetPassword").then((m) => m.ResetPasswordScreen));
const News = from(() => import("./screens/News").then((m) => m.News));
const AppLayout = from(() => import("./layouts/AppLayout").then((m) => m.AppLayout));

initGA4();
// Capture beforeinstallprompt as early as possible (it can fire before React
// mounts) and register the installability service worker.
initInstallCapture();

// Branded full-screen fallback shown while a route chunk downloads — matches
// the app's dark surface so there's no white flash before the map appears.
function RouteLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#0c1418",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "#7da8a0",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        letterSpacing: "0.08em",
      }}
    >
      <img src="/icon-192.png" alt="" width={56} height={56} style={{ borderRadius: 12 }} />
      <span>LOADING OUTBREAKNOW…</span>
    </div>
  );
}

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <PageTracking />
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <FullscreenProvider>
                <Suspense fallback={<RouteLoader />}>
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
                </Suspense>
              </FullscreenProvider>
            </SidebarProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
