import { Outlet } from "react-router-dom";
import "../screens/mainpage/pages/index.css";
import "../screens/mainpage/pages/App.css";

/**
 * Simple layout for main landing pages (home, partnership, etc.)
 * This layout doesn't include the AppLayout header/sidebar
 */
export const MainPageLayout = (): JSX.Element => {
  return (
    <div className="min-h-screen bg-background mainpage-layout">
      <Outlet />
    </div>
  );
};

