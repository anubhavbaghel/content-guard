/**
 * crawler.js — Hidden BrowserWindow site crawler
 *
 * Uses Electron's own built-in Chromium (via hidden BrowserWindow)
 * to fully render JavaScript-heavy sites like Wix before extracting content.
 * No separate Playwright/Puppeteer install needed.
 */

const { BrowserWindow } = require('electron')

// How long to wait after page load for SPA JS to render (ms)
const SPA_RENDER_WAIT_MS = 5000

/**
 * Crawl a single URL and return structured page content.
 * @param {string} url
 * @returns {Promise<PageData>}
 */
async function crawlPage(url) {
  return new Promise((resolve, reject) => {
    let settled = false

    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 900,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        javascript: true,
        images: false,         // Skip images for speed
        webSecurity: false,
      },
    })

    const finish = (result) => {
      if (settled) return
      settled = true
      try { win.destroy() } catch {}
      resolve(result)
    }

    const fail = (err) => {
      if (settled) return
      settled = true
      try { win.destroy() } catch {}
      reject(err instanceof Error ? err : new Error(String(err)))
    }

    // Safety timeout — never hang more than 30s per page
    const safetyTimer = setTimeout(() => fail(new Error(`Timeout crawling ${url}`)), 30000)

    win.webContents.on('did-finish-load', () => {
      // Wait for SPA JavaScript to render the content
      setTimeout(async () => {
        clearTimeout(safetyTimer)
        try {
          const data = await win.webContents.executeJavaScript(`
            (function () {
              var sel = function(s) {
                return Array.from(document.querySelectorAll(s))
                  .map(function(e) { return (e.innerText || e.textContent || '').trim() })
                  .filter(function(s) { return s.length > 0 })
              }

              var internalLinks = Array.from(document.querySelectorAll('a[href]'))
                .map(function(a) {
                  return { text: (a.innerText || '').trim(), href: a.href }
                })
                .filter(function(l) {
                  try {
                    var u = new URL(l.href)
                    return u.hostname === location.hostname &&
                      !l.href.includes('#') &&
                      !l.href.match(/\\.(jpg|jpeg|png|gif|svg|pdf|css|js|ico|woff)$/i) &&
                      l.text.length > 0 &&
                      l.text.length < 200
                  } catch(e) { return false }
                })

              // Deduplicate by href
              var seen = {}
              internalLinks = internalLinks.filter(function(l) {
                if (seen[l.href]) return false
                seen[l.href] = true
                return true
              })

              return {
                url: location.href,
                title: document.title || '',
                metaDescription: (
                  document.querySelector('meta[name="description"]') ||
                  document.querySelector('meta[property="og:description"]')
                )?.content || '',
                h1s: sel('h1'),
                h2s: sel('h2'),
                h3s: sel('h3'),
                buttons: [].concat(
                  sel('button'),
                  sel('[role="button"]'),
                  Array.from(document.querySelectorAll('a'))
                    .map(function(a) { return (a.innerText || '').trim() })
                    .filter(function(t) { return t.length > 0 && t.length < 100 })
                ).filter(function(t, i, arr) {
                  return t.length > 0 && arr.indexOf(t) === i
                }),
                internalLinks: internalLinks,
                allText: (document.body.innerText || document.body.textContent || ''),
              }
            })()
          `)
          finish(data)
        } catch (err) {
          fail(err)
        }
      }, SPA_RENDER_WAIT_MS)
    })

    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      // -3 = ERR_ABORTED (normal for redirects), ignore it
      if (errorCode === -3) return
      clearTimeout(safetyTimer)
      fail(new Error(`Failed to load "${url}": ${errorDescription} (code ${errorCode})`))
    })

    win.loadURL(url).catch((err) => {
      clearTimeout(safetyTimer)
      fail(err)
    })
  })
}

module.exports = { crawlPage }
