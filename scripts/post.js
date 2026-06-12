(async function () {
  const bodyEl = document.getElementById('post-body');

  // Expect pretty URLs only: /articles/<slug>/
  let slug;
  {
    const parts = location.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('articles');
    if (i !== -1 && parts[i + 1]) {
      try {
        slug = decodeURIComponent(parts[i + 1]);
      } catch (_) {
        slug = parts[i + 1];
      }
    }
  }

  if (!slug) {
    if (bodyEl) bodyEl.textContent = 'Article not found';
    return;
  }
  try {
    const [metaRes, mdRes] = await Promise.all([
      fetch('/articles/posts.json', { cache: 'no-store' }),
      fetch(`/articles/posts/${encodeURIComponent(slug)}.md`, { cache: 'no-store' })
    ]);
    const metas = await metaRes.json();
    const meta = metas.find(m => m.slug === slug);
    const markdown = await mdRes.text();

    // Set the document title without rendering a duplicate on-page title
    if (meta && meta.title) {
      document.title = `${meta.title} | CieloStitch`;
    } else {
      const h1Match = markdown.match(/^#\s+(.+)$/m);
      if (h1Match) {
        document.title = `${h1Match[1]} | CieloStitch`;
      }
    }

    const html = marked.parse(markdown, { mangle: false, headerIds: true });
    bodyEl.innerHTML = DOMPurify.sanitize(html);

    // Canonical tag for SEO
    const canonicalHref = `${location.origin}/articles/${encodeURIComponent(slug)}/`;
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = canonicalHref;
    document.head.appendChild(link);
  } catch (e) {
    if (bodyEl) bodyEl.textContent = 'Failed to load article';
    console.error(e);
  }
})();