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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    base44.entities.Conversation.list("-last_message_time", 100)
      .then((data) => {
        setConversations(data);
        if (id) {
          const found = data.find((c) => c.id === id);
          if (found) setSelected(found);
        }
      })
      .finally(() => setLoading(false));
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

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Left: conversation list */}
        <div className="w-72 shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id}
            onSelect={handleSelect}
            currentUser="admin"
          />
        </div>

        {/* Center: chat */}
        <ChatArea
          conversation={selected}
          onHandoverChange={handleHandoverChange}
        />

        {/* Right: lead panel */}
        <LeadPanel
          conversation={selected}
          onUpdate={handleUpdate}
        />
      </div>
    </AppLayout>
  );
}