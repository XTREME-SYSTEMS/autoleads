import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
let base44;
try {
  base44 = createClient({
    appId,
    token,
    functionsVersion,
    serverUrl: '',
    requiresAuth: false,
    appBaseUrl
  });
} catch (err) {
  console.error('Failed to create base44 client:', err);
  base44 = {
    auth: { me: async () => null, isAuthenticated: async () => false, logout: () => {}, redirectToLogin: () => {} },
    entities: new Proxy({}, { get: () => ({ list: async () => [], filter: async () => [], get: async () => null, create: async () => null, update: async () => null, delete: async () => null }) }),
    users: { inviteUser: async () => null },
    integrations: { Core: {} },
    analytics: { track: () => {} },
    functions: { invoke: async () => ({ data: {} }), fetch: async () => new Response() },
  };
}

export { base44 };