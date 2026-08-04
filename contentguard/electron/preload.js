/**
 * preload.js
 * Runs in Node.js context before the page loads.
 * With contextIsolation: false, we can assign directly to window.
 */
const { ipcRenderer } = require('electron')

window.electronAPI = {
  // ── Window controls ────────────────────────────────────
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow:    () => ipcRenderer.send('window-close'),

  // ── Core QA functions ──────────────────────────────────
  fetchDoc:      (url)         => ipcRenderer.invoke('fetch-doc', url),
  discoverPages: (rootUrl)     => ipcRenderer.invoke('discover-pages', rootUrl),
  crawlPage:     (url, label)  => ipcRenderer.invoke('crawl-page', url, label),

  // ── Export ─────────────────────────────────────────────
  exportCSV: (payload) => ipcRenderer.invoke('export-csv', payload),
  exportPDF: (payload) => ipcRenderer.invoke('export-pdf', payload),

  // ── Real-time progress events ──────────────────────────
  onCrawlProgress: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('crawl-progress', handler)
    return () => ipcRenderer.removeListener('crawl-progress', handler)
  },
}

console.log('[ContentGuard] Preload loaded — window.electronAPI is ready')
