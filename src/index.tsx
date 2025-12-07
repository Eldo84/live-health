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

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
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
                <Route path="dashboard" element={<Dashboard />} />
              </Route>
              
              {/* Legacy routes - with AppLayout for backward compatibility */}
              <Route path="/map" element={<AppLayout />}>
                <Route index element={<HomePageMap />} />
              </Route>
              <Route path="/dashboard" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
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
              
              {/* User advertising dashboard */}
              <Route path="/dashboard/advertising" element={<AppLayout />}>
                <Route index element={<UserAdvertisingDashboard />} />
              </Route>
              
              {/* Admin advertising panel */}
              <Route path="/admin/advertising" element={<AppLayout />}>
                <Route index element={<AdminAdvertisingPanel />} />
              </Route>
            </Routes>
          </FullscreenProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
