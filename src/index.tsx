import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { HomePageMap } from "./screens/HomePageMap";
import { Dashboard } from "./screens/Dashboard";
import { AppLayout } from "./layouts/AppLayout";
import { MainPageLayout } from "./layouts/MainPageLayout";
import { FullscreenProvider } from "./contexts/FullscreenContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import HomePage from "./screens/mainpage/pages/index";
import Partnership from "./screens/mainpage/pages/Partnership";

// Advertising pages
import { 
  PaymentPage, 
  PaymentSuccess, 
  PaymentCancelled,
  UserAdvertisingDashboard,
  AdminAdvertisingPanel 
} from "./screens/Advertising";

// Donation pages
import { DonationSuccess } from "./screens/Donate/DonationSuccess";
import { DonationCancelled } from "./screens/Donate/DonationCancelled";

// Admin pages
import { AdminDashboard } from "./screens/Admin/AdminDashboard";
import { AdminAlertReviewPanel } from "./screens/Admin/AdminAlertReviewPanel";
import { AdminNotificationPanel } from "./screens/Admin/AdminNotificationPanel";
import { WeeklyReport } from "./screens/Dashboard/WeeklyReport";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { News } from "./screens/News";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <LanguageProvider>
          <AuthProvider>
            <SidebarProvider>
              <FullscreenProvider>
              <Routes>
              {/* Main landing pages - no AppLayout (header/sidebar) */}
              <Route path="/" element={<MainPageLayout />}>
                <Route index element={<HomePage />} />
                <Route path="partnership" element={<Partnership />} />
              </Route>
              
              {/* App pages - with AppLayout (header/sidebar) */}
              <Route path="/app" element={<AppLayout />}>
                <Route path="map" element={<HomePageMap />} />
                <Route path="news" element={<News />} />
                <Route path="dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="dashboard/weekly-report" element={<ProtectedRoute><WeeklyReport /></ProtectedRoute>} />
              </Route>
              
              {/* Legacy routes - with AppLayout for backward compatibility */}
              <Route path="/map" element={<AppLayout />}>
                <Route index element={<HomePageMap />} />
              </Route>
              <Route path="/news" element={<AppLayout />}>
                <Route index element={<News />} />
              </Route>
              <Route path="/dashboard" element={<AppLayout />}>
                <Route index element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              </Route>

              {/* Advertising routes */}
              <Route path="/advertising" element={<AppLayout />}>
                <Route path="payment/:submissionId" element={<PaymentPage />} />
                <Route path="payment/success" element={<PaymentSuccess />} />
                <Route path="payment/cancelled" element={<PaymentCancelled />} />
              </Route>
              
              {/* Legacy payment routes for backward compatibility */}
              <Route path="/payment/:submissionId" element={<PaymentPage />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancelled" element={<PaymentCancelled />} />
              
              {/* Donation routes */}
              <Route path="/donate/success" element={<DonationSuccess />} />
              <Route path="/donate/cancelled" element={<DonationCancelled />} />
              
              {/* User advertising dashboard */}
              <Route path="/dashboard/advertising" element={<AppLayout />}>
                <Route index element={<ProtectedRoute><UserAdvertisingDashboard /></ProtectedRoute>} />
              </Route>
              
              {/* Admin routes */}
              <Route path="/admin" element={<AppLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="advertising" element={<AdminAdvertisingPanel />} />
                <Route path="alerts" element={<AdminAlertReviewPanel />} />
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
