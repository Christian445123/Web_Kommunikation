import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { permissionsFromString, Permission, type BotApplication } from "@nythera/shared";
import { useServersStore } from "../store/servers.js";
import { useBotsStore } from "../store/bots.js";
import { botsApi } from "../api/resources.js";

const PERMISSION_LABELS: [bigint, string][] = [
  [Permission.VIEW_CHANNEL, "Kanäle ansehen"],
  [Permission.SEND_MESSAGES, "Nachrichten senden"],
  [Permission.MANAGE_MESSAGES, "Nachrichten verwalten"],
  [Permission.MANAGE_CHANNELS, "Kanäle verwalten"],
  [Permission.MANAGE_ROLES, "Rollen verwalten"],
  [Permission.MANAGE_SERVER, "Server verwalten"],
  [Permission.CREATE_INVITE, "Einladungen erstellen"],
  [Permission.KICK_MEMBERS, "Mitglieder entfernen"],
  [Permission.BAN_MEMBERS, "Mitglieder bannen"],
  [Permission.CONNECT, "Voice beitreten"],
  [Permission.SPEAK, "Sprechen"],
  [Permission.ADMINISTRATOR, "Administrator (alle Rechte)"],
];

export function BotInvite() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const permissionsParam = searchParams.get("permissions") ?? "0";
  const requestedMask = permissionsFromString(permissionsParam);
  const servers = useServersStore((s) => s.servers);
  const loadServers = useServersStore((s) => s.load);
  const invite = useBotsStore((s) => s.invite);
  const [app, setApp] = useState<BotApplication | null>(null);
  const [selectedServerId, setSelectedServerId] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId) void botsApi.get(applicationId).then(setApp);
    void loadServers();
  }, [applicationId, loadServers]);

  const grantedPermissions = PERMISSION_LABELS.filter(([flag]) => (requestedMask & flag) === flag);

  async function handleConfirm() {
    if (!applicationId || !selectedServerId) return;
    setError(null);
    try {
      await invite(applicationId, selectedServerId, permissionsParam);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Einladung fehlgeschlagen");
    }
  }

  if (!app) return <div className="legal-page">Lade…</div>;

  if (done) {
    return (
      <div className="legal-page">
        <h1>Bot hinzugefügt</h1>
        <p>{app.name} wurde deinem Server hinzugefügt.</p>
      </div>
    );
  }

  return (
    <div className="legal-page">
      <h1>Bot zu Server hinzufügen</h1>
      <p>
        <strong>{app.name}</strong> möchte folgende Rechte auf einem Server erhalten:
      </p>
      <ul>
        {grantedPermissions.map(([, label]) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
      <div className="form-field">
        <label>Server auswählen</label>
        <select value={selectedServerId} onChange={(e) => setSelectedServerId(e.target.value)}>
          <option value="">Bitte wählen</option>
          {servers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {error && <div className="auth-error">{error}</div>}
      <button className="save-button" onClick={handleConfirm} disabled={!selectedServerId}>
        Bot hinzufügen
      </button>
    </div>
  );
}
