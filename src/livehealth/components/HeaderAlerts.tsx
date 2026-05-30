import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications, type Notification } from "../../lib/useNotifications";
import { useLiveAlerts } from "../data/useLiveAlerts";
import { timeAgo } from "../lib/utils";

// Header alerts button used in the LiveHealth+ chrome.
// - Signed in: shows the unread notification count (`useNotifications`)
//   and opens a dropdown listing the user's notifications.
// - Signed out: shows the count of recent critical / high-severity outbreak
//   signals (last 24h) and opens a dropdown listing them.
export function HeaderAlerts() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        className="ln-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon.Bell />
        Alerts
        <AlertsBadge />
      </button>
      {open &&
        (user ? (
          <SignedInPanel onClose={() => setOpen(false)} />
        ) : (
          <PublicPanel onClose={() => setOpen(false)} />
        ))}
    </div>
  );
}

function AlertsBadge() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { alerts } = useLiveAlerts(50, "24h");
  const publicCritical = useMemo(
    () => alerts.filter((a) => a.level === "critical" || a.level === "high").length,
    [alerts]
  );
  const count = user ? unreadCount : publicCritical;
  if (count <= 0) return null;
  return (
    <span
      style={{
        background: "var(--ln-crit)",
        color: "#fff",
        borderRadius: 999,
        padding: "0 5px",
        fontSize: 10,
        marginLeft: 4,
        minWidth: 16,
        textAlign: "center",
        fontFamily: "var(--ln-font-mono)",
      }}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function PanelShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div
      role="menu"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: 360,
        background: "var(--ln-elev-bg)",
        border: "1px solid var(--ln-line-3)",
        boxShadow: "0 18px 38px rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        maxHeight: 480,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--ln-line-2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ln-ink)" }}>{title}</div>
          {subtitle && (
            <div
              style={{
                fontSize: 11,
                color: "var(--ln-ink-3)",
                fontFamily: "var(--ln-font-mono)",
                marginTop: 2,
                letterSpacing: "0.08em",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="ln-pane" style={{ flex: 1, overflowY: "auto" }}>
        {children}
      </div>
      {footer && (
        <div style={{ borderTop: "1px solid var(--ln-line-2)", padding: "8px 12px" }}>{footer}</div>
      )}
    </div>
  );
}

function SignedInPanel({ onClose }: { onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const items = notifications.slice(0, 12);
  return (
    <PanelShell
      title="Your notifications"
      subtitle={`${unreadCount} unread`}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <button
            className="ln-btn"
            onClick={() => {
              markAllAsRead();
            }}
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
          <button
            className="ln-btn"
            onClick={() => {
              onClose();
              navigate("/dashboard/advertising");
            }}
          >
            Open inbox <Icon.ArrowR />
          </button>
        </div>
      }
    >
      {items.length === 0 ? (
        <div style={{ padding: 14, fontSize: 12, color: "var(--ln-ink-3)" }}>
          You have no notifications.
        </div>
      ) : (
        items.map((n) => <NotificationRow key={n.id} n={n} onRead={(id) => markAsRead(id)} />)
      )}
    </PanelShell>
  );
}

function NotificationRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const navigate = useNavigate();
  const handle = () => {
    if (!n.read) onRead(n.id);
    if (n.action_url) navigate(n.action_url);
  };
  return (
    <button
      onClick={handle}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: n.read ? "transparent" : "rgba(78,224,196,0.04)",
        border: "none",
        borderBottom: "1px solid var(--ln-line)",
        padding: "10px 14px",
        cursor: "pointer",
        color: "inherit",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          fontFamily: "var(--ln-font-mono)",
          fontSize: 10,
          color: "var(--ln-ink-3)",
          letterSpacing: "0.08em",
        }}
      >
        <span>{n.type.replace(/_/g, " ").toUpperCase()}</span>
        <span>{timeAgo(n.created_at)} ago</span>
      </div>
      <div style={{ fontSize: 13, color: "var(--ln-ink)", marginTop: 4, fontWeight: 500 }}>
        {n.title}
      </div>
      {n.message && (
        <div style={{ fontSize: 12, color: "var(--ln-ink-2)", marginTop: 2, lineHeight: 1.4 }}>
          {n.message}
        </div>
      )}
    </button>
  );
}

function PublicPanel({ onClose }: { onClose: () => void }) {
  const { alerts } = useLiveAlerts(15, "24h");
  const navigate = useNavigate();
  return (
    <PanelShell
      title="Live alerts · last 24h"
      subtitle={`${alerts.length} signals`}
      footer={
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--ln-ink-3)" }}>
            Sign in to receive personal alerts
          </span>
          <button
            className="ln-btn"
            onClick={() => {
              onClose();
              navigate("/map");
            }}
          >
            Open map <Icon.ArrowR />
          </button>
        </div>
      }
    >
      {alerts.length === 0 ? (
        <div style={{ padding: 14, fontSize: 12, color: "var(--ln-ink-3)" }}>
          No outbreak signals in the last 24h.
        </div>
      ) : (
        alerts.map((a) => (
          <a
            key={a.id}
            href={a.url || "#"}
            target={a.url ? "_blank" : undefined}
            rel={a.url ? "noopener noreferrer" : undefined}
            style={{
              display: "block",
              textDecoration: "none",
              borderBottom: "1px solid var(--ln-line)",
              padding: "10px 14px",
              color: "inherit",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--ln-font-mono)",
                fontSize: 10,
                color: "var(--ln-ink-3)",
                letterSpacing: "0.08em",
              }}
            >
              <span>
                {a.region} · {a.country.toUpperCase()}
              </span>
              <span>{timeAgo(a.ts)} ago</span>
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: "var(--ln-ink)",
                marginTop: 4,
                lineHeight: 1.4,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {a.text}
            </div>
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                color:
                  a.level === "critical"
                    ? "var(--ln-crit)"
                    : a.level === "high"
                    ? "#ff7a3b"
                    : "var(--ln-warn)",
                fontFamily: "var(--ln-font-mono)",
                letterSpacing: "0.08em",
              }}
            >
              ● {a.level.toUpperCase()} · {a.src}
            </div>
          </a>
        ))
      )}
    </PanelShell>
  );
}
