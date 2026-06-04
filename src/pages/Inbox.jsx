import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/inbox/ConversationList";
import ChatArea from "@/components/inbox/ChatArea";
import LeadPanel from "@/components/inbox/LeadPanel";
import NewChatModal from "@/components/inbox/NewChatModal";

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Check setup: if no UserWAConfig for this user, redirect to setup
    base44.entities.UserWAConfig.filter({ user_id: currentUser.id, is_active: true })
      .then(configs => {
        if (!configs.length) {
          navigate("/setup");
          return;
        }
        // Load conversations
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        base44.entities.Conversation.filter({ owner_user_id: currentUser.id }, "-last_message_time", 100)
          .then((data) => {
            setConversations(data);
            if (id) {
              const found = data.find((c) => c.id === id);
              if (found) setSelected(found);
            }
          })
          .finally(() => setLoading(false));
      });
  }, [currentUser, navigate]);

  const handleSelect = (conv) => {
    setSelected(conv);
    setShowDetails(false);
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
    const updated = {
      ...selected,
      handling_mode: mode === "paused" ? selected.handling_mode : mode,
      ai_paused: mode === "paused",
    };
    handleUpdate(updated);
  };

  const handleNewConversation = (conv) => {
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === conv.id);
      if (exists) return prev;
      return [conv, ...prev];
    });
    setSelected(conv);
    setShowDetails(false);
  };

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        <div className="w-72 shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id}
            onSelect={handleSelect}
            currentUser={currentUser?.full_name || "Agent"}
            onNewChat={() => setShowNewChat(true)}
          />
        </div>

        <ChatArea
          conversation={selected}
          onHandoverChange={handleHandoverChange}
          onShowDetails={() => setShowDetails(true)}
          currentUser={currentUser}
        />

        {showDetails && (
          <LeadPanel
            conversation={selected}
            onUpdate={handleUpdate}
            onClose={() => setShowDetails(false)}
          />
        )}
      </div>

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onConversationCreated={handleNewConversation}
          currentUser={currentUser}
        />
      )}
    </AppLayout>
  );
}