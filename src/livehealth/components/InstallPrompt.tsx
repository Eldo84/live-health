import { useEffect, useState, useSyncExternalStore } from "react";
import { Modal } from "./Modal";
import { T } from "./T";
import { useT } from "../lib/useT";
import {
  INSTALL_STATE_KEY,
  clearDeferredPrompt,
  detectPlatform,
  getDeferredPrompt,
  isStandalone,
  subscribeInstallPrompt,
  type Platform,
} from "../lib/installPrompt";

const SNOOZE_DAYS = 14;

type InstallState = { installed?: boolean; snoozedAt?: number };

function readState(): InstallState {
  try {
    return JSON.parse(localStorage.getItem(INSTALL_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeState(s: InstallState) {
  try {
    localStorage.setItem(INSTALL_STATE_KEY, JSON.stringify(s));
  } catch {
    /* private mode — prompt simply reappears next visit */
  }
}

function shouldAutoShow(): boolean {
  if (isStandalone()) return false;
  const s = readState();
  if (s.installed) return false;
  if (s.snoozedAt && Date.now() - s.snoozedAt < SNOOZE_DAYS * 24 * 60 * 60 * 1000) return false;
  return true;
}

/* ── Tiny inline glyphs for the step lists ─────────────────────────────── */

const ShareIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.4} style={{ verticalAlign: "-2px" }}>
    <path d="M8 1.5v8M5 4l3-2.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3.5 7.5H3a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1h-.5" strokeLinecap="round" />
  </svg>
);

const InstallBadge = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth={1.4} style={{ verticalAlign: "-2px" }}>
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
    <path d="M8 5.5v5M5.5 8.5 8 11l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DotsIcon = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" style={{ verticalAlign: "-2px" }}>
    <circle cx="8" cy="3" r="1.4" /><circle cx="8" cy="8" r="1.4" /><circle cx="8" cy="13" r="1.4" />
  </svg>
);

/* ── Per-device instruction blocks ─────────────────────────────────────── */

const DEVICE_TABS: { id: Platform | "desktop"; label: string }[] = [
  { id: "ios", label: "iPhone & iPad" },
  { id: "android", label: "Android" },
  { id: "desktop", label: "Computer / Laptop" },
];

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
      {items.map((it, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span
            className="ln-num"
            style={{
              flex: "0 0 auto",
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: "1px solid var(--ln-line-3)",
              color: "var(--ln-brand)",
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {i + 1}
          </span>
          <span style={{ fontSize: 13, color: "var(--ln-ink-2)", lineHeight: 1.55 }}>{it}</span>
        </li>
      ))}
    </ol>
  );
}

function DeviceInstructions({ device }: { device: Platform | "desktop" }) {
  const strong: React.CSSProperties = { color: "var(--ln-ink)", fontWeight: 600 };
  if (device === "ios") {
    return (
      <Steps
        items={[
          <T>Open this site in Safari (installing only works from Safari on iPhone and iPad).</T>,
          <>
            <T>Tap the</T> <span style={strong}><ShareIcon /> <T>Share</T></span>{" "}
            <T>button — bottom bar on iPhone, top-right on iPad.</T>
          </>,
          <>
            <T>Scroll down and tap</T> <span style={strong}><T>Add to Home Screen</T></span>, <T>then</T>{" "}
            <span style={strong}><T>Add</T></span>.
          </>,
        ]}
      />
    );
  }
  if (device === "android") {
    return (
      <Steps
        items={[
          <T>Open this site in Chrome.</T>,
          <>
            <T>Tap the</T> <span style={strong}><DotsIcon /> <T>menu</T></span> <T>in the top-right corner.</T>
          </>,
          <>
            <T>Tap</T> <span style={strong}><T>Add to Home screen</T></span> <T>(or</T>{" "}
            <span style={strong}><T>Install app</T></span><T>), then confirm.</T>
          </>,
        ]}
      />
    );
  }
  // Desktop: Chrome/Edge install icon, plus the Safari-on-Mac path.
  return (
    <Steps
      items={[
        <>
          <T>In</T> <span style={strong}>Chrome</span> <T>or</T> <span style={strong}>Edge</span>,{" "}
          <T>click the</T>{" "}
          <span style={{ ...strong, whiteSpace: "nowrap" }}><InstallBadge /> <T>install icon</T></span>{" "}
          <T>at the right end of the address bar.</T>
        </>,
        <>
          <T>Click</T> <span style={strong}><T>Install</T></span>{" "}
          <T>— OutbreakNow opens in its own window and is added to your desktop / dock / Start menu.</T>
        </>,
        <>
          <T>On</T> <span style={strong}>Safari (Mac)</span>: <T>use</T>{" "}
          <span style={strong}><T>File → Add to Dock</T></span>.
        </>,
      ]}
    />
  );
}

/* ── The dialog ────────────────────────────────────────────────────────── */

interface InstallPromptProps {
  /** Delay before auto-opening on an eligible first visit (ms). */
  delayMs?: number;
}

// Cross-device "get the app" dialog. Auto-opens once per visit (snoozed for
// 14 days on dismiss, never again once installed). Uses the native
// beforeinstallprompt flow where the browser offers it (Chrome/Edge/Android)
// and clear per-device instructions everywhere else (iOS/iPadOS/macOS) — no
// App Store or Play Store involved.
export function InstallPrompt({ delayMs = 1800 }: InstallPromptProps) {
  const [open, setOpen] = useState(false);
  // Re-render when the captured beforeinstallprompt event arrives/spends.
  const nativePrompt = useSyncExternalStore(subscribeInstallPrompt, getDeferredPrompt, () => null);
  const [device, setDevice] = useState<Platform | "desktop">(() => {
    const p = detectPlatform();
    return p === "ios" || p === "android" ? p : "desktop";
  });
  const [installing, setInstalling] = useState(false);

  const tTitle = useT("Get OutbreakNow on your device");
  const tEyebrow = useT("No app store needed");

  useEffect(() => {
    if (!shouldAutoShow()) return;
    const id = setTimeout(() => setOpen(true), delayMs);
    return () => clearTimeout(id);
  }, [delayMs]);

  const dismiss = () => {
    writeState({ ...readState(), snoozedAt: Date.now() });
    setOpen(false);
  };

  const installNow = async () => {
    const p = getDeferredPrompt();
    if (!p) return;
    setInstalling(true);
    try {
      await p.prompt();
      const choice = await p.userChoice;
      if (choice.outcome === "accepted") {
        writeState({ installed: true });
        setOpen(false);
      }
    } finally {
      clearDeferredPrompt();
      setInstalling(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open onClose={dismiss} eyebrow={tEyebrow} title={tTitle} width={480}>
      <p style={{ fontSize: 13, color: "var(--ln-ink-2)", margin: "0 0 14px", lineHeight: 1.55 }}>
        <T>
          Install OutbreakNow straight from your browser — full-screen map, faster loads, and an icon
          on your home screen or desktop. Nothing to download from the App Store or Google Play.
        </T>
      </p>

      {nativePrompt && (
        <button
          onClick={installNow}
          disabled={installing}
          className="ln-btn is-primary"
          style={{ width: "100%", justifyContent: "center", padding: "11px 14px", fontSize: 14, marginBottom: 14 }}
        >
          <InstallBadge /> {installing ? <T>Installing…</T> : <T>Install now — one click</T>}
        </button>
      )}

      <div
        style={{
          border: "1px solid var(--ln-line)",
          borderRadius: 8,
          padding: "12px 14px 14px",
          background: "var(--ln-surface)",
        }}
      >
        {nativePrompt && (
          <div className="ln-eyebrow" style={{ marginBottom: 8 }}>
            <T>Or install manually</T>
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {DEVICE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDevice(tab.id)}
              className="ln-btn"
              style={{
                fontSize: 11.5,
                padding: "5px 10px",
                background: device === tab.id ? "var(--ln-surface-3)" : "transparent",
                color: device === tab.id ? "var(--ln-ink)" : "var(--ln-ink-3)",
                borderColor: device === tab.id ? "var(--ln-line-3)" : "var(--ln-line)",
              }}
            >
              <T>{tab.label}</T>
            </button>
          ))}
        </div>
        <DeviceInstructions device={device} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={dismiss} className="ln-btn">
          <T>Maybe later</T>
        </button>
      </div>
    </Modal>
  );
}
