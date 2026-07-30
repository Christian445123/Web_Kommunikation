import { useEffect, useState } from "react";
import { useServersStore } from "../store/servers.js";
import { ServerSidebar } from "../components/ServerSidebar.js";
import { ChannelList } from "../components/ChannelList.js";
import { MessageView } from "../components/MessageView.js";
import { MemberList } from "../components/MemberList.js";

export function AppShell() {
  const load = useServersStore((s) => s.load);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

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
      <ChannelList activeServerId={activeServerId} activeChannelId={activeChannelId} onSelectChannel={setActiveChannelId} />
      <MessageView channelId={activeChannelId} />
      {activeServerId && <MemberList serverId={activeServerId} />}
    </div>
  );
}
