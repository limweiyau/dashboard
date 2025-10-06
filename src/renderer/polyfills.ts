// Provide minimal globals for browser environment when Node integration is disabled.
const globalObj = typeof globalThis !== 'undefined' ? globalThis : window;

if (typeof (globalObj as any).global === 'undefined') {
  (globalObj as any).global = globalObj;
}

if (typeof (globalObj as any).process === 'undefined') {
  (globalObj as any).process = { env: {} };
}
