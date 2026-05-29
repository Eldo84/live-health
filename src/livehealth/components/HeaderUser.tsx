import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { useAuth } from "../../contexts/AuthContext";
import { AuthDialog } from "../../components/AuthDialog";
import { AddAlertDialog } from "./AddAlertDialog";
import { FeedbackDialog } from "./FeedbackDialog";

// Returns 1-2 character initials from the user's name / email metadata.
function initialsFor(user: { email?: string | null; user_metadata?: any } | null): string {
  if (!user) return "·";
  const meta = user.user_metadata || {};
  const fullName: string | undefined = meta.full_name || meta.name;
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (user.email) {
    const local = user.email.split("@")[0];
    const parts = local.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return local.slice(0, 2).toUpperCase();
  }
  return "·";
}

export function HeaderUser() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (loading) {
    return (
      <div
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}
      />
    );
  }

  if (!user) {
    return (
      <>
        <button
          className="ln-btn"
          onClick={() => setFeedbackOpen(true)}
          title="Send feedback"
          aria-label="Send feedback"
          style={{ width: 30, height: 30, justifyContent: "center", padding: 0 }}
        >
          <Icon.Sparkles />
        </button>
        <button
          className="ln-btn"
          onClick={() => {
            setAuthMode("login");
            setAuthOpen(true);
          }}
        >
          Sign in
        </button>
        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} mode={authMode} onModeChange={setAuthMode} />
        <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      </>
    );
  }

  const initials = initialsFor(user);
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        style={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #b07cff, #4ee0c4)",
          fontSize: 10.5,
          color: "#06231d",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
          fontFamily: "var(--ln-font-mono)",
          letterSpacing: "0.02em",
          cursor: "pointer",
          border: "none",
        }}
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 240,
            background: "var(--ln-elev-bg)",
            border: "1px solid var(--ln-line-3)",
            boxShadow: "0 18px 38px rgba(0,0,0,0.55)",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ln-line-2)" }}>
            <div style={{ fontSize: 12.5, color: "var(--ln-ink)", fontWeight: 500 }}>
              {displayName}
            </div>
            {displayName !== user.email && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--ln-ink-3)",
                  marginTop: 2,
                  fontFamily: "var(--ln-font-mono)",
                }}
              >
                {user.email}
              </div>
            )}
          </div>
          <MenuItem
            onClick={() => {
              setOpen(false);
              navigate("/dashboard");
            }}
          >
            <Icon.Chart /> Analytics
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false);
              navigate("/dashboard/advertising");
            }}
          >
            <Icon.News /> My advertising
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false);
              navigate("/partnership");
            }}
          >
            <Icon.Globe /> Partnership
          </MenuItem>
          <div style={{ height: 1, background: "var(--ln-line-2)" }} />
          <MenuItem
            onClick={() => {
              setOpen(false);
              setAlertOpen(true);
            }}
          >
            <Icon.Plus /> Report outbreak
          </MenuItem>
          <MenuItem
            onClick={() => {
              setOpen(false);
              setFeedbackOpen(true);
            }}
          >
            <Icon.Sparkles /> Send feedback
          </MenuItem>
          <div style={{ height: 1, background: "var(--ln-line-2)" }} />
          <MenuItem
            onClick={async () => {
              setOpen(false);
              await signOut();
              navigate("/");
            }}
          >
            <Icon.ArrowR /> Sign out
          </MenuItem>
        </div>
      )}
      <AddAlertDialog open={alertOpen} onClose={() => setAlertOpen(false)} />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      role="menuitem"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: "transparent",
        border: "none",
        color: "var(--ln-ink)",
        fontSize: 12.5,
        cursor: "pointer",
        textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ln-surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {children}
    </button>
  );
}
