export async function onRequest({ request }) {
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";
  const requestedPage = Math.max(1, Math.min(19, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1));
  const pages = all ? Array.from({ length: 19 }, (_, i) => i + 1) : [requestedPage];
  const headers = { "Cache-Control": "public, max-age=3600, s-maxage=86400", "Access-Control-Allow-Origin": "*" };

  function parseGames(source) {
    const games = [];
    const seen = new Set();
    const anchorPattern = /<a\b[^>]*href=["'](?:https?:\/\/www\.madkidgames\.com)?\/game\/([^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorPattern.exec(source))) {
      const slug = match[1].replace(/\/$/, "");
      if (!slug || seen.has(slug) || slug.includes("/")) continue;
      const title = match[2].replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
      if (!title || title.length > 120 || title.length < 2) continue;
      seen.add(slug);
      const low = title.toLowerCase();
      const category = /car|racing|driv|bike|truck|motor|slope|race|rider|flight|airplane/.test(low) ? "Racing" : /puzzle|mahjong|chess|word|match|brain|sort|2048|number|memory|solitaire|tiles|escape room/.test(low) ? "Puzzle" : /soccer|football|cricket|basketball|pool|golf|tennis|sport|baseball/.test(low) ? "Sports" : /toca|pepi|kids|baby|school|dress|pet|animal|family|doll|cooking|makeover/.test(low) ? "Kids" : "Action";
      games.push({ title, slug, category, image: `https://www.madkidgames.com/games/${slug}/thumb_2.jpg`, embed: `https://www.madkidgames.com/full/${slug}`, page: `https://www.madkidgames.com/game/${slug}` });
    }
    return games;
  }

  try {
    const results = [];
    const failedPages = [];
    // Limit upstream concurrency so a full-catalog request is less likely to time out.
    for (let offset = 0; offset < pages.length; offset += 4) {
      const batch = pages.slice(offset, offset + 4);
      const batchResults = await Promise.all(batch.map(async page => {
        const sourceUrl = page === 1 ? "https://www.madkidgames.com/html5-games" : `https://www.madkidgames.com/html5-games/${page}`;
        try {
          const response = await fetch(sourceUrl, {
            headers: { "User-Agent": "PlayVerse game catalog", "Accept": "text/html" },
            cf: { cacheTtl: 3600, cacheEverything: true }
          });
          if (!response.ok) throw new Error("Catalog provider returned an error");
          const games = parseGames(await response.text());
          if (!games.length) throw new Error("No games parsed");
          return { page, games };
        } catch {
          failedPages.push(page);
          return { page, games: [] };
        }
      }));
      results.push(...batchResults);
    }
    const unique = new Map();
    for (const result of results) for (const game of result.games) if (!unique.has(game.slug)) unique.set(game.slug, game);
    if (!unique.size) {
      return Response.json({ error: "Could not reach game catalog", failedPages }, { status: 502, headers: { ...headers, "Cache-Control": "public, max-age=60" } });
    }
    return Response.json({
      pages: pages.length - failedPages.length,
      requestedPages: pages.length,
      failedPages,
      total: unique.size,
      games: [...unique.values()]
    }, { headers });
  } catch {
    return Response.json({ error: "Could not reach game catalog" }, { status: 502, headers: { "Cache-Control": "public, max-age=60", "Access-Control-Allow-Origin": "*" } });
  }
}