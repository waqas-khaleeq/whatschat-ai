import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppLayout from "@/components/layout/AppLayout";
import ConversationList from "@/components/inbox/ConversationList";
import ChatArea from "@/components/inbox/ChatArea";
import LeadPanel from "@/components/inbox/LeadPanel";
import NewChatModal from "@/components/inbox/NewChatModal.jsx";
import WaBanner from "@/components/inbox/WaBanner.jsx";

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [waConfig, setWaConfig] = useState(null);
  const [activeView, setActiveView] = useState("list"); // "list" | "chat"
  const [listWidth, setListWidth] = useState(280);
  const isResizing = useRef(false);
  const navigate = useNavigate();
  const convUnsubRef = useRef(null);

  const startResize = useCallback((e) => {
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = listWidth;
    const onMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = Math.min(480, Math.max(200, startWidth + e.clientX - startX));
      setListWidth(newWidth);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [listWidth]);

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    base44.entities.UserWAConfig.filter({ user_id: currentUser.id, is_active: true })
      .then(async configs => {
        if (!configs.length) { navigate("/setup"); return; }
        setWaConfig(configs[0]);

        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id");

        // Initial load
        const data = await base44.entities.Conversation.filter(
          { owner_user_id: currentUser.id }, "-last_message_time", 100
        );
        const sorted = [...data].sort((a, b) =>
          new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date)
        );
        setConversations(sorted);
        setLoading(false);

        if (urlId) {
          const found = data.find(c => c.id === urlId);
          if (found) { setSelected(found); setActiveView("chat"); }
        }

        // Real-time subscription — replaces polling
        convUnsubRef.current = base44.entities.Conversation.subscribe((event) => {
          if (event.data?.owner_user_id !== currentUser.id) return;
          if (event.type === "create") {
            setConversations(prev => {
              if (prev.some(c => c.id === event.data.id)) return prev;
              return [event.data, ...prev];
            });
          } else if (event.type === "update") {
            setConversations(prev =>
              prev.map(c => c.id === event.data.id ? event.data : c)
                .sort((a, b) =>
                  new Date(b.last_message_time || b.created_date) - new Date(a.last_message_time || a.created_date)
                )
            );
            // Keep selected in sync
            setSelected(prev => prev?.id === event.data.id ? event.data : prev);
          } else if (event.type === "delete") {
            setConversations(prev => prev.filter(c => c.id !== event.data.id));
            setSelected(prev => prev?.id === event.data.id ? null : prev);
          }
        });
      });

    return () => {
      if (convUnsubRef.current) convUnsubRef.current();
    };
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
            h-full border-r border-[#e9edef] bg-white shrink-0 relative
            md:block
            ${activeView === "list" ? "block" : "hidden md:block"}
          `}
          style={{ width: listWidth }}
        >
          <div
            className="hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 z-10 transition-colors"
            onMouseDown={startResize}
          />
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