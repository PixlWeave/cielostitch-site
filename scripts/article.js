(async function () {
  const list = document.getElementById('article-list');
  try {
    const res = await fetch('./posts.json', { cache: 'no-store' });
    const posts = (await res.json()).sort((a, b) => new Date(b.date) - new Date(a.date));

    list.innerHTML = posts.map(p => `
      <article class="card">
        <a href="./article.html?slug=${encodeURIComponent(p.slug)}" class="card__body">
          ${p.hero ? `<img class="card__media" src="${p.hero}" alt="" loading="lazy">` : ''}
          <div class="card__content">
            <h2 class="card__title">${p.title}</h2>
            ${p.summary ? `<p>${p.summary}</p>` : ''}
          </div>
        </a>
      </article>
    `).join('');
  } catch (e) {
    list.textContent = 'Failed to load articles.';
    console.error(e);
  }
})();