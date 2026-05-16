import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Page imports
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import Leads from './pages/Leads';
import CalendarPage from './pages/CalendarPage';
import KnowledgeBase from './pages/KnowledgeBase';
import AIAgent from './pages/AIAgent';
import Automations from './pages/Automations';
import Analytics from './pages/Analytics';
import Integrations from './pages/Integrations';
import Team from './pages/Team';
import Settings from './pages/Settings';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading WhatsChat AI...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/inbox" element={<Inbox />} />
      <Route path="/leads" element={<Leads />} />
      <Route path="/calendar" element={<CalendarPage />} />
      <Route path="/knowledge" element={<KnowledgeBase />} />
      <Route path="/ai-agent" element={<AIAgent />} />
      <Route path="/automations" element={<Automations />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/integrations" element={<Integrations />} />
      <Route path="/team" element={<Team />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;