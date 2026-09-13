# NodeHashCoin web miner

Browser miner for **NHC**. TypeScript + Web Workers hashing **BLAKE3** (same digest as `nodehashcoin-node`). WASM can wrap the same loop later; the TypeScript path is consensus.

Public repository: [`chrisgu/nodehashcoin-webminer`](https://github.com/chrisgu/nodehashcoin-webminer).

This is a **website miner only**. Do not ship a Chrome Web Store extension — Google forbids mining extensions.

## Layperson path

1. Open the page → paste or create a wallet address
2. Pick a CPU preset (Desktop ~75% / Laptop ~40% / Phone ~15%)
3. **Start mining** / **Stop**

Hashing stays on the visitor’s machine. The node URL is a gateway (`/api` on nodehashcoin.com, or `?node=`).

## Build

```bash
npm install
npm run build
```

`dist/` is a static site (`index.html`, `miner.js`, `miner-worker.js`, `miner.css`).

## Deploy

### Cloudflare Pages / Workers assets

Point Pages at `dist/`, or copy `dist/` into a Worker `[assets]` directory.

```bash
npx wrangler pages deploy dist --project-name nhc-webminer
```

Set the node with `?node=https://your-node.example`.

### Google Cloud (Cloud Run / Cloud Storage)

```bash
gcloud storage cp -r dist/* gs://YOUR_BUCKET/
# or
gcloud run deploy nhc-webminer --source . --region us-central1
```

Add a tiny `Dockerfile` that serves `dist/` with `npx serve dist`.

### AWS (S3 + CloudFront or Elastic Beanstalk)

Upload `dist/` to an S3 website bucket; CloudFront for HTTPS.

## Configure

| Query / global | Default |
|----------------|---------|
| `?node=` or `window.NHC_NODE` | `/api` |

## License

UNLICENSED / source-available. nodehashcoin.com branding stays with MoltAd.
