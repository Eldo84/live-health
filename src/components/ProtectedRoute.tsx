import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AuthDialog } from "./AuthDialog";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Show dialog when user is not authenticated
  useEffect(() => {
    if (!loading && !user) {
      setAuthDialogOpen(true);
    } else if (user) {
      setAuthDialogOpen(false);
    }
  }, [loading, user]);

  // Handle dialog close - redirect to map route only if user is not authenticated
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setAuthDialogOpen(false);
      if (!user) {
        navigate("/app/map");
      }
    } else {
      setAuthDialogOpen(open);
    }
  };

  // Show nothing while checking authentication
  if (loading) {
    return null;
  }

  // If not authenticated, show dialog
  if (!user) {
    return (
      <>
        <AuthDialog
          open={authDialogOpen}
          onOpenChange={handleDialogClose}
          mode={authMode}
          onModeChange={setAuthMode}
        />
        {/* Don't render children when not authenticated */}
      </>
    );
  }

  // Render protected content when authenticated
  return <>{children}</>;
};

