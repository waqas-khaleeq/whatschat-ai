import { base44, setDemoActive } from '@/api/base44Client';

export const DEMO_EMAIL = "smartlogics.ai@gmail.com";
export const DEMO_DATA_OWNER_ID = "6a0722564fe2ca39da95f461";

// Fetches the current user. For the demo showcase account, remaps `id` to the
// real data owner so every query shows their data, and flags the session as
// read-only via `isDemo` (which also arms the write guard in base44Client).
export async function fetchCurrentUser() {
  const user = await base44.auth.me();
  const isDemo = user?.email === DEMO_EMAIL;
  setDemoActive(isDemo);
  if (isDemo) {
    return { ...user, isDemo: true, realId: user.id, id: DEMO_DATA_OWNER_ID };
  }
  return { ...user, isDemo: false };
}