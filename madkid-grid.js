(() => {
  "use strict";
  const grid = document.getElementById("gamesGrid");
  const search = document.getElementById("gameSearch");
  const status = document.getElementById("madkidStatus");
  if (!grid || !status) return;
  const loadMore = document.getElementById("madkidLoadMore");
  if (loadMore) loadMore.hidden = true;

  const seen = new Set([...grid.querySelectorAll('a[href*="source=madkid&game="]')].map(link => {
    try { return new URL(link.href, location.href).searchParams.get("game") || ""; } catch (_) { return ""; }
  }).filter(Boolean));
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function card(game) {
    const title=escapeHtml(game.title), slug=encodeURIComponent(game.slug), image=escapeHtml(game.image);
    const category=escapeHtml(game.category || "Arcade");
    const href='play.html?source=madkid&game='+slug+'&title='+encodeURIComponent(game.title);
    return '<article class="game-card madkid-card" data-name="'+(title+" "+category).toLowerCase()+'" data-category="'+category+'" data-game="madkid-'+slug+'"><a class="game-cover" href="'+href+'" aria-label="Play '+title+'"><img class="cover-art" src="'+image+'" alt="'+title+' game cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Crect width=%22640%22 height=%22360%22 fill=%22%23252b42%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22white%22 font-size=%2230%22 text-anchor=%22middle%22 font-family=%22Arial%22%3EPlayVerse%3C/text%3E%3C/svg%3E\'"></a><div class="game-info"><div><h3>'+title+'</h3><p>Free browser game</p></div><button class="favorite-button" aria-label="Add '+title+' to favorites" aria-pressed="false">♡</button></div><div class="card-bottom"><span class="category-tag">'+category+'</span><a class="play-button" href="'+href+'">Play now <span>↗</span></a></div></article>';
  }
  function applySearch() {
    const term=(search?.value || "").trim().toLowerCase();
    const selected=document.querySelector("[data-filter].selected");
    const category=selected?.dataset.filter || "All";
    grid.querySelectorAll(".madkid-card").forEach(c => {
      const matchesTerm=!term || c.dataset.name.includes(term) || c.querySelector("h3").textContent.toLowerCase().includes(term);
      const matchesCategory=category==="All" || category==="All games" || c.dataset.category===category;
      c.hidden=!(matchesTerm && matchesCategory);
    });
  }
  async function loadAll() {
    status.textContent = "Loading more games for PlayVerse…";
    try {
      const response=await fetch("/api/madkid?all=1",{headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error("Catalog request failed");
      const payload=await response.json();
      if(!Array.isArray(payload.games) || !payload.games.length) throw new Error("Empty catalog");
      let added=0;
      payload.games.forEach(game=>{
        if(!game.slug || seen.has(game.slug)) return;
        seen.add(game.slug);
        grid.insertAdjacentHTML("beforeend",card(game));
        added++;
      });
      applySearch();
      status.textContent = "All available games are shown · "+(payload.total || payload.games.length)+" games";
      document.dispatchEvent(new CustomEvent("playverse:games-added"));
    } catch (_) {
      status.textContent = "Games could not load right now. Please refresh and try again.";
    }
  }
  search?.addEventListener("input",applySearch);
  document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>setTimeout(applySearch,0)));
  loadAll();
})();