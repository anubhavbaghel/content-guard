/**
 * docFetcher.js — Fetch and parse a Google Doc via IPC
 */
import { parseDoc } from './docParser'

/**
 * Fetches the Google Doc plain text via Electron IPC,
 * then runs the parser. Returns structured page data.
 */
export async function fetchAndParseDoc(googleDocUrl) {
  if (!window.electronAPI) {
    throw new Error('Electron API not available. Are you running inside the app?')
  }

  const rawText = await window.electronAPI.fetchDoc(googleDocUrl)
  return parseDoc(rawText)
}
