const isNode = typeof window === 'undefined';
const memoryStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const storage = isNode ? memoryStorage : window.localStorage;
const env = (/** @type {any} */ (import.meta)).env || {};

const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase();

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) return defaultValue;
  const storageKey = `base44_${toSnakeCase(paramName)}`;
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get(paramName);
  if (removeFromUrl) {
    urlParams.delete(paramName);
    const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
    window.history.replaceState({}, document.title, newUrl);
  }
  if (searchParam) { storage.setItem(storageKey, searchParam); return searchParam; }
  if (defaultValue) { storage.setItem(storageKey, defaultValue); return defaultValue; }
  return storage.getItem(storageKey);
};

const resolveAppIdFromDom = () => {
  if (isNode) return undefined;
  try {
    const favicon = document.querySelector("link[rel='icon']")?.href || "";
    const match = favicon.match(/\/images\/public\/([a-f0-9]{20,})\//);
    if (match) return match[1];
  } catch {}
  return undefined;
};

const getAppParams = () => {
  if (getAppParamValue('clear_access_token') === 'true') {
    storage.removeItem('base44_access_token');
    storage.removeItem('token');
  }
  const appId = getAppParamValue('app_id', { defaultValue: env.VITE_BASE44_APP_ID }) || resolveAppIdFromDom();
  if (appId) storage.setItem('base44_app_id', appId);
  return {
    appId,
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', { defaultValue: isNode ? '' : window.location.href }),
    functionsVersion: getAppParamValue('functions_version', { defaultValue: env.VITE_BASE44_FUNCTIONS_VERSION }),
    appBaseUrl: getAppParamValue('app_base_url', { defaultValue: env.VITE_BASE44_APP_BASE_URL }),
  };
};

export const appParams = { ...getAppParams() };