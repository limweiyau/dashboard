// Polyfill for Node.js globals in browser/renderer environment
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = { env: {} };
}

if (typeof Buffer === 'undefined') {
  window.Buffer = window.Buffer || {};
}

// Polyfill require for Electron renderer (window.require is available in Electron)
if (typeof require === 'undefined' && typeof window !== 'undefined' && window.require) {
  window.require = window.require;
}
