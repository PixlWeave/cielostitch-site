/**
 * releases.js — fetch and render GitHub Releases for CieloStitch
 *
 * The script:
 *  1. Fetches up to MAX_RELEASES releases from the GitHub Releases API.
 *  2. For each release, builds a version card that shows:
 *       • tag name + "Latest" / "Pre-release" badge
 *       • human-friendly release name and publish date
 *       • rendered release notes (Markdown → basic HTML)
 *       • per-platform download buttons with coloured icon badges
 *       • source-code archive links (zip / tar.gz)
 *  3. Falls back to a curated set of demo cards when the API is
 *     unavailable (rate-limited, offline, or the repo is private).
 */

(function () {
  "use strict";

  /* ──────────────────────────────────────────────────────────────
     Configuration
  ────────────────────────────────────────────────────────────── */
  const GITHUB_OWNER = "PixlWeave";
  const GITHUB_REPO  = "cielostitch";
  const MAX_RELEASES = 6;
  const API_URL      = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=${MAX_RELEASES}`;
  const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`;

  /* ──────────────────────────────────────────────────────────────
     Platform detection helpers
  ────────────────────────────────────────────────────────────── */

  /**
   * Classify a release-asset filename into one of the known platforms.
   * Returns { platform, arch, label } or null when the asset should be
   * treated as a source archive or ignored.
   */
  function classifyAsset(filename) {
    const f = filename.toLowerCase();

    // Skip source archives — handled separately
    if (f.endsWith(".zip") && f.includes("source")) return null;
    if (f.endsWith(".tar.gz") && f.includes("source")) return null;

    // Windows
    if (f.includes("win") || f.endsWith(".exe") || f.endsWith(".msi")) {
      const arch = detectArch(f);
      return {
        platform: "windows",
        arch,
        label: f.endsWith(".msi") ? "Windows Installer" : "Windows",
      };
    }

    // macOS
    if (f.includes("mac") || f.includes("darwin") || f.endsWith(".dmg") || f.endsWith(".pkg")) {
      const arch = detectArch(f);
      return {
        platform: "macos",
        arch,
        label: f.endsWith(".dmg") ? "macOS Disk Image" : "macOS",
      };
    }

    // Android
    if (f.endsWith(".apk") || f.endsWith(".aab") || f.includes("android")) {
      const arch = detectArch(f);
      return { platform: "android", arch, label: "Android" };
    }

    // Linux — common packaging formats
    if (
      f.includes("linux") ||
      f.endsWith(".deb") ||
      f.endsWith(".rpm") ||
      f.endsWith(".appimage") ||
      f.endsWith(".flatpak") ||
      f.endsWith(".snap")
    ) {
      const arch = detectArch(f);
      const ext  = f.split(".").pop();
      const labels = { deb: "Linux (.deb)", rpm: "Linux (.rpm)", appimage: "Linux (AppImage)", flatpak: "Linux (Flatpak)", snap: "Linux (Snap)" };
      return {
        platform: "linux",
        arch,
        label: labels[ext] || "Linux",
      };
    }

    // Generic binary / unknown
    if (f.endsWith(".tar.gz") || f.endsWith(".tgz") || f.endsWith(".zip")) {
      const arch = detectArch(f);
      return { platform: "generic", arch, label: filename };
    }

    return null;
  }

  function detectArch(f) {
    if (f.includes("arm64") || f.includes("aarch64")) return "arm64";
    if (f.includes("arm"))                             return "arm";
    if (f.includes("x86_64") || f.includes("amd64"))  return "x64";
    if (f.includes("i386")   || f.includes("x86"))    return "x86";
    if (f.includes("universal"))                       return "universal";
    return "";
  }

  /* ──────────────────────────────────────────────────────────────
     SVG icons (inline, platform-coloured)
  ────────────────────────────────────────────────────────────── */
  const ICONS = {
    windows: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff">
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.801"/>
    </svg>`,
    macos: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
    </svg>`,
    linux: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff">
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489.275 1.756 1.5 2.796 2.823 3.463 1.419.741 3.053 1.157 4.521 1.157 1.068 0 2.034-.158 2.996-.484 1.318-.424 2.676-1.177 3.379-2.526.626-1.208.684-2.817.068-4.287-.58-1.398-1.566-2.575-2.597-3.686-.993-1.067-1.969-2.099-1.983-3.29-.011-.994.065-2.595.065-2.595s-.268-2.735-2.569-2.845M8.917 7.83c-.36-.002-.73.03-1.104.1-.826.153-1.594.67-2.016 1.51-.42.84-.34 1.965.157 2.895.506.93 1.348 1.66 2.364 2.044.47.183.96.302 1.457.378.497.076.996.108 1.49.108.483 0 .968-.03 1.455-.087.487-.056.97-.15 1.43-.28.96-.266 1.81-.8 2.286-1.65.484-.85.484-1.998-.017-2.818-.5-.82-1.353-1.315-2.203-1.498-.456-.096-.904-.14-1.337-.14-.27 0-.533.017-.784.047-.25.03-.49.073-.716.13-.448.114-.85.29-1.178.542M12.504 2c.155 0 .327.01.508.028 1.64.165 2.073 1.76 2.073 2.617 0 0-.054 1.545-.042 2.51.011 1.137.92 2.102 1.978 3.24 1.053 1.145 2.06 2.394 2.638 3.819.588 1.475.527 3.11-.115 4.35-.71 1.37-2.088 2.126-3.43 2.554-.961.309-1.93.455-2.998.455-1.47 0-3.1-.432-4.527-1.178-1.313-.68-2.462-1.647-2.696-3.178-.101-.656.001-1.356.23-2.033.515-1.622 1.67-3.196 2.58-4.28.776-1.096 1.056-2.036 1.127-3.22.056-1.019-.671-5.073 2.674-5.684M19.073 18c.08 0 .157.006.23.018.59.098 1.12.505 1.476 1.033.356.527.505 1.166.362 1.743-.066.26-.2.506-.396.713-.196.207-.45.374-.748.474-.3.1-.65.143-1.016.099-.366-.044-.743-.177-1.056-.423-.313-.246-.556-.608-.621-1.04-.065-.43.05-.894.3-1.26.25-.365.634-.62 1.04-.736.164-.046.333-.07.502-.072z"/>
    </svg>`,
    android: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff">
      <path d="M17.523 15.341A5.3 5.3 0 0 1 16.5 15.8V19a1 1 0 1 1-2 0v-3h-1v3a1 1 0 1 1-2 0v-3.2a5.3 5.3 0 0 1-1.023-.459A4.9 4.9 0 0 1 7 10.7V9h10v1.7a4.9 4.9 0 0 1-3.477 4.641zM5 10.7V9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2v-4.3zM21 10a1 1 0 0 0-1-1h-2v1.7V15h2a1 1 0 0 0 1-1v-4zM9.535 3.179l-.9-1.558a.25.25 0 0 0-.342-.091.25.25 0 0 0-.092.341l.9 1.558A5.9 5.9 0 0 0 6.9 5.2h10.2a5.9 5.9 0 0 0-2.201-1.771l.9-1.558a.25.25 0 0 0-.092-.341.25.25 0 0 0-.342.091l-.9 1.558A5.9 5.9 0 0 0 12 3a5.9 5.9 0 0 0-2.465.179zM10.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zm4 0a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>
    </svg>`,
    generic: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#fff">
      <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.08 15.92 0 13.36 0c-1.3 0-2.43.52-3.26 1.35L9 2.5 7.9 1.35C7.07.52 5.94 0 4.64 0 2.08 0 0 2.08 0 4.64c0 .48.11.92.18 1.36H0c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM9 19.5H4V16h5v3.5zm0-5.5H4v-3.5h5V14zm7 5.5h-5V16h5v3.5zm0-5.5h-5v-3.5h5V14z"/>
    </svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`,
    tag: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>`,
    github: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>`,
    zip: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>`,
  };

  /* ──────────────────────────────────────────────────────────────
     Utilities
  ────────────────────────────────────────────────────────────── */

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatBytes(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  /**
   * Minimal Markdown → safe HTML converter.
   * Handles: headings, bold, inline code, code blocks, lists, paragraphs.
   * Does NOT rely on any external library.
   */
  function markdownToHtml(md) {
    if (!md) return "<em>No release notes provided.</em>";

    // Escape raw HTML to prevent XSS
    const escaped = md
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const lines  = escaped.split("\n");
    const output = [];
    let listType = null; // null | "ul" | "ol"
    let inCode   = false;

    const closeList = function () {
      if (listType) { output.push(`</${listType}>`); listType = null; }
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Fenced code block
      if (line.trimStart().startsWith("```")) {
        if (!inCode) {
          closeList();
          output.push("<pre><code>");
          inCode = true;
        } else {
          output.push("</code></pre>");
          inCode = false;
        }
        continue;
      }
      if (inCode) { output.push(line); continue; }

      // Close list if the current line is not a list item
      if (!line.match(/^(\s*[-*+]|\s*\d+\.)\s/) && listType) {
        closeList();
      }

      // Headings
      const hm = line.match(/^(#{1,3})\s+(.*)/);
      if (hm) {
        const lvl = hm[1].length + 2; // h3..h5
        output.push(`<h${lvl}>${inline(hm[2])}</h${lvl}>`);
        continue;
      }

      // Unordered list item
      const ulm = line.match(/^\s*[-*+]\s+(.*)/);
      if (ulm) {
        if (listType !== "ul") { closeList(); output.push("<ul>"); listType = "ul"; }
        output.push(`<li>${inline(ulm[1])}</li>`);
        continue;
      }

      // Ordered list item
      const olm = line.match(/^\s*\d+\.\s+(.*)/);
      if (olm) {
        if (listType !== "ol") { closeList(); output.push("<ol>"); listType = "ol"; }
        output.push(`<li>${inline(olm[1])}</li>`);
        continue;
      }

      // Horizontal rule
      if (line.match(/^[-*_]{3,}$/)) {
        output.push("<hr>");
        continue;
      }

      // Blank line
      if (line.trim() === "") {
        output.push("");
        continue;
      }

      // Paragraph
      output.push(`<p>${inline(line)}</p>`);
    }

    closeList();
    if (inCode)  output.push("</code></pre>");

    return output.join("\n");
  }

  /** Apply inline Markdown (bold, italic, code, links). */
  function inline(text) {
    return text
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/_([^_]+)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
  }

  /* ──────────────────────────────────────────────────────────────
     DOM builders
  ────────────────────────────────────────────────────────────── */

  function buildCard(release, isFirst) {
    const card = document.createElement("article");
    card.className = "version-card";
    card.setAttribute("data-tag", release.tag_name);

    /* ── Header ── */
    const header = document.createElement("div");
    header.className = "version-card__header";

    const tag = document.createElement("span");
    tag.className = "version-card__tag";
    tag.innerHTML = `${ICONS.tag} ${escapeHtml(release.tag_name)}`;
    header.appendChild(tag);

    if (isFirst && !release.prerelease) {
      const badge = document.createElement("span");
      badge.className = "badge-latest";
      badge.textContent = "Latest";
      header.appendChild(badge);
    }
    if (release.prerelease) {
      const badge = document.createElement("span");
      badge.className = "badge-prerelease";
      badge.textContent = "Pre-release";
      header.appendChild(badge);
    }

    if (release.name && release.name !== release.tag_name) {
      const name = document.createElement("span");
      name.className = "version-card__name";
      name.textContent = release.name;
      header.appendChild(name);
    }

    const date = document.createElement("time");
    date.className = "version-card__date";
    date.dateTime  = release.published_at;
    date.textContent = formatDate(release.published_at);
    header.appendChild(date);

    card.appendChild(header);

    /* ── Body ── */
    const body = document.createElement("div");
    body.className = "version-card__body";

    body.appendChild(buildNotesColumn(release));
    body.appendChild(buildDownloadsColumn(release));

    card.appendChild(body);
    return card;
  }

  function buildNotesColumn(release) {
    const col = document.createElement("div");
    col.className = "release-notes";

    const label = document.createElement("p");
    label.className = "release-notes__label";
    label.textContent = "Release Notes";
    col.appendChild(label);

    const notesDiv = document.createElement("div");
    notesDiv.className = "release-notes__body";
    notesDiv.innerHTML = markdownToHtml(release.body);
    col.appendChild(notesDiv);

    // "Show more" toggle — only add when content likely overflows
    if ((release.body || "").split("\n").length > 8) {
      const toggle = document.createElement("button");
      toggle.className = "release-notes__toggle";
      toggle.textContent = "Show more";
      toggle.addEventListener("click", function () {
        const expanded = notesDiv.classList.toggle("is-expanded");
        toggle.textContent = expanded ? "Show less" : "Show more";
      });
      col.appendChild(toggle);
    }

    return col;
  }

  function buildDownloadsColumn(release) {
    const col = document.createElement("div");
    col.className = "downloads-panel";

    const label = document.createElement("p");
    label.className = "downloads-panel__label";
    label.textContent = "Downloads";
    col.appendChild(label);

    const assets = release.assets || [];

    // Separate source archives from binary assets
    const binaries = [];
    const sources  = [];

    assets.forEach(function (asset) {
      const f = asset.name.toLowerCase();
      if (
        (f.endsWith(".zip") || f.endsWith(".tar.gz")) &&
        (f.includes("source") || f.includes("src"))
      ) {
        sources.push(asset);
      } else {
        binaries.push(asset);
      }
    });

    /* Binary download buttons */
    if (binaries.length === 0) {
      const empty = document.createElement("p");
      empty.style.cssText = "font-size:.82rem;color:var(--color-text-muted)";
      empty.textContent = "No binary assets available for this release.";
      col.appendChild(empty);
    } else {
      const group = document.createElement("div");
      group.className = "platform-group";

      binaries.forEach(function (asset) {
        const info = classifyAsset(asset.name);
        const platform = info ? info.platform : "generic";
        const arch     = info ? info.arch     : "";
        const label    = info ? info.label    : asset.name;

        const btn = document.createElement("a");
        btn.className   = "platform-btn";
        btn.href        = asset.browser_download_url;
        btn.title       = asset.name;
        btn.setAttribute("rel", "noopener noreferrer");

        // Icon
        const icon = document.createElement("span");
        icon.className = `platform-btn__icon platform-btn__icon--${platform}`;
        icon.innerHTML = ICONS[platform] || ICONS.generic;
        btn.appendChild(icon);

        // Label
        const lblSpan = document.createElement("span");
        lblSpan.className   = "platform-btn__label";
        lblSpan.textContent = label;
        btn.appendChild(lblSpan);

        // Arch badge
        if (arch) {
          const archSpan = document.createElement("span");
          archSpan.className   = "platform-btn__arch";
          archSpan.textContent = arch;
          btn.appendChild(archSpan);
        }

        // File size
        if (asset.size) {
          const sizeSpan = document.createElement("span");
          sizeSpan.className   = "platform-btn__size";
          sizeSpan.textContent = formatBytes(asset.size);
          btn.appendChild(sizeSpan);
        }

        // Download icon
        const dlIcon = document.createElement("span");
        dlIcon.innerHTML = ICONS.download;
        btn.appendChild(dlIcon);

        group.appendChild(btn);
      });

      col.appendChild(group);
    }

    /* Source archive links */
    if (release.zipball_url || release.tarball_url || sources.length > 0) {
      const srcRow = document.createElement("div");
      srcRow.className = "source-row";

      const addSrcLink = function (href, text) {
        const a = document.createElement("a");
        a.className = "source-link";
        a.href      = href;
        a.innerHTML = `${ICONS.zip} ${escapeHtml(text)}`;
        a.setAttribute("rel", "noopener noreferrer");
        srcRow.appendChild(a);
      };

      if (release.zipball_url)   addSrcLink(release.zipball_url,   "Source (.zip)");
      if (release.tarball_url)   addSrcLink(release.tarball_url,   "Source (.tar.gz)");
      sources.forEach(function (a) { addSrcLink(a.browser_download_url, a.name); });

      col.appendChild(srcRow);
    }

    return col;
  }

  /* ──────────────────────────────────────────────────────────────
     State helpers
  ────────────────────────────────────────────────────────────── */

  function showLoading(container) {
    container.innerHTML = `
      <div class="state-msg">
        <div class="spinner"></div>
        <p class="state-msg__text">Fetching releases…</p>
      </div>`;
  }

  function showError(container, message) {
    container.innerHTML = `
      <div class="state-msg">
        <div class="state-msg__icon">⚠️</div>
        <p class="state-msg__text">${escapeHtml(message)}</p>
      </div>`;
  }

  function showEmpty(container) {
    container.innerHTML = `
      <div class="state-msg">
        <div class="state-msg__icon">📦</div>
        <p class="state-msg__text">No releases published yet. Check back soon!</p>
      </div>`;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ──────────────────────────────────────────────────────────────
     Demo / fallback data
     Shown when the GitHub API cannot be reached so the page remains
     fully functional during local development or when the app repo
     is still private.
  ────────────────────────────────────────────────────────────── */
  function getDemoReleases() {
    const base = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download`;
    return [
      {
        id: 1,
        tag_name: "v1.2.0",
        name: "Horizon Update",
        prerelease: false,
        published_at: "2025-11-08T12:00:00Z",
        html_url: `${RELEASES_URL}/tag/v1.2.0`,
        zipball_url: `${RELEASES_URL}/download/v1.2.0/source.zip`,
        tarball_url: `${RELEASES_URL}/download/v1.2.0/source.tar.gz`,
        body: `## What's New\n\n- **GPU-accelerated stitching** — up to 4× faster on supported hardware\n- **New export presets**: 4 K, 8 K, and custom resolution\n- Improved horizon-alignment algorithm for wide-angle panoramas\n- Fixed crash when loading HEIC images on Windows\n\n## Breaking Changes\n\nProject files from v1.0.x must be migrated via *File → Migrate Project*.\n\n## Downloads\n\nSee the assets below for your platform.`,
        assets: [
          { id: 101, name: "CieloStitch-1.2.0-win-x64.exe",           browser_download_url: `${base}/v1.2.0/CieloStitch-1.2.0-win-x64.exe`,           size: 54525952 },
          { id: 102, name: "CieloStitch-1.2.0-win-x64.msi",           browser_download_url: `${base}/v1.2.0/CieloStitch-1.2.0-win-x64.msi`,           size: 53477376 },
          { id: 103, name: "CieloStitch-1.2.0-mac-universal.dmg",     browser_download_url: `${base}/v1.2.0/CieloStitch-1.2.0-mac-universal.dmg`,     size: 62914560 },
          { id: 104, name: "CieloStitch-1.2.0-linux-x86_64.AppImage", browser_download_url: `${base}/v1.2.0/CieloStitch-1.2.0-linux-x86_64.AppImage`, size: 58720256 },
          { id: 105, name: "CieloStitch-1.2.0-linux-x86_64.deb",      browser_download_url: `${base}/v1.2.0/CieloStitch-1.2.0-linux-x86_64.deb`,      size: 42991616 },
          { id: 106, name: "CieloStitch-1.2.0-linux-aarch64.deb",     browser_download_url: `${base}/v1.2.0/CieloStitch-1.2.0-linux-aarch64.deb`,     size: 41943040 },
        ],
      },
      {
        id: 2,
        tag_name: "v1.1.3",
        name: "Patch Release",
        prerelease: false,
        published_at: "2025-09-22T09:30:00Z",
        html_url: `${RELEASES_URL}/tag/v1.1.3`,
        zipball_url: `${RELEASES_URL}/download/v1.1.3/source.zip`,
        tarball_url: `${RELEASES_URL}/download/v1.1.3/source.tar.gz`,
        body: `## Bug Fixes\n\n- Fixed memory leak when batch-processing large directories\n- Corrected colour-profile handling for AdobeRGB images\n- Resolved UI freeze on macOS Sonoma when using Split View\n\n## Improvements\n\n- Reduced startup time by ~20 %\n- Progress bar now shows individual stage completion`,
        assets: [
          { id: 201, name: "CieloStitch-1.1.3-win-x64.exe",           browser_download_url: `${base}/v1.1.3/CieloStitch-1.1.3-win-x64.exe`,           size: 53477376 },
          { id: 202, name: "CieloStitch-1.1.3-mac-universal.dmg",     browser_download_url: `${base}/v1.1.3/CieloStitch-1.1.3-mac-universal.dmg`,     size: 61865984 },
          { id: 203, name: "CieloStitch-1.1.3-linux-x86_64.AppImage", browser_download_url: `${base}/v1.1.3/CieloStitch-1.1.3-linux-x86_64.AppImage`, size: 57671680 },
        ],
      },
      {
        id: 3,
        tag_name: "v1.2.1-beta",
        name: "Beta Channel",
        prerelease: true,
        published_at: "2025-11-30T08:00:00Z",
        html_url: `${RELEASES_URL}/tag/v1.2.1-beta`,
        zipball_url: `${RELEASES_URL}/download/v1.2.1-beta/source.zip`,
        tarball_url: `${RELEASES_URL}/download/v1.2.1-beta/source.tar.gz`,
        body: `## Beta Release — v1.2.1-beta\n\n⚠️ **This is a pre-release build. Not recommended for production use.**\n\n### New in this beta\n\n- Experimental multi-GPU support (requires compatible CUDA / Metal drivers)\n- Draft: 360° equirectangular export mode\n- Prototype AI-assisted seam blending (feedback welcome!)\n\n### Known Issues\n\n- Multi-GPU mode may crash on systems with mixed GPU vendors\n- AI blending is slow on images larger than 100 MP`,
        assets: [
          { id: 301, name: "CieloStitch-1.2.1-beta-win-x64.exe",           browser_download_url: `${base}/v1.2.1-beta/CieloStitch-1.2.1-beta-win-x64.exe`,           size: 55574528 },
          { id: 302, name: "CieloStitch-1.2.1-beta-mac-arm64.dmg",         browser_download_url: `${base}/v1.2.1-beta/CieloStitch-1.2.1-beta-mac-arm64.dmg`,         size: 57671680 },
          { id: 303, name: "CieloStitch-1.2.1-beta-linux-x86_64.AppImage", browser_download_url: `${base}/v1.2.1-beta/CieloStitch-1.2.1-beta-linux-x86_64.AppImage`, size: 59768832 },
        ],
      },
    ];
  }

  /* ──────────────────────────────────────────────────────────────
     Main render function
  ────────────────────────────────────────────────────────────── */

  function renderReleases(releases, container) {
    container.innerHTML = "";
    if (!releases || releases.length === 0) { showEmpty(container); return; }

    // Sort: stable releases first, then by published date descending
    const sorted = releases.slice().sort(function (a, b) {
      if (a.prerelease !== b.prerelease) return a.prerelease ? 1 : -1;
      return new Date(b.published_at) - new Date(a.published_at);
    });

    sorted.forEach(function (release, i) {
      const isFirst = i === 0 && !release.prerelease;
      container.appendChild(buildCard(release, isFirst));
    });
  }

  /* ──────────────────────────────────────────────────────────────
     Fetch releases from the GitHub API
  ────────────────────────────────────────────────────────────── */

  function loadReleases() {
    const container = document.getElementById("releases-list");
    if (!container) return;

    showLoading(container);

    fetch(API_URL, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    })
      .then(function (res) {
        if (res.status === 404) throw new Error("Repository not found.");
        if (!res.ok)            throw new Error(`GitHub API returned ${res.status}.`);
        return res.json();
      })
      .then(function (releases) {
        if (releases.length === 0) {
          // Fall back to demo data so the page is never empty
          renderReleases(getDemoReleases(), container);
          markDemo(container);
        } else {
          renderReleases(releases, container);
        }
      })
      .catch(function () {
        // Network / API error → show demo releases with a notice
        renderReleases(getDemoReleases(), container);
        markDemo(container);
      });
  }

  /** Prepend a subtle notice when demo data is being displayed. */
  function markDemo(container) {
    const notice = document.createElement("p");
    notice.style.cssText =
      "font-size:.78rem;color:var(--color-text-muted);margin-bottom:16px;" +
      "background:var(--color-surface-2);border:1px solid var(--color-border);" +
      "border-radius:6px;padding:8px 14px;";
    notice.innerHTML =
      `Preview data — live releases will appear once <a href="${escapeHtml(RELEASES_URL)}" ` +
      `rel="noopener noreferrer" target="_blank">the repository</a> is published.`;
    container.insertBefore(notice, container.firstChild);
  }

  /* ──────────────────────────────────────────────────────────────
     Boot
  ────────────────────────────────────────────────────────────── */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadReleases);
  } else {
    loadReleases();
  }
})();
