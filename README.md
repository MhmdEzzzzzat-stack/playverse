# PlayVerse

A responsive, static browser-game portal built with HTML, CSS and vanilla JavaScript.

## Included games

- 2048 — keyboard controls
- Neon Snake — arrow keys and WASD
- Memory Match — randomized matching pairs
- Tic Tac Toe — player vs. computer
- Additional standalone games, including Neon Drift and Cyber Rush

## Build and run locally

The site source remains static HTML/CSS/JavaScript. To create a production deployment that also builds the separate GH-Arcade collection, use Node.js 20 or newer:

```bash
npm install
npm run build
```

The build script copies the existing PlayVerse site into `dist/`, builds the MIT-licensed [GH-Arcade project](https://github.com/TMHSDigital/GH-Arcade), and places its production output in `dist/arcade/`. The upstream source is fetched at build time; it is not vendored into this repository.

To preview the existing source without building, open `index.html` in a modern browser or use VS Code Live Server. The self-hosted arcade build requires the build command above.

## Cloudflare Pages deployment

For the self-hosted arcade build, configure the existing Cloudflare Pages project as follows:

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Production branch:** `main`
- **Node.js:** 20 or newer

Do not leave the output directory set to the repository root when using this build pipeline. The pipeline writes the complete deployable site to `dist/`.

## Licensing and launch

The GH-Arcade collection is built from the upstream project's public repository. Its repository lists the MIT License; retain its license and copyright notices when redistributing its files. Review the upstream license and dependencies before release.

Only publish games and assets you have the rights to distribute. Add privacy, terms and contact pages and follow current ad-network policies before applying for monetization. Approval and revenue are not guaranteed.
