import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMessagesStore } from "../store/messages.js";
import { useAuthStore } from "../store/auth.js";
import { useUser } from "../hooks/useUser.js";
import { ServerTagBadge } from "./ServerTagBadge.js";

interface Props {
  channelId: string | null;
}

function MessageAuthor({ authorId }: { authorId: string }) {
  const user = useUser(authorId);
  return (
    <span className="message-author">
      {user?.displayName ?? "…"}
      <ServerTagBadge showcasedServerId={user?.showcasedServerId} />
    </span>
  );
}

function TypingIndicator({ channelId }: { channelId: string }) {
  const typingUserIds = useMessagesStore((s) => s.typingByChannel[channelId] ?? []);
  const me = useAuthStore((s) => s.user?.id);
  const others = typingUserIds.filter((id) => id !== me);
  if (others.length === 0) return <div className="typing-indicator" />;
  return <div className="typing-indicator">{others.length === 1 ? "Jemand schreibt…" : `${others.length} Personen schreiben…`}</div>;
}

export function MessageView({ channelId }: Props) {
  const messages = useMessagesStore((s) => (channelId ? (s.messagesByChannel[channelId] ?? []) : []));
  const sendMessage = useMessagesStore((s) => s.sendMessage);
  const notifyTyping = useMessagesStore((s) => s.notifyTyping);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const typingThrottleRef = useRef(0);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  if (!channelId) {
    return <div className="message-area centered">Wähle einen Kanal aus</div>;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !channelId) return;
    sendMessage(channelId, draft.trim());
    setDraft("");
  }

  function handleChange(value: string) {
    setDraft(value);
    const now = Date.now();
    if (channelId && now - typingThrottleRef.current > 2000) {
      typingThrottleRef.current = now;
      notifyTyping(channelId);
    }
  }

  return (
    <div className="message-area">
      <div className="message-area-header">Kanal</div>
      <div className="message-list" ref={listRef}>
        {messages.map((message) => (
          <div className="message-row" key={message.id}>
            <div className="message-avatar">{message.authorId.slice(0, 1).toUpperCase()}</div>
            <div>
              <div>
                <MessageAuthor authorId={message.authorId} />
                <span className="message-timestamp">{new Date(message.createdAt).toLocaleTimeString()}</span>
              </div>
              <div>{message.content}</div>
            </div>
          </div>
        ))}
      </div>
      <TypingIndicator channelId={channelId} />
      <form className="message-input-bar" onSubmit={handleSubmit}>
        <input placeholder="Nachricht schreiben…" value={draft} onChange={(e) => handleChange(e.target.value)} />
      </form>
    </div>
  );
}
