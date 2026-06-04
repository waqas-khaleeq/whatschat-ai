import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Copy, Eye, EyeOff, ExternalLink, CheckCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

const STEPS = ["Create Meta App", "API Credentials", "Configure Webhook", "Test Message", "Go Live"];

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors shrink-0 font-medium"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function StepProgress({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
              i < current ? "bg-emerald-500 border-emerald-500 text-white"
                : i === current ? "bg-white border-emerald-500 text-emerald-600"
                : "bg-white border-gray-200 text-gray-400"
            )}>
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium text-center leading-tight max-w-[60px]",
              i === current ? "text-emerald-600" : "text-gray-400"
            )}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn("flex-1 h-0.5 mb-4 mx-1", i < current ? "bg-emerald-500" : "bg-gray-200")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1 ──────────────────────────────────────────────────────────────────
function Step1({ onNext }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">First, create your WhatsApp app on Meta</h2>
      <p className="text-sm text-gray-500 mb-6">Follow these steps in the Meta Developer Console.</p>
      <ol className="space-y-3 mb-6">
        {[
          <>Open Meta Developer Console at <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-600 font-semibold underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="w-3 h-3" /></a></>,
          'Click "My Apps" in the top right, then "Create App".',
          'Choose app type: "Business".',
          'Give your app a name (e.g. "MyCompany WhatsApp"), enter your email, click Create.',
          'On the next screen, scroll down to find "WhatsApp" and click "Set up".',
          "You are now on the WhatsApp Getting Started page — keep this tab open for the next steps.",
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <Button onClick={onNext} className="w-full">
        I've created my app — Next <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

// ── Step 2 ──────────────────────────────────────────────────────────────────
function Step2({ onNext }) {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isValid =
    phoneNumberId.trim().length >= 10 &&
    /^\d+$/.test(phoneNumberId.trim()) &&
    accessToken.trim().length >= 50;

  const handleNext = async () => {
    setError("");
    setSaving(true);
    const res = await base44.functions.invoke("createOrUpdateWAConfig", {
      phone_number_id: phoneNumberId.trim(),
      access_token: accessToken.trim(),
      waba_id: wabaId.trim() || undefined,
      display_name: displayName.trim() || undefined,
    });
    setSaving(false);
    if (!res?.data?.success) {
      setError(res?.data?.error || "Failed to save. Please try again.");
      return;
    }
    onNext(res.data.config);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Enter Your API Credentials</h2>
      <p className="text-sm text-gray-500 mb-6">Find these on the WhatsApp Getting Started page in your Meta App.</p>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number ID *</label>
          <input
            value={phoneNumberId}
            onChange={e => setPhoneNumberId(e.target.value)}
            placeholder="e.g. 123456789012345"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-1">On the Meta Getting Started page, find the "Phone Number ID" field and copy it here. It is a long number, not your actual phone number.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Permanent Access Token *</label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={accessToken}
              onChange={e => setAccessToken(e.target.value)}
              placeholder="Paste your System User token here"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Do NOT use the temporary token shown on the Getting Started page — it expires in 24 hours. Instead, go to Meta Business Manager → System Users → Generate Token with whatsapp_business_messaging permission and Never expiry.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">WABA ID <span className="font-normal text-gray-400">(optional but recommended)</span></label>
          <input
            value={wabaId}
            onChange={e => setWabaId(e.target.value)}
            placeholder="e.g. 987654321098765"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-1">Found on the same Getting Started page above the Phone Number ID.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Display name for this account</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="e.g. Acme Support"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-xs text-gray-400 mt-1">Used only inside this app to identify your WhatsApp account.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <Button onClick={handleNext} disabled={!isValid || saving} className="w-full mt-6">
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <>Save & Continue <ArrowRight className="w-4 h-4 ml-1" /></>}
      </Button>
    </div>
  );
}

// ── Step 3 ──────────────────────────────────────────────────────────────────
function Step3({ onNext, userConfig, userId }) {
  const [testing, setTesting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [testError, setTestError] = useState("");

  const webhookUrl = userConfig?.webhook_url || (window.location.origin + "/functions/whatsappWebhook");
  const verifyToken = userConfig?.verify_token || "";

  const handleTest = async () => {
    setTesting(true);
    setTestError("");
    const res = await base44.functions.invoke("verifyWhatsAppConnection", { user_id: userId });
    setTesting(false);
    if (res?.data?.success) {
      setVerified(true);
    } else {
      setTestError(res?.data?.error || "Verification failed. Check your credentials and try again.");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Configure Your Webhook</h2>
      <p className="text-sm text-gray-500 mb-5">Paste these exact values into your Meta App's webhook configuration.</p>

      <div className="space-y-3 mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Callback URL — paste this into Meta exactly</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <span className="text-sm text-gray-800 flex-1 font-mono break-all text-xs">{webhookUrl}</span>
            <CopyButton value={webhookUrl} />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Verify Token — paste this into Meta exactly</p>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
            <span className="text-sm text-gray-800 flex-1 font-mono break-all">{verifyToken || <span className="text-gray-400 italic">Loading...</span>}</span>
            {verifyToken && <CopyButton value={verifyToken} />}
          </div>
        </div>
      </div>

      <ol className="space-y-2 mb-6">
        {[
          "Go back to your Meta App → WhatsApp → Configuration.",
          'Under "Webhook" section, click "Edit".',
          "Paste the Callback URL above into the \"Callback URL\" field.",
          "Paste the Verify Token above into the \"Verify Token\" field.",
          'Click "Verify and Save" — Meta will call your webhook to verify it right now.',
          'After saving, click "Manage" next to Webhook fields.',
          'Find "messages" in the list and toggle it ON to subscribe.',
          'Click "Done".',
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      {verified ? (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="text-sm text-emerald-700 font-semibold">Connected successfully! Your webhook is verified.</span>
        </div>
      ) : testError ? (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-600">{testError}</p>
        </div>
      ) : null}

      <Button variant="outline" onClick={handleTest} disabled={testing} className="w-full mb-3">
        {testing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Testing...</> : <><RefreshCw className="w-4 h-4 mr-2" />Test Connection</>}
      </Button>

      <Button onClick={onNext} disabled={!verified} className="w-full">
        Next — Webhook Verified <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

// ── Step 4 ──────────────────────────────────────────────────────────────────
function Step4({ onNext, userId }) {
  const [messages, setMessages] = useState([]);
  const [received, setReceived] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    pollRef.current = setInterval(async () => {
      if (!userId) return;
      const convs = await base44.entities.Conversation.filter({ owner_user_id: userId }, "-last_message_time", 5);
      if (!convs.length) return;
      const recentMsgs = await base44.entities.Message.filter({
        conversation_id: convs[0].id,
        sender: "customer",
      }, "timestamp", 5);
      if (recentMsgs.length > 0) {
        setMessages(recentMsgs.slice(0, 5));
        setReceived(true);
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [userId]);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-1">Send a Test Message</h2>
      <p className="text-sm text-gray-500 mb-5">Confirm your webhook is receiving messages correctly.</p>

      <ol className="space-y-2 mb-5">
        {[
          "Pick up your phone and open WhatsApp.",
          "Send any message (e.g. \"hello\") to the phone number linked to your WhatsApp Business account.",
          "Watch below — it should appear within 5 seconds.",
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-gray-700 p-3 mb-4 overflow-y-auto" style={{ height: 200, background: "#1a1a1a" }}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for incoming message...
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {received && (
              <div className="flex items-center gap-2 bg-emerald-900/50 border border-emerald-500/30 rounded-lg px-3 py-2 mb-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-emerald-300 font-semibold">Message received! Your WhatsApp is working correctly.</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className="bg-white/10 rounded-lg px-3 py-2">
                <p className="text-xs text-gray-300">{m.content}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : ""}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button onClick={onNext} className="w-full mb-2">
        {received ? <>Next — Message Received! <ArrowRight className="w-4 h-4 ml-1" /></> : <>Next — Continue Anyway <ArrowRight className="w-4 h-4 ml-1" /></>}
      </Button>
      <button onClick={onNext} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
        Skip — I'll test later →
      </button>
    </div>
  );
}

// ── Step 5 ──────────────────────────────────────────────────────────────────
function Step5({ userConfig }) {
  const navigate = useNavigate();
  const masked = userConfig?.phone_number_id
    ? "****" + userConfig.phone_number_id.slice(-4)
    : "N/A";

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="20" fill="#10b981" fillOpacity="0.15" />
          <path d="M12 21L17 26L28 15" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Your WhatsApp is connected</h2>
      <p className="text-sm text-gray-500 mb-6">You can now receive and reply to messages in your inbox.</p>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left mb-6 space-y-2">
        {userConfig?.display_name && (
          <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
            <span className="text-sm text-gray-600">Display Name</span>
            <span className="text-sm font-semibold text-gray-800">{userConfig.display_name}</span>
          </div>
        )}
        <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
          <span className="text-sm text-gray-600">Phone Number ID</span>
          <span className="text-sm font-semibold text-gray-800 font-mono">{masked}</span>
        </div>
        <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
          <span className="text-sm text-gray-600">Status</span>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">● Connected</span>
        </div>
        <div className="flex items-center justify-between py-1.5">
          <span className="text-sm text-gray-600">Webhook</span>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">● Active</span>
        </div>
      </div>

      <Button onClick={() => navigate("/inbox")} className="w-full text-base py-3 h-12">
        Open My Inbox → <ArrowRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}

// ── Main Wizard ──────────────────────────────────────────────────────────────
export default function SetupWizard() {
  const [step, setStep] = useState(0);
  const [userConfig, setUserConfig] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u) return;
      setUserId(u.id);
      // If already connected, redirect to inbox
      base44.entities.UserWAConfig.filter({ user_id: u.id, is_active: true })
        .then(configs => {
          if (configs.length > 0 && configs[0].connection_status === "connected") {
            navigate("/inbox");
          }
        })
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, [navigate]);

  const next = (config) => {
    if (config && config.id) setUserConfig(config);
    setStep(s => s + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">W</span>
            </div>
            <span className="font-bold text-gray-800">WhatsChat AI</span>
          </div>
          <p className="text-xs text-gray-400">Setup Wizard</p>
        </div>

        <StepProgress current={step} />

        {step === 0 && <Step1 onNext={() => next()} />}
        {step === 1 && <Step2 onNext={next} />}
        {step === 2 && <Step3 onNext={() => next()} userConfig={userConfig} userId={userId} />}
        {step === 3 && <Step4 onNext={() => next()} userId={userId} />}
        {step === 4 && <Step5 userConfig={userConfig} />}
      </div>
    </div>
  );
}