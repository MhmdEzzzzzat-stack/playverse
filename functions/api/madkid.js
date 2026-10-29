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
    const results = await Promise.all(pages.map(async page => {
      const sourceUrl = page === 1 ? "https://www.madkidgames.com/html5-games" : `https://www.madkidgames.com/html5-games/${page}`;
      const response = await fetch(sourceUrl, { headers: { "User-Agent": "PlayVerse game catalog" } });
      if (!response.ok) throw new Error("Catalog provider returned an error");
      return { page, games: parseGames(await response.text()) };
    }));
    const unique = new Map();
    for (const result of results) for (const game of result.games) if (!unique.has(game.slug)) unique.set(game.slug, game);
    return Response.json({ pages: pages.length, total: unique.size, games: [...unique.values()] }, { headers });
  } catch {
    return Response.json({ error: "Could not reach game catalog" }, { status: 502, headers: { "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" } });
  }
}