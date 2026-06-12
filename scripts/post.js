(async function () {
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  const bodyEl = document.getElementById('post-body');

  if (!slug) {
    if (bodyEl) bodyEl.textContent = 'Article not found';
    return;
  }
  try {
    const [metaRes, mdRes] = await Promise.all([
      fetch('./posts.json', { cache: 'no-store' }),
      fetch(`./posts/${slug}.md`, { cache: 'no-store' })
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
  } catch (e) {
    if (bodyEl) bodyEl.textContent = 'Failed to load article';
    console.error(e);
  }
})();