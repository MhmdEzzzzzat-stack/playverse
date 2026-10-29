(() => {
  "use strict";
  const grid = document.getElementById("madkidGrid");
  if (!grid) return;
  const search = document.getElementById("madkidSearch");
  const status = document.getElementById("madkidStatus");
  const loadMore = document.getElementById("madkidLoadMore");
  const loadWrap = document.getElementById("madkidLoadMoreWrap");
  const error = document.getElementById("madkidError");
  const chips = [...document.querySelectorAll("[data-madkid-filter]")];
  const games = [];
  const seen = new Set();
  let page = 1, activeFilter = "All", visibleLimit = 48, loading = false, finished = false;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function card(game, index) {
    const title = escapeHtml(game.title), slug = encodeURIComponent(game.slug);
    const image = escapeHtml(game.image), category = escapeHtml(game.category);
    return '<article class="game-card madkid-card" data-name="'+title.toLowerCase()+' madkidgames '+category.toLowerCase()+'" data-category="'+category+'" data-game="madkid-'+slug+'"><a class="game-cover" href="play.html?source=madkid&game='+slug+'&title='+encodeURIComponent(game.title)+'" aria-label="Play '+title+'"><span class="cover-badge">MADKIDGAMES</span><img class="cover-art" src="'+image+'" alt="'+title+' game cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Crect width=%22640%22 height=%22360%22 fill=%22%23252b42%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22white%22 font-size=%2230%22 text-anchor=%22middle%22 font-family=%22Arial%22%3EPlayVerse%3C/text%3E%3C/svg%3E\'"></a><div class="game-info"><div><h3>'+title+'</h3><p>Play free online</p></div></div><div class="card-bottom"><span class="category-tag">'+category+'</span><a class="play-button" href="play.html?source=madkid&game='+slug+'&title='+encodeURIComponent(game.title)+'">Play now ↗</a></div></article>';
  }
  function render() {
    const term = search.value.trim().toLowerCase();
    const filtered = games.filter(g => (activeFilter === "All" || g.category === activeFilter) && g.title.toLowerCase().includes(term));
    grid.innerHTML = filtered.slice(0, visibleLimit).map(card).join("");
    status.textContent = filtered.length ? filtered.length+' games found · '+games.length+' loaded from MadKidGames' : 'No games match your search.';
    loadWrap.hidden = filtered.length <= visibleLimit || !term && finished;
    loadMore.textContent = visibleLimit < filtered.length ? 'Load more games' : finished ? 'All loaded games shown' : 'Load more games';
    loadMore.disabled = visibleLimit >= filtered.length && finished;
  }
  async function loadPage() {
    if (loading || finished) return;
    loading = true; loadMore.disabled = true; error.hidden = true;
    try {
      const response = await fetch('/api/madkid?page='+page, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Catalog request failed');
      const payload = await response.json();
      const batch = Array.isArray(payload.games) ? payload.games : [];
      batch.forEach(game => { if (game.slug && !seen.has(game.slug)) { seen.add(game.slug); games.push(game); } });
      if (page >= 19 || batch.length === 0) finished = true;
      page++;
      render();
      if (games.length === 0) throw new Error('No catalog entries found');
    } catch (_) {
      if (games.length === 0) error.hidden = false;
      else status.textContent = 'Some catalog pages could not be loaded. Showing '+games.length+' games so far.';
      loadWrap.hidden = games.length === 0;
    } finally { loading = false; loadMore.disabled = false; }
  }
  search.addEventListener('input', () => { visibleLimit = 48; render(); if (games.length < 80 && !finished) loadPage(); });
  chips.forEach(chip => chip.addEventListener('click', () => {
    activeFilter = chip.dataset.madkidFilter;
    chips.forEach(item => item.classList.toggle('selected', item === chip));
    visibleLimit = 48; render();
  }));
  loadMore.addEventListener('click', async () => {
    if (visibleLimit < games.filter(g => (activeFilter === "All" || g.category === activeFilter) && g.title.toLowerCase().includes(search.value.trim().toLowerCase())).length) {
      visibleLimit += 48; render(); return;
    }
    if (!finished) await loadPage();
    else { visibleLimit += 48; render(); }
  });
  loadPage().then(() => { if (games.length && !finished) loadPage(); });
})();