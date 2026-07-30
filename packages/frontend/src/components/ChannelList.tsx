import { useEffect, useState } from "react";
import { useServersStore } from "../store/servers.js";
import { useChannelsStore } from "../store/channels.js";
import { useAuthStore } from "../store/auth.js";
import { useMessagesStore } from "../store/messages.js";

interface Props {
  activeServerId: string | null;
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
}

export function ChannelList({ activeServerId, activeChannelId, onSelectChannel }: Props) {
  const servers = useServersStore((s) => s.servers);
  const loadMembersAndRoles = useServersStore((s) => s.loadMembersAndRoles);
  const channelsByServer = useChannelsStore((s) => s.channelsByServer);
  const dms = useChannelsStore((s) => s.dms);
  const loadServerChannels = useChannelsStore((s) => s.loadServerChannels);
  const loadDms = useChannelsStore((s) => s.loadDms);
  const createChannel = useChannelsStore((s) => s.createChannel);
  const openDm = useChannelsStore((s) => s.openDm);
  const loadHistory = useMessagesStore((s) => s.loadHistory);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [newChannelName, setNewChannelName] = useState("");
  const [dmUserId, setDmUserId] = useState("");

  useEffect(() => {
    if (activeServerId) {
      void loadServerChannels(activeServerId);
      void loadMembersAndRoles(activeServerId);
    } else {
      void loadDms();
    }
  }, [activeServerId, loadServerChannels, loadMembersAndRoles, loadDms]);

  function selectChannel(id: string) {
    onSelectChannel(id);
    void loadHistory(id);
  }

  const server = servers.find((s) => s.id === activeServerId);
  const channels = activeServerId ? (channelsByServer[activeServerId] ?? []) : [];

  async function handleCreateChannel() {
    if (!activeServerId || !newChannelName.trim()) return;
    try {
      await createChannel(activeServerId, { name: newChannelName.trim(), type: "text" });
      setNewChannelName("");
    } catch {
      // Most likely a missing MANAGE_CHANNELS permission - silently ignored in this MVP UI.
    }
  }

  async function handleOpenDm() {
    if (!dmUserId.trim()) return;
    const channel = await openDm(dmUserId.trim());
    setDmUserId("");
    selectChannel(channel.id);
  }

  return (
    <div className="channel-sidebar">
      <div className="channel-sidebar-header">{activeServerId ? (server?.name ?? "Server") : "Direktnachrichten"}</div>
      <div className="channel-list">
        {activeServerId ? (
          <>
            <div className="channel-section-label">Textkanäle</div>
            {channels
              .filter((c) => c.type === "text")
              .map((channel) => (
                <div
                  key={channel.id}
                  className={`channel-item ${activeChannelId === channel.id ? "active" : ""}`}
                  onClick={() => selectChannel(channel.id)}
                >
                  # {channel.name}
                </div>
              ))}
            <div className="inline-form">
              <input placeholder="Neuer Kanal" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
              <button onClick={handleCreateChannel}>Kanal erstellen</button>
            </div>
          </>
        ) : (
          <>
            {dms.map((dm) => (
              <div key={dm.id} className={`dm-item ${activeChannelId === dm.id ? "active" : ""}`} onClick={() => selectChannel(dm.id)}>
                DM {dm.id.slice(0, 8)}
              </div>
            ))}
            <div className="inline-form">
              <input placeholder="Nutzer-ID für neue DM" value={dmUserId} onChange={(e) => setDmUserId(e.target.value)} />
              <button onClick={handleOpenDm}>DM öffnen</button>
            </div>
          </>
        )}
      </div>
      <div className="sidebar-user">
        <span>{user?.displayName}</span>
        <span>
          <button
            className="icon-button"
            title={`Eigene Nutzer-ID kopieren: ${user?.id}`}
            onClick={() => user && navigator.clipboard.writeText(user.id)}
          >
            ⧉
          </button>
          <button className="icon-button" title="Abmelden" onClick={() => logout()}>
            ⏻
          </button>
        </span>
      </div>
    </div>
  );
}
