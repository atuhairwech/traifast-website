# Traifast Website

With Node.js 22+, run `npm ci --ignore-scripts --include=dev`, `npm run build`, `npm test`, and `npm run check:deployment`. Wrangler is pinned in the lockfile; the website has no runtime dependencies. Publish only `dist/`.

`npm run check:wrangler` performs a local dry run. `npm run preview:worker` starts the local-only asset server on port 8788; run `node tools/test-worker-assets.mjs` against it. Stop the preview before rebuilding on Windows. `npm run deploy` and `npm run upload:version` are guarded remote operations and must only run after explicit release approval. They accept no extra arguments.

The build fails on unexpected files or links in an existing output directory instead of deleting unrecognized content. The approved output manifest is in `tools/public-files.mjs`. A change to public files or deployment configuration requires review and matching tests; configuration, audit notes, source tooling and repository metadata are never public assets.

Official corporate website for Traifast Enterprises Company Limited.

**Positioning:** B2B Procurement • Supply • Distribution

**Tagline:** Source. Supply. Deliver.

## Structure
- Primary navigation: Home, About, Solutions, Products, Industries, Careers, Contact. Request a Quote is a separate, prominent CTA; Privacy Policy remains in the footer.
- The former Resources URL redirects to About and is excluded from the sitemap. There is no resource library. Retired PDF files are removed from the current source and excluded from production output.
- Static HTML/CSS/JavaScript.
- Primary logo: `assets/images/traifast-logo.png` (1000×500 transparent PNG).
- Favicon master: `assets/images/favicon.png` (512×512 PNG).

No calculators, advertising pages or unrelated legacy tools are included.
