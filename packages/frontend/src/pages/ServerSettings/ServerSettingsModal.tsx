import { useState } from "react";
import { OverviewTab } from "./OverviewTab.js";
import { RolesTab } from "./RolesTab.js";
import { TagTab } from "./TagTab.js";

interface Props {
  serverId: string;
  onClose: () => void;
}

type Tab = "overview" | "roles" | "tag";

export function ServerSettingsModal({ serverId, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-tabs">
          <button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>
            Übersicht
          </button>
          <button className={tab === "roles" ? "active" : ""} onClick={() => setTab("roles")}>
            Rollen
          </button>
          <button className={tab === "tag" ? "active" : ""} onClick={() => setTab("tag")}>
            Server-Tag
          </button>
        </div>
        <div className="settings-content">
          {tab === "overview" && <OverviewTab serverId={serverId} />}
          {tab === "roles" && <RolesTab serverId={serverId} />}
          {tab === "tag" && <TagTab serverId={serverId} />}
        </div>
        <button className="settings-close" onClick={onClose} title="Schließen">
          ✕
        </button>
      </div>
    </div>
  );
}
