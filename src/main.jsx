import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  )
} catch (err) {
  document.getElementById('root').innerHTML = `
    <div style="padding:40px;font-family:sans-serif;color:#111">
      <h1 style="color:red;font-size:24px">App failed to start</h1>
      <pre style="background:#f5f5f5;padding:16px;border-radius:8px;overflow:auto;font-size:13px">${String(err && err.stack || err)}</pre>
    </div>`
}