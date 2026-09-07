import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// ── Demo mode guard ──────────────────────────────────────────────────────────
// When a demo (view-only) session is active, entity writes and WhatsApp API
// function calls are blocked across the entire app from this single point.
// AuthContext/demoMode arms this via setDemoActive() once the user is resolved.
let demoActive = false;
export const setDemoActive = (v) => { demoActive = v; };

const DEMO_MSG = 'Demo mode — this action is disabled.';

const BLOCKED_ENTITY_OPS = ['create', 'bulkCreate', 'update', 'updateMany', 'bulkUpdate', 'delete', 'deleteMany'];
const BLOCKED_FUNCTIONS = [
  'sendWhatsAppMessage',
  'createWhatsAppTemplate',
  'deleteWhatsAppTemplate',
  'syncWhatsAppTemplates',
  'createOrUpdateWAConfig',
  'toggleAIMode',
  'generateTemplateWithAI',
];

const entitiesProxy = new Proxy(client.entities, {
  get(target, name) {
    const entity = Reflect.get(target, name);
    if (!entity || typeof entity !== 'object') return entity;
    return new Proxy(entity, {
      get(ent, op) {
        if (demoActive && BLOCKED_ENTITY_OPS.includes(op)) {
          return () => Promise.reject(new Error(DEMO_MSG));
        }
        const value = Reflect.get(ent, op);
        return typeof value === 'function' ? value.bind(ent) : value;
      }
    });
  }
});

const functionsProxy = new Proxy(client.functions, {
  get(target, prop) {
    if (demoActive && prop === 'invoke') {
      const origInvoke = target.invoke.bind(target);
      return (name, payload) => {
        if (BLOCKED_FUNCTIONS.includes(name)) {
          console.warn(`Demo mode: blocked function invoke '${name}'`);
          return Promise.resolve({ data: { success: false, error: DEMO_MSG, demo_blocked: true } });
        }
        return origInvoke(name, payload);
      };
    }
    const value = Reflect.get(target, prop);
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

export const base44 = new Proxy(client, {
  get(target, prop) {
    if (prop === 'entities') return entitiesProxy;
    if (prop === 'functions') return functionsProxy;
    const value = Reflect.get(target, prop);
    return typeof value === 'function' ? value.bind(target) : value;
  }
});