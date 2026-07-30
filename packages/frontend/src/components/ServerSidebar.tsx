import { useState } from "react";
import { useServersStore } from "../store/servers.js";

interface Props {
  activeServerId: string | null;
  onSelectServer: (id: string | null) => void;
}

export function ServerSidebar({ activeServerId, onSelectServer }: Props) {
  const servers = useServersStore((s) => s.servers);
  const createServer = useServersStore((s) => s.createServer);
  const joinServer = useServersStore((s) => s.joinServer);
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!value.trim()) return;
    setError(null);
    try {
      const server = mode === "create" ? await createServer(value.trim()) : await joinServer(value.trim());
      onSelectServer(server.id);
      setValue("");
      setMode("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  return (
    <div className="server-sidebar">
      <button
        className={`server-icon ${activeServerId === null ? "active" : ""}`}
        onClick={() => onSelectServer(null)}
        title="Direktnachrichten"
      >
        DM
      </button>

      {servers.map((server) => (
        <button
          key={server.id}
          className={`server-icon ${activeServerId === server.id ? "active" : ""}`}
          onClick={() => onSelectServer(server.id)}
          title={server.name}
        >
          {server.name.slice(0, 2).toUpperCase()}
        </button>
      ))}

      {mode === "none" ? (
        <>
          <button className="server-icon" onClick={() => setMode("create")} title="Server erstellen">
            +
          </button>
          <button className="server-icon" onClick={() => setMode("join")} title="Server beitreten">
            #
          </button>
        </>
      ) : (
        <div className="inline-form">
          <input
            placeholder={mode === "create" ? "Servername" : "Invite-Code"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <button onClick={submit}>{mode === "create" ? "Erstellen" : "Beitreten"}</button>
          <button onClick={() => setMode("none")}>Abbrechen</button>
          {error && <span className="auth-error">{error}</span>}
        </div>
      )}
    </div>
  );
}
