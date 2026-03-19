// ==UserScript==
// @name        YouTube Title/Link Scraper
// @namespace   Violentmonkey Scripts
// @match       https://www.youtube.com/*
// @icon        https://www.youtube.com/s/desktop/c376667c/img/favicon_32x32.png
// @match        https://youtube.com/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// @version     1.0
// @author      DISCO
// @description contact me on discord if you have questions discovx
// ==/UserScript==


(function () {
  'use strict';

  const BASE = 'https://www.youtube.com';

  function fullURL(href) {
    if (!href) return '';
    if (href.startsWith('http')) return href;
    return BASE + href;
  }

  // ── Scrape regular videos ──
  function scrapeVideos() {
    const seen = new Set();
    const results = [];

    document.querySelectorAll([
      'a#video-title',
      'a#video-title-link',
      'h3 a.yt-simple-endpoint',
      'ytd-playlist-video-renderer #video-title',
    ].join(', ')).forEach((el) => {
      const anchor = el.closest('a[href]') || el;
      const href = anchor.getAttribute('href') || '';

      if (!href.includes('/watch')) return;
      if (href.includes('/shorts/')) return;

      const url = fullURL(href);
      if (seen.has(url)) return;

      const title = el.getAttribute('title')
        || el.innerText?.trim()
        || el.textContent?.trim()
        || '';

      if (!title || title.length < 3) return;
      seen.add(url);
      results.push({ title, url, type: 'video' });
    });

    return results;
  }

  // ── Scrape Shorts ──
  function scrapeShorts() {
    const seen = new Set();
    const results = [];

    // Shorts use <a> with href containing /shorts/
    // Title is usually in an <h3>, a span, or the element's title/aria-label attribute
    document.querySelectorAll('a[href*="/shorts/"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      if (!href.includes('/shorts/')) return;

      const url = fullURL(href);
      if (seen.has(url)) return;

      // Try multiple ways to get the Short's title
      let title = '';

      // 1. title or aria-label on the anchor
      title = a.getAttribute('title') || a.getAttribute('aria-label') || '';

      // 2. Look for heading or title element inside
      if (!title) {
        const heading = a.querySelector('h3, [id="video-title"], .shortsLockupViewModelHostOutsideMetadataTitle, span#video-title, .yt-core-attributed-string');
        if (heading) {
          title = heading.getAttribute('title') || heading.innerText?.trim() || heading.textContent?.trim() || '';
        }
      }

      // 3. Check parent renderer for title
      if (!title) {
        const renderer = a.closest('ytd-rich-item-renderer, ytd-reel-item-renderer, ytd-grid-video-renderer, ytd-video-renderer');
        if (renderer) {
          const titleEl = renderer.querySelector('h3, #video-title, [aria-label]');
          if (titleEl) {
            title = titleEl.getAttribute('title') || titleEl.getAttribute('aria-label') || titleEl.innerText?.trim() || '';
          }
        }
      }

      // 4. Sibling text — sometimes title is next to the link
      if (!title) {
        const parent = a.parentElement;
        if (parent) {
          const sibling = parent.querySelector('h3, span[id="video-title"], .shortsLockupViewModelHostOutsideMetadataTitle');
          if (sibling) {
            title = sibling.innerText?.trim() || '';
          }
        }
      }

      title = title.replace(/\s+/g, ' ').trim();
      if (!title || title.length < 2) return;

      // Filter out generic labels YouTube adds
      if (/^(Shorts|shorts|play short)$/i.test(title)) return;

      seen.add(url);
      results.push({ title, url, type: 'short' });
    });

    return results;
  }

  // ── Combined scraper ──
  function scrapeAll() {
    const videos = scrapeVideos();
    const shorts = scrapeShorts();

    // Deduplicate by URL
    const seen = new Set(videos.map((v) => v.url));
    const combined = [...videos];
    for (const s of shorts) {
      if (!seen.has(s.url)) {
        seen.add(s.url);
        combined.push(s);
      }
    }
    return combined;
  }

  // ── Auto-scroll ──
  async function autoScrollAndScrape(scrapeFn, maxScrolls = 50, delayMs = 1500) {
    let previousHeight = 0;
    let noChangeCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, delayMs));

      const currentHeight = document.documentElement.scrollHeight;
      if (currentHeight === previousHeight) {
        noChangeCount++;
        if (noChangeCount >= 3) break;
      } else {
        noChangeCount = 0;
      }
      previousHeight = currentHeight;
    }

    return scrapeFn();
  }

  // ── UI Panel ──
  function showPanel(results, label) {
    document.getElementById('yt-scraper-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'yt-scraper-panel';
    Object.assign(panel.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: '999999',
      background: '#1e1e1e',
      color: '#e0e0e0',
      borderRadius: '12px',
      padding: '20px',
      width: '620px',
      maxHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
    });

    const titleEl = document.createElement('span');
    titleEl.textContent = `📋 ${results.length} ${label} scraped`;
    titleEl.style.fontWeight = '600';
    titleEl.style.fontSize = '15px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: '#aaa',
      fontSize: '18px',
      cursor: 'pointer',
    });
    closeBtn.onclick = () => panel.remove();
    header.append(titleEl, closeBtn);

    // List area
    const listArea = document.createElement('div');
    Object.assign(listArea.style, {
      overflowY: 'auto',
      flex: '1',
      marginBottom: '12px',
      padding: '10px',
      background: '#141414',
      borderRadius: '8px',
      lineHeight: '1.8',
      fontSize: '13px',
      userSelect: 'text',
    });

    results.forEach((r, i) => {
      const row = document.createElement('div');
      row.style.marginBottom = '6px';

      const num = document.createElement('span');
      num.textContent = `${i + 1}. `;
      num.style.color = '#888';

      const badge = document.createElement('span');
      if (r.type === 'short') {
        badge.textContent = '⚡ ';
        badge.title = 'Short';
      }

      const titleSpan = document.createElement('span');
      titleSpan.textContent = r.title;

      const linkEl = document.createElement('a');
      linkEl.href = r.url;
      linkEl.target = '_blank';
      linkEl.textContent = ' 🔗';
      linkEl.title = r.url;
      Object.assign(linkEl.style, {
        color: '#5e9eff',
        textDecoration: 'none',
        fontSize: '12px',
      });

      row.append(num, badge, titleSpan, linkEl);
      listArea.appendChild(row);
    });

    // Buttons
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '8px' });

    function makeBtn(text, onClick) {
      const btn = document.createElement('button');
      btn.textContent = text;
      Object.assign(btn.style, {
        flex: '1',
        padding: '8px 0',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '13px',
        background: '#333',
        color: '#fff',
        transition: 'background 0.15s',
      });
      btn.onmouseenter = () => (btn.style.background = '#444');
      btn.onmouseleave = () => (btn.style.background = '#333');
      btn.onclick = onClick;
      return btn;
    }

    const flash = (msg) => {
      titleEl.textContent = msg;
      setTimeout(() => (titleEl.textContent = `📋 ${results.length} ${label} scraped`), 2000);
    };

    btnRow.append(
      makeBtn('📋 Title + Link', () => {
        const text = results.map((r) => `${r.title}\n${r.url}`).join('\n\n');
        GM_setClipboard(text, 'text');
        flash('✅ Copied titles + links!');
      }),
      makeBtn('📋 Titles Only', () => {
        const text = results.map((r) => r.title).join('\n');
        GM_setClipboard(text, 'text');
        flash('✅ Copied titles!');
      }),
      makeBtn('💾 Download .txt', () => {
        const text = results.map((r) => `${r.title}\n${r.url}`).join('\n\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `yt-${label.replace(/\s+/g, '-')}-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }),
      makeBtn('📋 JSON', () => {
        GM_setClipboard(JSON.stringify(results, null, 2), 'text');
        flash('✅ JSON copied!');
      })
    );

    panel.append(header, listArea, btnRow);
    document.body.appendChild(panel);
  }

  // ── Loading indicator ──
  function showLoading() {
    document.getElementById('yt-scraper-loading')?.remove();
    const el = document.createElement('div');
    el.id = 'yt-scraper-loading';
    Object.assign(el.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '999999',
      background: '#1e1e1e',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '8px',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    });
    el.textContent = '⏳ Scrolling & scraping…';
    document.body.appendChild(el);
    return el;
  }

  function run(scrapeFn, label) {
    const results = scrapeFn();
    if (results.length === 0) {
      alert(`No ${label} found on this page.`);
      return;
    }
    showPanel(results, label);
  }

  async function runScroll(scrapeFn, label) {
    const loader = showLoading();
    const results = await autoScrollAndScrape(scrapeFn);
    loader.remove();
    if (results.length === 0) {
      alert(`No ${label} found.`);
      return;
    }
    showPanel(results, label);
  }

  // ── Menu Commands ──

  // Current view
  GM_registerMenuCommand('🎬 Scrape Videos (current view)', () => run(scrapeVideos, 'videos'));
  GM_registerMenuCommand('⚡ Scrape Shorts (current view)', () => run(scrapeShorts, 'shorts'));
  GM_registerMenuCommand('📋 Scrape All (current view)', () => run(scrapeAll, 'items'));

  // Auto-scroll
  GM_registerMenuCommand('🎬 Scrape ALL Videos (auto-scroll)', () => runScroll(scrapeVideos, 'videos'));
  GM_registerMenuCommand('⚡ Scrape ALL Shorts (auto-scroll)', () => runScroll(scrapeShorts, 'shorts'));
  GM_registerMenuCommand('📋 Scrape EVERYTHING (auto-scroll)', () => runScroll(scrapeAll, 'items'));
})();