(() => {
  "use strict";
  const grid = document.getElementById("gamesGrid");
  const search = document.getElementById("gameSearch");
  const status = document.getElementById("madkidStatus");
  if (!grid || !status) return;
  const loadMore = document.getElementById("madkidLoadMore");
  const seen = new Set([...grid.querySelectorAll('a[href*="source=madkid&game="]')].map(link => {
    try { return new URL(link.href, location.href).searchParams.get("game") || ""; } catch (_) { return ""; }
  }).filter(Boolean));
  let page = 1, loading = false, finished = false, loaded = 0;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function card(game) {
    const title=escapeHtml(game.title), slug=encodeURIComponent(game.slug), image=escapeHtml(game.image);
    const category=escapeHtml(game.category || "Arcade");
    return '<article class="game-card madkid-card" data-name="'+(title+" madkidgames "+category).toLowerCase()+'" data-category="'+category+'" data-game="madkid-'+slug+'"><a class="game-cover" href="play.html?source=madkid&game='+slug+'&title='+encodeURIComponent(game.title)+'" aria-label="Play '+title+'"><span class="cover-badge">NEW GAME</span><img class="cover-art" src="'+image+'" alt="'+title+' game cover" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 640 360%22%3E%3Crect width=%22640%22 height=%22360%22 fill=%22%23252b42%22/%3E%3Ctext x=%2250%25%22 y=%2252%25%22 fill=%22white%22 font-size=%2230%22 text-anchor=%22middle%22 font-family=%22Arial%22%3EPlayVerse%3C/text%3E%3C/svg%3E\'"></a><div class="game-info"><div><h3>'+title+'</h3><p>Free browser game</p></div><button class="favorite-button" aria-label="Add '+title+' to favorites" aria-pressed="false">♡</button></div><div class="card-bottom"><span class="category-tag">'+category+'</span><a class="play-button" href="play.html?source=madkid&game='+slug+'&title='+encodeURIComponent(game.title)+'">Play now ↗</a></div></article>';
  }
  function updateStatus() {
    const visible=[...grid.querySelectorAll(".game-card")].filter(c=>!c.hidden).length;
    status.textContent = "THE GAME ZONE · "+loaded+" MadKidGames games added to PlayVerse"+(finished ? " · catalog complete" : " · loading more games as you browse")+(search && search.value.trim() ? " · "+visible+" matching games" : "");
  }
  function applySearch() {
    const term=(search?.value || "").trim().toLowerCase();
    const selected=document.querySelector("[data-filter].selected[data-filter]");
    const category=selected?.dataset.filter || "All";
    grid.querySelectorAll(".madkid-card").forEach(c => {
      const matchesTerm=!term || c.dataset.name.includes(term) || c.querySelector("h3").textContent.toLowerCase().includes(term);
      const matchesCategory=category==="All" || c.dataset.category===category;
      c.hidden=!(matchesTerm && matchesCategory);
    });
    updateStatus();
  }
  async function loadPage() {
    if(loading||finished) return;
    loading=true;
    if(loadMore) { loadMore.hidden=false; loadMore.disabled=true; loadMore.textContent="Loading games…"; }
    try {
      const response=await fetch("/api/madkid?page="+page,{headers:{Accept:"application/json"}});
      if(!response.ok) throw new Error("Catalog request failed");
      const payload=await response.json();
      const batch=Array.isArray(payload.games)?payload.games:[];
      let added=0;
      batch.forEach(game=>{
        if(!game.slug||seen.has(game.slug)) return;
        seen.add(game.slug); grid.insertAdjacentHTML("beforeend",card(game)); added++; loaded++;
      });
      if(page>=19||batch.length===0) finished=true;
      page++;
      applySearch();
      if(added===0 && !batch.length) finished=true;
    } catch (_) {
      status.textContent = loaded ? "Loaded "+loaded+" partner games so far. More games could not be reached right now." : "The extended library could not load. Please refresh and try again.";
    } finally {
      loading=false;
      if(loadMore) { loadMore.disabled=false; loadMore.textContent=finished?"All catalog pages checked":"Load more games"; loadMore.hidden=finished; }
    }
  }
  // The existing PlayVerse search and category controls are shared by native and partner cards.
  // Re-apply their current state whenever a new batch arrives.
  // The catalog paging control sits below the unified game grid.
  if(loadMore) loadMore.addEventListener("click",()=>loadPage());
  loadPage().then(()=>{ if(!finished) loadPage(); });
})();