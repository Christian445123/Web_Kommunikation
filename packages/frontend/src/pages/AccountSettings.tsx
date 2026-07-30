import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth.js";
import { useServersStore } from "../store/servers.js";
import { privacyApi, usersApi } from "../api/resources.js";

interface Props {
  onClose: () => void;
}

export function AccountSettings({ onClose }: Props) {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const logout = useAuthStore((s) => s.logout);
  const servers = useServersStore((s) => s.servers);
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [showcasedServerId, setShowcasedServerId] = useState(user?.showcasedServerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await updateProfile({ displayName, showcasedServerId: showcasedServerId || null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  async function handleExportData() {
    const data = await privacyApi.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nythera-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDeleteAccount() {
    if (!deleteConfirmed || !deletePassword) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await usersApi.eraseMe(deletePassword);
      await logout();
      onClose();
      navigate("/login");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-tabs">
          <button className="active">Mein Konto</button>
        </div>
        <div className="settings-content">
          <h2>Mein Konto</h2>
          <div className="form-field">
            <label>Anzeigename</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Server-Tag anzeigen</label>
            <select value={showcasedServerId} onChange={(e) => setShowcasedServerId(e.target.value)}>
              <option value="">Keiner</option>
              {servers
                .filter((s) => s.tag)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.tag})
                  </option>
                ))}
            </select>
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="save-button" onClick={handleSave} disabled={saving}>
            Speichern
          </button>

          <h2 style={{ marginTop: 32 }}>Meine Daten</h2>
          <p style={{ color: "#96989d" }}>Lade eine vollständige, maschinenlesbare Kopie deiner bei Nythera gespeicherten Daten herunter.</p>
          <button className="save-button" onClick={handleExportData}>
            Meine Daten herunterladen
          </button>

          <div className="danger-zone">
            <h2 style={{ marginTop: 0 }}>Konto löschen</h2>
            <p style={{ color: "#96989d" }}>
              Dein Profil wird anonymisiert (Name, E-Mail, Avatar entfernt). Bereits geschriebene Nachrichten bleiben unter "Gelöschter
              Nutzer" sichtbar, damit Unterhaltungen für andere nicht kaputtgehen. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="form-field">
              <label>Passwort zur Bestätigung</label>
              <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            </div>
            <label className="consent-checkbox">
              <input type="checkbox" checked={deleteConfirmed} onChange={(e) => setDeleteConfirmed(e.target.checked)} />
              <span>Ich verstehe, dass mein Konto dauerhaft anonymisiert wird.</span>
            </label>
            {deleteError && <div className="auth-error">{deleteError}</div>}
            <button
              onClick={handleDeleteAccount}
              disabled={!deleteConfirmed || !deletePassword || deleting}
              style={{ marginTop: 12 }}
            >
              Konto endgültig löschen
            </button>
          </div>
        </div>
        <button className="settings-close" onClick={onClose} title="Schließen">
          ✕
        </button>
      </div>
    </div>
  );
}
