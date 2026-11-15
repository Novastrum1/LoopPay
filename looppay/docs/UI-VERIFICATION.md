# Web UI verification

Verified locally in the GitHub Codespace on 2026-11-15. These results do not
constitute a security audit or verification of a Vercel production deployment.

- `npm run build` from `looppay/`: passed, including Next.js lint and type checks.
- `pnpm test`: 14 tests passed across SDK amounts, forms, and indexer analytics.
- `pnpm test:e2e`: four tests passed. Three browser journeys cover 360px, 768px,
  and 1440px; the fourth checks static canvas output under reduced motion.
- Browser journeys cover mobile navigation, demo checkout confirmation,
  insufficient rewards, reward redemption, QR invoice creation, paid invoice
  history, campaign review/confirmation, page titles, single H1, horizontal
  overflow, and console/page error collection.
- The opt-in local-chain browser test was skipped. Its selectors were updated
  for the description field and the explicit payment confirmation step. No live
  testnet signing or settlement was verified in this redesign session.

## Homepage Lighthouse

Production build served locally with `pnpm --filter @looppay/web start --port 3005`.
Lighthouse 13.6.0, default mobile simulation with Playwright Chromium, measured:

| Metric | Result |
| --- | --- |
| Performance | 100 |
| Accessibility | 100 |
| SEO | 100 |
| Largest contentful paint | 0.8 seconds |
| Total blocking time | 80 milliseconds |
| Cumulative layout shift | 0 |

These are homepage measurements, not scores for every app route. Results can
vary with hosting, CPU, wallet extensions, RPC and database availability. Repeat
on the deployed Vercel URL with the intended production environment.

The globe pauses off-screen and when the document is hidden, limits drawing to
approximately 24 fps, caps devicePixelRatio at 2, and disables auto-rotation and
pulses for reduced motion. Figtree body text is served locally under its included OFL license. Satoshi
headings use Fontshare’s official CDN; its license notice is included and the
font file is not redistributed through this repository. Marketing pages defer wallet providers, and marketing navigation
does not prefetch the transaction workspace.

## Data boundaries and remaining setup

All example cities, shops, ticker events, balances, and simulated transactions
are labelled demo data. Demo invoices/campaigns use browser-local storage;
links do not carry records between browsers. Demo reward balances reset on page
reload and are separate from simulated checkout earnings.

Marketing pages do not query contract bytecode. The transaction workspace checks
the configured deployment before enabling live writes. Missing/invalid public
configuration or missing bytecode enables Demo mode there; RPC failures show an
unavailable state and disable writes. Indexer failures never manufacture live
balances or history.

Live history, campaign discovery, partner metadata and analytics need the existing
indexer plus PostgreSQL. Supply verified QIE deployment addresses, approved token
identity/decimals, public RPC/explorer, deployment block, and real merchant
metadata. Contact uses the repository issue form until a contact address is
provided. See the README environment reference and `.env.example`.

No contracts, ABI definitions, SDK methods, or environment variable names were
changed. V1 campaigns support percentage rewards. Creation, token approval and
reserve deposit remain separate transactions; reserve withdrawals are not
supported. No Git push or deployment was performed.

The recorded Lighthouse scores above predate the Figtree/Satoshi typography and international globe updates.

## International globe update

The globe now uses 1,210 sampled land points from Natural Earth’s public-domain
1:110m land polygons. The generated sample and source attribution are in
`apps/web/lib/globe-land.ts`. No map library or runtime map request is used.

A closed illustrative route connects Nigeria, Ghana, Portugal, the United Kingdom,
the United States, Brazil, South Africa, Kenya, the UAE, India, Singapore, Japan,
and Australia. Approximate hubs do not represent real merchants, partnerships,
service availability, or transaction activity. Kaduna and Lagos remain labelled
under the Nigeria hub.

The illustration includes perspective, a tilted globe, a latitude/longitude grid,
front-facing continent dots, elevated spherical arcs, and travelling pulses.
Country labels use collision avoidance. Pause, rotation buttons, dragging, and
arrow keys are supported. Existing reduced-motion, off-screen, hidden-tab, frame
rate, and pixel-ratio limits are retained.

For this update, the responsive journeys passed at 360px, 768px, and 1440px
without console/page errors. Dedicated browser checks also passed for static
reduced motion, pause, rotation buttons, and keyboard rotation.
