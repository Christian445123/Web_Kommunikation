import { useEffect, useState } from "react";
import { useServersStore } from "../store/servers.js";
import { ServerSidebar } from "../components/ServerSidebar.js";
import { ChannelList } from "../components/ChannelList.js";
import { MessageView } from "../components/MessageView.js";
import { MemberList } from "../components/MemberList.js";
import { ServerSettingsModal } from "./ServerSettings/ServerSettingsModal.js";
import { AccountSettings } from "./AccountSettings.js";

export function AppShell() {
  const load = useServersStore((s) => s.load);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  function selectServer(id: string | null) {
    setActiveServerId(id);
    setActiveChannelId(null);
  }

  return (
    <div className="app-shell">
      <ServerSidebar activeServerId={activeServerId} onSelectServer={selectServer} />
      <ChannelList
        activeServerId={activeServerId}
        activeChannelId={activeChannelId}
        onSelectChannel={setActiveChannelId}
        onOpenServerSettings={setSettingsServerId}
        onOpenAccountSettings={() => setAccountSettingsOpen(true)}
      />
      <MessageView channelId={activeChannelId} />
      {activeServerId && <MemberList serverId={activeServerId} />}
      {settingsServerId && <ServerSettingsModal serverId={settingsServerId} onClose={() => setSettingsServerId(null)} />}
      {accountSettingsOpen && <AccountSettings onClose={() => setAccountSettingsOpen(false)} />}
    </div>
  );
}
