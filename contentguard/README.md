# ContentGuard

ContentGuard is a premium desktop application built with Electron, React, and Vite. It simplifies Quality Assurance (QA) for content editors and web developers by automatically comparing copy defined in a **Google Doc** template against live content on a **Wix website**.

---

## 🌟 Key Features

*   **Google Doc Direct Export Parser**: Automatically fetches public Google Docs and parses structured page names, expected metadata, and text content blocks.
*   **Wix-Aware Background Crawler**: Uses a headless Electron renderer to execute dynamic JavaScript, bypassing Wix's client-side rendering engine (SPA) painted state limitations.
*   **Dynamic Page Matcher (Weighted Scoring)**: Intelligently associates document pages to website URLs based on slug matches, keyword intersection, and Title/H1 checks.
*   **Word-Level Normalization**: Normalizes whitespace, trailing newlines, carriage returns, and character casing to prevent false mismatch flags.
*   **Interactive Diff Viewer**: Highlights differences between document copy and live web content side-by-side.
*   **Light Theme Document UI**: Open, flat, document-like reporting interface styled with modern typography and sleek accents.
*   **One-Click Reports**: Exports QA results to high-contrast PDF or raw CSV formats.
*   **Automated Release Pipeline**: Custom build scripts that auto-increment app version numbers and backup older builds into zip archives.

---

## 🛠 Under the Hood: Technical Architecture

### 1. Google Docs Export Parser
Public Google Docs are loaded using Google's direct text exporter endpoint (`/export?format=txt`).
*   **Redirect Follower:** Because Google Docs exporter returns temporary HTTP redirects (`307` and `308` redirect codes), the download module in `electron/main.js` follows redirect headers recursively to prevent empty file loads.
*   **Parser Rules:** Reads the document line by line, extracting pages using brackets (e.g. `[Page Name]`), global metadata variables (e.g. `[Global: Site Title]`), and key-value fields.

```
[Page Name]
Title: Expected Title
Description: Expected Meta Description
---
Body Heading: Expected header copy
Body Text: Expected main paragraphs
Button: Call to Action
```

---

### 2. Wix SPA Crawler (`electron/crawler.js`)
Simple HTTP DOM scrapers fail on Wix websites because Wix loads content dynamically using client-side React bundles.
*   **Hidden Electron BrowserWindow:** ContentGuard spawns a background browser process to fully load the website and allow JavaScript to execute.
*   **Render Settle Delay:** Sleeps for `5000ms` after DOM load to allow dynamic Wix widgets to finish painting.
*   **Client Script Injection:** Injects client-side scripts to extract:
    *   Metadata (`document.title`, description tag)
    *   H1/H2 header hierarchies
    *   All visible text blocks (with filtering for scripts, headers, styles, and footer boilerplate)
    *   Buttons and link anchor labels

---

### 3. Dynamic Page Matcher (`src/services/matcher.js`)
Matches each document page to the correct website URL dynamically using a weighted scoring model. This prevents generic URL keyword bugs (e.g., matching a "Used Bikes" page to a "Used Cars" URL).

| Match Metric | Description | Score Points |
| :--- | :--- | :--- |
| **Exact Slug Match** | The URL path matches the slugified page name exactly (e.g. `/used-bikes` matches `Used Bikes`). | **+80** |
| **Nested Slug Match** | The URL path contains the slugified page name (e.g. `/pages/used-bikes`). | **+50** |
| **Full Keyword Intersection** | Every non-stop word of the page name is in the URL path (e.g. matches both `used` and `bikes`). | **+40** |
| **Partial Keyword Match** | Some of the non-stop words are in the URL path. | **+15 / keyword** |
| **Title / H1 Match** | Non-stop words appear in the `<title>` or the first `<h1>` tags of the web page. | **up to +30** |

*Matches below a minimum safety threshold of `15 points` are discarded, flagging the page as "Not Found on Website".*

---

### 4. Text Normalizer (`src/services/matcher.js`)
To avoid false positives from formatting variations, all text elements undergo normalization before comparison:
*   Carriage returns (`\r`) and line breaks (`\n`) are stripped.
*   Double spaces are compressed to single spaces.
*   Capitalization casing is normalized to lowercase.
*   Trailing and leading whitespace is trimmed.

---

## 🚀 Running locally

### Prerequisites
*   Node.js (v18 or higher)
*   npm

### 1. Installation
Clone the repository and install the dependencies:
```bash
git clone https://github.com/anubhavbaghel/content-guard.git
cd content-guard/contentguard
npm install
```

### 2. Development Mode
Start the application in local development hot-reload mode:
```bash
npm run dev
```

### 3. Production Packaging
To build, version, and package the standalone executables:
```bash
npm run dist
```
This triggers the custom build pipeline (`scripts/build-pipeline.js`) which:
1. Detects the current version in `package.json`.
2. Archives existing binaries in `release/` to `release/backups/v[X.Y.Z]/`.
3. Bumps the patch version in `package.json`.
4. Runs `vite build` and `electron-builder` to generate installer and portable builds.

---

## 📂 Project Structure

```text
├── electron/
│   ├── main.js        # Main Electron process, handles redirects & IPC communication
│   ├── preload.js     # Exposes safe IPC bridge functions to React
│   └── crawler.js     # Electron BrowserWindow background scraper
├── scripts/
│   └── build-pipeline.js  # Automated packaging & backup management script
├── src/
│   ├── components/    # React views (Dashboard, DiffViewer, PageCard)
│   ├── services/
│   │   ├── docParser.js  # Regex parser for Google Doc structure
│   │   ├── matcher.js    # Weighted mapping and check run engines
│   │   └── exporter.js   # PDF and CSV generator
│   ├── index.css      # Core light-theme layout & components styling
│   └── main.jsx       # Vite app entry point
└── package.json       # Dependencies, configurations, and build tasks
```

---

## 📄 License
This project is licensed under the MIT License.
