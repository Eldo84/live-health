import { TopBar } from "./SurveillanceMap";
import LocationAlertsCard from "../../components/LocationAlertsCard";
import { T } from "../components/T";

/**
 * User settings page. Currently hosts location-based outbreak alert
 * preferences (in-app + email). Add future per-user settings cards here.
 */
export default function SettingsScreen() {
  return (
    <div
      className="ln-app"
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "var(--ln-bg)",
        color: "var(--ln-ink)",
        display: "grid",
        gridTemplateRows: "52px 1fr",
      }}
    >
      <TopBar active="none" />
      <div className="ln-pane" style={{ overflowY: "auto" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 28px 80px" }}>
          <h1 className="ln-display" style={{ fontSize: 34, marginBottom: 6 }}>
            <T>Settings</T>
          </h1>
          <p style={{ color: "var(--ln-ink-3)", fontSize: 14, marginBottom: 28 }}>
            <T>Manage how OutbreakNow notifies you.</T>
          </p>

          <LocationAlertsCard />
        </div>
      </div>
    </div>
  );
}
