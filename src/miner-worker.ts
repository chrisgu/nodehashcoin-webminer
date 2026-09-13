import { serializeHeader, blake3Hex, hashMeetsTarget, type BlockHeader } from "nodehashcoin-node/consensus";

type StartMsg = {
  type: "start";
  header: BlockHeader;
  duty: number;
  workerId: number;
};

let running = false;

self.onmessage = (ev: MessageEvent<StartMsg | { type: "stop" }>) => {
  const msg = ev.data;
  if (msg.type === "stop") {
    running = false;
    return;
  }
  if (msg.type !== "start") return;
  running = true;
  void loop(msg);
};

async function loop(msg: StartMsg): Promise<void> {
  const header = { ...msg.header };
  let nonce = BigInt(msg.workerId) * 1_000_000_000_000n + BigInt(Date.now() % 1_000_000);
  let hashes = 0;
  let last = performance.now();
  const batch = 400;
  const pauseEvery = Math.max(1, Math.round(batch / Math.max(0.05, Math.min(1, msg.duty))));

  while (running) {
    for (let i = 0; i < batch; i++) {
      header.nonce = nonce.toString();
      const hash = blake3Hex(serializeHeader(header));
      hashes++;
      if (hashMeetsTarget(hash, header.bits)) {
        running = false;
        self.postMessage({ type: "found", header, hash, hashes });
        return;
      }
      nonce++;
    }
    const now = performance.now();
    if (now - last >= 1000) {
      self.postMessage({ type: "stat", hashes, ms: now - last });
      hashes = 0;
      last = now;
    }
    if (msg.duty < 0.99) await sleep(Math.round((1 - msg.duty) * 8));
    else if (hashes % pauseEvery === 0) await sleep(0);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
