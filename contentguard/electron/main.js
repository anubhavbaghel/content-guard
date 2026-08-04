const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const https = require('https')
const http = require('http')
const fs = require('fs')
const { crawlPage } = require('./crawler')

const isDev = process.argv.includes('--dev')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#05050f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,  // Allows preload to set window.electronAPI directly
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) {
      mainWindow.webContents.openDevTools()
      console.log('[Main] Window shown, isDev =', isDev)
      console.log('[Main] Preload path:', path.join(__dirname, 'preload.js'))
    }
  })

  return mainWindow
}

// ──────────────────────────────────────────────────────────
// App lifecycle
// ──────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ──────────────────────────────────────────────────────────
// Window Controls
// ──────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.restore()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// ──────────────────────────────────────────────────────────
// IPC: Fetch Google Doc as plain text
// ──────────────────────────────────────────────────────────
ipcMain.handle('fetch-doc', async (event, rawUrl) => {
  const docId = extractDocId(rawUrl)
  if (!docId) throw new Error('Invalid Google Docs URL. Make sure it looks like: https://docs.google.com/document/d/...')

  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`
  const text = await fetchWithRedirects(exportUrl)
  if (!text || text.trim().length === 0) {
    throw new Error('Could not read Google Doc. Make sure sharing is set to "Anyone with link can view".')
  }
  return text
})

// ──────────────────────────────────────────────────────────
// IPC: Discover all internal pages from root URL
// ──────────────────────────────────────────────────────────
ipcMain.handle('discover-pages', async (event, rootUrl) => {
  const data = await crawlPage(rootUrl)
  mainWindow?.webContents.send('crawl-progress', { url: rootUrl, label: 'Homepage', status: 'done' })
  return data
})

// ──────────────────────────────────────────────────────────
// IPC: Crawl a single page
// ──────────────────────────────────────────────────────────
ipcMain.handle('crawl-page', async (event, url, label) => {
  mainWindow?.webContents.send('crawl-progress', { url, label: label || url, status: 'crawling' })
  const data = await crawlPage(url)
  mainWindow?.webContents.send('crawl-progress', { url, label: label || url, status: 'done' })
  return data
})

// ──────────────────────────────────────────────────────────
// IPC: Export CSV
// ──────────────────────────────────────────────────────────
ipcMain.handle('export-csv', async (event, { data, filename }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || 'contentguard-report.csv',
    filters: [{ name: 'CSV File', extensions: ['csv'] }],
  })
  if (canceled || !filePath) return { success: false }
  fs.writeFileSync(filePath, data, 'utf8')
  shell.showItemInFolder(filePath)
  return { success: true, path: filePath }
})

// ──────────────────────────────────────────────────────────
// IPC: Export PDF
// ──────────────────────────────────────────────────────────
ipcMain.handle('export-pdf', async (event, { data, filename }) => {
  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || 'contentguard-report.pdf',
    filters: [{ name: 'PDF File', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { success: false }
  const buffer = Buffer.from(data, 'base64')
  fs.writeFileSync(filePath, buffer)
  shell.showItemInFolder(filePath)
  return { success: true, path: filePath }
})

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function extractDocId(url) {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

function fetchWithRedirects(url, redirectCount = 0) {
  if (redirectCount > 5) return Promise.reject(new Error('Too many redirects'))

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, { headers: { 'User-Agent': 'ContentGuard/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303 || res.statusCode === 307 || res.statusCode === 308) {
        const location = res.headers.location
        if (!location) return reject(new Error('Redirect with no location header'))
        // Handle relative redirects
        const nextUrl = location.startsWith('http') ? location : new URL(location, url).href
        return fetchWithRedirects(nextUrl, redirectCount + 1).then(resolve).catch(reject)
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`))
      }

      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })

    req.on('error', reject)
    req.setTimeout(20000, () => {
      req.destroy()
      reject(new Error('Request timed out after 20s'))
    })
  })
}
