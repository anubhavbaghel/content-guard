/**
 * matcher.js — Content comparison engine
 *
 * Maps each doc page to the best-matching crawled web page,
 * then runs field-by-field checks and returns a results object.
 */

// ──────────────────────────────────────────────────────────
// URL keyword map for doc page → web page matching
// ──────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────
// URL → Page matching (Dynamic Scoring System)
// ──────────────────────────────────────────────────────────
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '')             // Trim - from end
}

function getMatchScore(docPage, webPage, siteUrl) {
  const nameLower = docPage.name.toLowerCase()
  const urlLower = webPage.url.toLowerCase()

  // Get the URL path part (e.g. "used-bikes" from "https://site.com/used-bikes")
  const rootNorm = siteUrl.replace(/\/$/, '')
  const pathPart = urlLower.replace(rootNorm, '').replace(/^\//, '').replace(/\/$/, '')

  // 1. Root URL match for Home page
  if (nameLower === 'home' || nameLower === 'welcome') {
    return pathPart === '' || pathPart === 'home' || pathPart === 'welcome' ? 100 : 0
  }

  // Do not match sub-pages to the root/homepage URL
  if (pathPart === '' || pathPart === 'home') {
    return 0
  }

  let score = 0

  // 2. Exact slug match in URL path (highest priority)
  const docSlug = slugify(docPage.name)
  if (docSlug && pathPart === docSlug) {
    score += 80
  } else if (docSlug && pathPart.includes(docSlug)) {
    score += 50
  }

  // 3. Keyword intersection in URL (excluding stop words)
  const stopWords = new Set(['and', 'or', 'the', 'me', 'to', 'for', 'at', 'in', 'of', 'with', 'by', 'a', 'an', '&'])
  const docKeywords = nameLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))

  if (docKeywords.length > 0) {
    let kwMatches = 0
    for (const kw of docKeywords) {
      if (pathPart.includes(kw)) {
        kwMatches++
      }
    }
    // If all keywords exist in the URL path, give a high bonus
    if (kwMatches === docKeywords.length) {
      score += 40
    } else {
      score += kwMatches * 15
    }
  }

  // 4. Title / H1 fuzzy matching
  const cleanTitle = (webPage.title || '').toLowerCase()
  const cleanH1 = (webPage.h1s?.[0] || '').toLowerCase()

  if (docKeywords.length > 0) {
    let titleMatches = 0
    let h1Matches = 0
    for (const kw of docKeywords) {
      if (cleanTitle.includes(kw)) titleMatches++
      if (cleanH1.includes(kw)) h1Matches++
    }
    score += (titleMatches / docKeywords.length) * 15
    score += (h1Matches / docKeywords.length) * 15
  }

  return score
}

function findMatchingWebPage(docPage, webPages, siteUrl) {
  let bestPage = null
  let bestScore = -1

  for (const wp of webPages) {
    const score = getMatchScore(docPage, wp, siteUrl)
    if (score > bestScore) {
      bestScore = score
      bestPage = wp
    }
  }

  // Safety threshold: if no page scored at least 15 points, don't match
  return bestScore >= 15 ? bestPage : null
}

export function matchAllPages(docData, webPages, siteUrl) {
  const pageResults = []
  let totalChecks = 0, passedChecks = 0, failedChecks = 0

  for (const docPage of docData.pages) {
    const webPage = findMatchingWebPage(docPage, webPages, siteUrl)
    const checks = webPage
      ? runPageChecks(docPage, webPage, docData.global)
      : [makeCheck('Page Found on Website', docPage.name, false,
          'No matching page found', 'Could not find a page on the site matching this doc page')]

    totalChecks += checks.length
    passedChecks += checks.filter((c) => c.pass).length
    failedChecks += checks.filter((c) => !c.pass).length

    pageResults.push({
      docPage,
      webPage,
      checks,
      pass: checks.every((c) => c.pass),
      passCount: checks.filter((c) => c.pass).length,
      failCount: checks.filter((c) => !c.pass).length,
    })
  }

  return {
    pageResults,
    summary: {
      totalChecks,
      passedChecks,
      failedChecks,
      totalPages: docData.pages.length,
      matchedPages: pageResults.filter((r) => r.webPage).length,
    },
  }
}

// ──────────────────────────────────────────────────────────
// Helper to normalize all whitespace (newlines, multiple spaces) for robust matching
// ──────────────────────────────────────────────────────────
function normalizeText(str) {
  if (!str) return ''
  return str.replace(/\s+/g, ' ').trim().toLowerCase()
}

// ──────────────────────────────────────────────────────────
// Per-page checks
// ──────────────────────────────────────────────────────────
function runPageChecks(docPage, webPage, globalData) {
  const checks = []

  const cleanAllText = normalizeText(webPage.allText)
  const cleanTitle = normalizeText(webPage.title)
  const cleanMetaDesc = normalizeText(webPage.metaDescription)
  const cleanH1s = (webPage.h1s || []).map(normalizeText)
  const cleanButtons = (webPage.buttons || []).map(normalizeText)

  // Helper: does page text contain this string?
  const inText = (str) => {
    if (!str || !cleanAllText) return false
    return cleanAllText.includes(normalizeText(str))
  }

  // Helper: does any button/link contain this text?
  const hasButton = (str) => {
    if (!str) return false
    const cleanStr = normalizeText(str)
    return cleanButtons.some((b) => b.includes(cleanStr)) || cleanAllText.includes(cleanStr)
  }

  // ── 1. SEO Title ──────────────────────────────────────
  if (docPage.seoTitle) {
    checks.push(makeCheck(
      'SEO Page Title',
      docPage.seoTitle,
      cleanTitle === normalizeText(docPage.seoTitle),
      webPage.title,
      `Expected <title> tag: "${docPage.seoTitle}"`
    ))
  }

  // ── 2. Meta Description ───────────────────────────────
  if (docPage.metaDescription) {
    checks.push(makeCheck(
      'Meta Description',
      docPage.metaDescription,
      cleanMetaDesc === normalizeText(docPage.metaDescription),
      webPage.metaDescription,
      `Expected <meta name="description">: "${docPage.metaDescription}"`
    ))
  }

  // ── 3. H1 ─────────────────────────────────────────────
  if (docPage.h1) {
    const actualH1 = webPage.h1s?.[0] || ''
    checks.push(makeCheck(
      'H1 Heading',
      docPage.h1,
      cleanH1s.includes(normalizeText(docPage.h1)),
      actualH1,
      `Expected <h1>: "${docPage.h1}"`
    ))
  }

  // ── 4. Hero Tagline ───────────────────────────────────
  if (docPage.heroTagline) {
    checks.push(makeCheck(
      'Hero Tagline',
      docPage.heroTagline,
      inText(docPage.heroTagline),
      '',
      'Tagline text should appear near the hero section'
    ))
  }

  // ── 5. Hero Button ────────────────────────────────────
  if (docPage.heroButton) {
    checks.push(makeCheck(
      'Hero Button Text',
      docPage.heroButton,
      hasButton(docPage.heroButton),
      '',
      `Button with text "${docPage.heroButton}" should be in the hero`
    ))
  }

  // ── 6. Body Paragraphs (first 5) ─────────────────────
  const parasToCheck = docPage.bodyParagraphs?.slice(0, 5) || []
  parasToCheck.forEach((para, i) => {
    const snippet = para.length > 80 ? para.substring(0, 80) + '…' : para
    checks.push(makeCheck(
      `Body Text ${i + 1}`,
      snippet,
      inText(para),
      '',
      'Paragraph content should appear on the page'
    ))
  })

  // ── 7. Bullet Points ──────────────────────────────────
  docPage.bulletPoints?.forEach((bullet) => {
    checks.push(makeCheck(
      `Bullet: "${bullet}"`,
      bullet,
      inText(bullet),
      '',
      'List item should appear on the page'
    ))
  })

  // ── 8. Page Buttons ───────────────────────────────────
  docPage.pageButtons?.forEach((btn) => {
    checks.push(makeCheck(
      `Button: "${btn}"`,
      btn,
      hasButton(btn),
      '',
      `A button or link with text "${btn}" should be on the page`
    ))
  })

  // ── 9-10. FAQ Questions + Answers ────────────────────
  docPage.faqs?.forEach((faq, i) => {
    checks.push(makeCheck(
      `FAQ ${i + 1}: Question`,
      faq.question,
      inText(faq.question),
      '',
      'FAQ question should appear in the accordion'
    ))
    if (faq.answer) {
      checks.push(makeCheck(
        `FAQ ${i + 1}: Answer`,
        faq.answer.length > 70 ? faq.answer.substring(0, 70) + '…' : faq.answer,
        inText(faq.answer),
        '',
        'FAQ answer text should appear on the page'
      ))
    }
  })

  // ── 11-12. Testimonials ───────────────────────────────
  docPage.testimonials?.forEach((t, i) => {
    if (t.quote) {
      checks.push(makeCheck(
        `Testimonial ${i + 1}`,
        t.quote.length > 70 ? t.quote.substring(0, 70) + '…' : t.quote,
        inText(t.quote),
        '',
        'Testimonial quote should appear on the page'
      ))
    }
  })

  // ── 13. CTA Title ─────────────────────────────────────
  if (docPage.cta?.title) {
    checks.push(makeCheck(
      'CTA Section Title',
      docPage.cta.title,
      inText(docPage.cta.title),
      '',
      'CTA heading should appear in the call-to-action section'
    ))
  }

  // ── 14. CTA Body ──────────────────────────────────────
  if (docPage.cta?.body) {
    const ctaSnippet = docPage.cta.body.length > 70
      ? docPage.cta.body.substring(0, 70) + '…'
      : docPage.cta.body
    checks.push(makeCheck(
      'CTA Body Text',
      ctaSnippet,
      inText(docPage.cta.body),
      '',
      'CTA paragraph text should appear on the page'
    ))
  }

  // ── 15. CTA Button ────────────────────────────────────
  if (docPage.cta?.button) {
    checks.push(makeCheck(
      'CTA Button Text',
      docPage.cta.button,
      hasButton(docPage.cta.button),
      '',
      `CTA button with text "${docPage.cta.button}" should be present`
    ))
  }

  return checks
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────
function makeCheck(field, expected, pass, actual = '', hint = '') {
  return { field, expected, actual, pass, hint }
}
