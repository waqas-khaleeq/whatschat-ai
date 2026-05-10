import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/inbox/ConversationList";
import ChatArea from "@/components/inbox/ChatArea";
import LeadPanel from "@/components/inbox/LeadPanel";

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadConversations = () => {
    return base44.entities.Conversation.list("-last_message_time", 100)
      .then((data) => {
        setConversations(data);
        return data;
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    loadConversations().then((data) => {
      if (id) {
        const found = data.find((c) => c.id === id);
        if (found) setSelected(found);
      }
    });

    // Real-time subscription for new conversations and updates
    const unsubscribe = base44.entities.Conversation.subscribe((event) => {
      if (event.type === "create") {
        setConversations((prev) => {
          const exists = prev.find((c) => c.id === event.id);
          if (exists) return prev;
          return [event.data, ...prev];
        });
      } else if (event.type === "update") {
        setConversations((prev) =>
          prev.map((c) => (c.id === event.id ? { ...c, ...event.data } : c))
            .sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0))
        );
        setSelected((prev) => prev?.id === event.id ? { ...prev, ...event.data } : prev);
      } else if (event.type === "delete") {
        setConversations((prev) => prev.filter((c) => c.id !== event.id));
        setSelected((prev) => prev?.id === event.id ? null : prev);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSelect = (conv) => {
    setSelected(conv);
    if (conv.unread_count > 0) {
      base44.entities.Conversation.update(conv.id, { unread_count: 0 });
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c))
      );
    }
  };

  const handleUpdate = (updated) => {
    setSelected(updated);
    setConversations((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleHandoverChange = (mode) => {
    if (!selected) return;
    const updated = { ...selected, handling_mode: mode };
    handleUpdate(updated);
  };

  const totalUnread = conversations.reduce((a, c) => a + (c.unread_count || 0), 0);

  return (
    <AppLayout unreadCount={totalUnread}>
      <div className="flex h-full overflow-hidden">
        <div className="w-72 shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id}
            onSelect={handleSelect}
            loading={loading}
          />
        </div>
        <ChatArea
          conversation={selected}
          onHandoverChange={handleHandoverChange}
        />
        <LeadPanel
          conversation={selected}
          onUpdate={handleUpdate}
        />
      </div>
    </AppLayout>
  );
}