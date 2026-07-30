import { useEffect, useState } from "react";
import { useServersStore } from "../../store/servers.js";

interface Props {
  serverId: string;
}

export function OverviewTab({ serverId }: Props) {
  const server = useServersStore((s) => s.servers.find((sv) => sv.id === serverId));
  const updateServer = useServersStore((s) => s.updateServer);
  const [name, setName] = useState(server?.name ?? "");
  const [iconUrl, setIconUrl] = useState(server?.iconUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(server?.bannerUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(server?.name ?? "");
    setIconUrl(server?.iconUrl ?? "");
    setBannerUrl(server?.bannerUrl ?? "");
  }, [server?.id]);

  async function handleSave() {
    setSaving(true);
    try {
      await updateServer(serverId, {
        name,
        iconUrl: iconUrl.trim() ? iconUrl.trim() : null,
        bannerUrl: bannerUrl.trim() ? bannerUrl.trim() : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Server-Übersicht</h2>
      <div className="banner-preview" style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}>
        {name}
      </div>
      <div className="form-field">
        <label>Servername</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Icon-URL</label>
        <input value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="https://…" />
      </div>
      <div className="form-field">
        <label>Banner-URL</label>
        <input value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} placeholder="https://…" />
      </div>
      <button className="save-button" onClick={handleSave} disabled={saving}>
        Speichern
      </button>
    </div>
  );
}
