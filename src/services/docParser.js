/**
 * docParser.js — Rules-based Google Doc content parser
 *
 * Parses the plain-text export of the content brief document into
 * a structured object containing global fields and per-page content.
 *
 * Document structure (Allure Decor format):
 *   - Global: Company Name, [Tel], [Email], Social Media links
 *   - Pages separated by: "Page Name (Page N)" or "Home"
 *   - Per-page fields: Page/Meta Title, Meta Description, H1,
 *     Hero Tagline, Hero Button, Body paragraphs, Bullets,
 *     [Buttons], FAQs, Testimonials, CTA block
 */

// Lines to always skip during parsing
const SKIP_PATTERNS = [
  /^Note for the Designer/i,
  /^Note for the QA/i,
  /^Notes for the Designer/i,
  /^Notes for the QA/i,
  /^QA Feedback/i,
  /^Text\s*>\s*page/i,
  /^Get Assistance\s*$/i,
]

const shouldSkip = (line) => {
  if (!line || line.trim() === '') return true
  const l = line.trim()
  return SKIP_PATTERNS.some((p) => p.test(l))
}

// Known section label lines — should not be treated as body text
const LABEL_LINES = new Set([
  'Page/Meta Title', 'Page Title', 'Meta Description',
  'H1 (Hero image text)', 'FAQs', 'Testimonials', 'CTA',
  'Social Media', 'SITE MAP:', 'SITE MAP',
])

const isLabelLine = (line) =>
  LABEL_LINES.has(line) ||
  line.match(/^\[Tel\]/) ||
  line.match(/^\[Email\]/) ||
  line.match(/^Company Name/) ||
  line.match(/^(Luxury Residential|Commercial|Heritage|High-End|Gallery|Contact)\s*Decorating?\s*\(Page/)

/**
 * Main entry point — parse raw plain-text doc into structured data.
 * @param {string} rawText
 */
export function parseDoc(rawText) {
  // Normalize: strip \r, collapse tab-indentation, clean up BOM
  const lines = rawText
    .replace(/\uFEFF/g, '')          // strip BOM
    .split('\n')
    .map((l) => l.replace(/\r/g, '').replace(/\t/g, ' ').trim())

  const global = extractGlobalFields(lines)
  const pages = extractPages(lines)

  return { global, pages }
}

// ──────────────────────────────────────────────────────────
// Global fields
// ──────────────────────────────────────────────────────────
function extractGlobalFields(lines) {
  const g = { companyName: '', phone: '', email: '', facebook: '' }

  for (const line of lines) {
    if (line.startsWith('Company Name -')) {
      g.companyName = line.replace('Company Name -', '').trim()
    } else if (line.startsWith('[Tel]')) {
      g.phone = line.replace('[Tel]', '').trim()
    } else if (line.startsWith('[Email]')) {
      g.email = line.replace('[Email]', '').trim()
    } else if (line.startsWith('Facebook:')) {
      g.facebook = line.replace('Facebook:', '').trim()
    }
  }

  return g
}

// ──────────────────────────────────────────────────────────
// Page splitting
// ──────────────────────────────────────────────────────────
function extractPages(lines) {
  const pageStarts = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Pattern: "Something (Page N)"
    const match = line.match(/^(.+?)\s*\(Page\s*(\d+)\)\s*$/)
    if (match) {
      pageStarts.push({ index: i, name: match[1].trim(), number: parseInt(match[2]) })
      continue
    }

    // "Home" as first page — confirm by looking ahead for Page/Meta Title
    if (line === 'Home' && pageStarts.length === 0) {
      const nextLines = lines.slice(i + 1, i + 6).join(' ')
      if (/Page.?Meta Title|Page Title/i.test(nextLines)) {
        pageStarts.push({ index: i, name: 'Home', number: 1 })
      }
    }
  }

  return pageStarts.map((start, idx) => {
    const endIdx = idx < pageStarts.length - 1 ? pageStarts[idx + 1].index : lines.length
    return parsePageContent(start.name, start.number, lines.slice(start.index + 1, endIdx))
  })
}

// ──────────────────────────────────────────────────────────
// Per-page content parsing
// ──────────────────────────────────────────────────────────
function parsePageContent(name, number, lines) {
  const page = {
    name,
    number,
    seoTitle: '',
    metaDescription: '',
    h1: '',
    heroTagline: '',
    heroButton: '',
    bodyParagraphs: [],
    bulletPoints: [],
    pageButtons: [],
    faqs: [],
    testimonials: [],
    cta: { title: '', body: '', button: '' },
  }

  let mode = 'general'
  let lastFaqIdx = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (shouldSkip(line)) continue

    // ── Mode triggers ────────────────────────────────────

    if (line === 'Page/Meta Title' || line === 'Page Title') { mode = 'seoTitle'; continue }
    if (line === 'Meta Description')                          { mode = 'metaDesc'; continue }
    if (line === 'H1 (Hero image text)')                      { mode = 'h1'; continue }
    if (line === 'FAQs')                                       { mode = 'faq'; continue }
    if (line === 'Testimonials')                               { mode = 'testimonials'; continue }
    if (line === 'CTA')                                        { mode = 'cta'; continue }

    // Hero button (anywhere in the page)
    if (/^Hero image button:/i.test(line)) {
      const m = line.match(/Hero image button:\s*(.+?)(?:\s*>|$)/i)
      if (m) page.heroButton = m[1].trim()
      continue
    }

    // ── Mode-specific value capture ──────────────────────

    if (mode === 'seoTitle') {
      page.seoTitle = line
      mode = 'general'
      continue
    }

    if (mode === 'metaDesc') {
      page.metaDescription = line
      mode = 'general'
      continue
    }

    if (mode === 'h1') {
      page.h1 = line
      mode = 'afterH1'
      continue
    }

    if (mode === 'afterH1') {
      // First non-empty, non-label line after H1 = hero tagline
      page.heroTagline = line
      mode = 'general'
      continue
    }

    if (mode === 'faq') {
      if (line.endsWith('?')) {
        page.faqs.push({ question: line, answer: '' })
        lastFaqIdx = page.faqs.length - 1
      } else if (lastFaqIdx >= 0 && !page.faqs[lastFaqIdx].answer && line.length > 10) {
        page.faqs[lastFaqIdx].answer = line
        lastFaqIdx = -1
      }
      continue
    }

    if (mode === 'testimonials') {
      if (line.startsWith('*')) {
        const nm = line.replace(/^\*\s*/, '').trim()
        if (page.testimonials.length > 0) {
          page.testimonials[page.testimonials.length - 1].name = nm
        }
      } else if (line.length > 10) {
        page.testimonials.push({ quote: line, name: '' })
      }
      continue
    }

    if (mode === 'cta') {
      if (/^Title:/i.test(line)) {
        page.cta.title = line.replace(/^Title:\s*/i, '').trim()
      } else if (/^Text:/i.test(line)) {
        page.cta.body = line.replace(/^Text:\s*/i, '').trim()
      } else if (/^Button:/i.test(line)) {
        const m = line.match(/Button:\s*(.+?)(?:\s*>|$)/i)
        if (m) page.cta.button = m[1].trim()
      }
      continue
    }

    // ── General mode ─────────────────────────────────────

    // [Text] > Button  →  CTA / page button
    const btnMatch = line.match(/^\[(.+?)\]\s*>\s*Button\s*$/i)
    if (btnMatch) {
      page.pageButtons.push(btnMatch[1].trim())
      continue
    }

    // [Text] > Relevant Service Page / Link to  →  skip (just internal links)
    if (/^\[.+?\]\s*>/i.test(line)) continue

    // Bullet points (* or •)
    if (/^[*•]\s/.test(line) || /^\*\s*\w/.test(line)) {
      const bullet = line.replace(/^[*•]\s*/, '').trim()
      if (bullet) page.bulletPoints.push(bullet)
      continue
    }

    // Skip known label lines
    if (isLabelLine(line)) continue

    // Body paragraph — substantial text, not a label
    if (mode === 'general' && line.length > 40) {
      page.bodyParagraphs.push(line)
    }
  }

  return page
}
