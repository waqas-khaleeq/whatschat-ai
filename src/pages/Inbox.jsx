import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/inbox/ConversationList";
import ChatArea from "@/components/inbox/ChatArea";
import LeadPanel from "@/components/inbox/LeadPanel";
import NewChatModal from "@/components/inbox/NewChatModal";
import WaBanner from "@/components/inbox/WaBanner.jsx";

const POLL_INTERVAL = 5000;

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [waConfig, setWaConfig] = useState(null);
  const [activeView, setActiveView] = useState("list"); // "list" | "chat"
  const navigate = useNavigate();
  const pollRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    base44.entities.UserWAConfig.filter({ user_id: currentUser.id, is_active: true })
      .then(configs => {
        if (!configs.length) { navigate("/setup"); return; }
        setWaConfig(configs[0]);

        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        const load = () =>
          base44.entities.Conversation.filter({ owner_user_id: currentUser.id }, "-last_message_time", 100)
            .then(data => {
              setConversations(prev => {
                // Merge: preserve order for existing, prepend new
                const prevIds = new Set(prev.map(c => c.id));
                const newOnes = data.filter(c => !prevIds.has(c.id));
                const updated = prev.map(c => data.find(d => d.id === c.id) || c);
                return [...newOnes, ...updated].sort((a, b) =>
                  new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date)
                );
              });
              if (id) {
                const found = data.find(c => c.id === id);
                if (found) { setSelected(found); setActiveView("chat"); }
              }
            });

        load().finally(() => setLoading(false));
        pollRef.current = setInterval(load, POLL_INTERVAL);
      });

    return () => clearInterval(pollRef.current);
  }, [currentUser, navigate]);

  const handleSelect = (conv) => {
    setSelected(conv);
    setActiveView("chat");
    if (conv.unread_count > 0) {
      base44.entities.Conversation.update(conv.id, { unread_count: 0 });
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    }
  };

  const handleUpdate = (updated) => {
    setSelected(updated);
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
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

  const handleConversationUpdate = (updated) => {
    setConversations(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (selected?.id === updated.id) setSelected(updated);
  };

  const handleNewConversation = (conv) => {
    setConversations(prev => prev.some(c => c.id === conv.id) ? prev : [conv, ...prev]);
    setSelected(conv);
    setActiveView("chat");
  };

  const handleBack = () => {
    setActiveView("list");
    setShowDetails(false);
  };

  return (
    <AppLayout>
      <div className="h-full flex flex-col overflow-hidden">
      {/* WhatsApp disconnected banner */}
      <WaBanner config={waConfig} />

      {/* Desktop: grid layout. Mobile: full screen with view switching */}
      <div className="flex-1 overflow-hidden flex">
        {/* Conversation List — hidden on mobile when chat is active */}
        <div
          className={`
            h-full border-r border-[#e9edef] bg-white shrink-0
            md:w-[280px] md:block
            ${activeView === "list" ? "w-full block" : "hidden"}
          `}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selected?.id}
            onSelect={handleSelect}
            onNewChat={() => setShowNewChat(true)}
            loading={loading}
          />
        </div>

        {/* Chat Area — hidden on mobile when list is active */}
        <div
          className={`
            h-full flex flex-1 min-w-0 overflow-hidden
            md:flex
            ${activeView === "chat" ? "flex w-full" : "hidden"}
          `}
        >
          <ChatArea
            conversation={selected}
            onHandoverChange={handleHandoverChange}
            onShowDetails={() => setShowDetails(true)}
            currentUser={currentUser}
            onBack={handleBack}
            onConversationUpdate={handleConversationUpdate}
          />

          {showDetails && (
            <LeadPanel
              conversation={selected}
              onUpdate={handleUpdate}
              onClose={() => setShowDetails(false)}
            />
          )}
        </div>
      </div>

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