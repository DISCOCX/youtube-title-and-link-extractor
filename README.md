# YouTube Video List Exporter

Userscript that extracts every video title and link from any YouTube page. Scrape videos, Shorts, or both. Auto-scrolls to load all content, deduplicates results, and exports to clipboard, JSON, or .txt file.

Works on channels, playlists, search results, and the home feed.

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) in your browser
2. Click [here](youtube-title-scraper.user.js) to install the script
3. Go to any YouTube page and click the Violentmonkey icon in your toolbar

## Usage

Open the Violentmonkey menu on any YouTube page. You get 6 commands:

| Command | What it does |
|---|---|
| 🎬 Scrape Videos (current view) | Grabs loaded video titles + links |
| ⚡ Scrape Shorts (current view) | Grabs loaded Shorts titles + links |
| 📋 Scrape All (current view) | Grabs both |
| 🎬 Scrape ALL Videos (auto-scroll) | Scrolls the full page, then grabs videos |
| ⚡ Scrape ALL Shorts (auto-scroll) | Scrolls the full page, then grabs Shorts |
| 📋 Scrape EVERYTHING (auto-scroll) | Scrolls the full page, then grabs everything |

A panel pops up with your results. From there you can:

- **Title + Link** — copy pairs to clipboard
- **Titles Only** — copy just the titles
- **Download .txt** — save as a text file
- **JSON** — copy as structured JSON
