// src/browser.ts
var PRESETS = {
  desktop: { duty: 0.75, label: "Desktop \xB7 ~75% CPU" },
  laptop: { duty: 0.4, label: "Laptop \xB7 ~40% CPU" },
  phone: { duty: 0.15, label: "Phone \xB7 ~15% CPU" }
};
var qs = new URLSearchParams(location.search);
var nodeUrl = (qs.get("node") || window.NHC_NODE || "/api").replace(/\/$/, "");
var workerUrl = new URL("./miner-worker.js", import.meta.url).href;
var workers = [];
var hashAcc = 0;
var running = false;
function el(id) {
  const n = document.getElementById(id);
  if (!n) throw new Error(`#${id}`);
  return n;
}
function setStatus(s) {
  el("status").textContent = s;
}
function persistAddress(addr) {
  localStorage.setItem("nhc.payout", addr);
}
function loadAddress() {
  return localStorage.getItem("nhc.payout") || "";
}
async function fetchWork(payout) {
  const res = await fetch(`${nodeUrl}/work?payout=${encodeURIComponent(payout)}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `work ${res.status}`);
  return body;
}
async function submit(block) {
  const res = await fetch(`${nodeUrl}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ block })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `submit ${res.status}`);
  setStatus(`Accepted height ${body.height}`);
}
function stop() {
  running = false;
  for (const w of workers) {
    w.postMessage({ type: "stop" });
    w.terminate();
  }
  workers = [];
  el("start").disabled = false;
  el("stop").disabled = true;
}
async function start() {
  const payout = el("payout").value.trim();
  if (!/^nhc1[0-9a-f]{40}$/.test(payout)) {
    setStatus("Enter a valid nhc1\u2026 payout address (create one in the wallet).");
    return;
  }
  persistAddress(payout);
  const preset = el("preset").value;
  const duty = PRESETS[preset].duty;
  const cores = Math.max(1, Math.min(navigator.hardwareConcurrency || 2, 8));
  const n = Math.max(1, Math.round(cores * duty));
  running = true;
  el("start").disabled = true;
  el("stop").disabled = false;
  hashAcc = 0;
  const tick = () => {
    el("rate").textContent = `${(hashAcc / 1e6).toFixed(2)} MH/s`;
    hashAcc = 0;
    if (running) setTimeout(tick, 1e3);
  };
  tick();
  while (running) {
    try {
      setStatus(`Fetching work\u2026`);
      const work = await fetchWork(payout);
      setStatus(`Mining height ${work.height} (BLAKE3)`);
      const found = await mineOne(work, n, duty);
      if (!found || !running) break;
      await submit({ header: found.header, txs: work.block.txs });
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "miner error");
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
}
function mineOne(work, n, duty) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      for (const w of workers) {
        w.postMessage({ type: "stop" });
        w.terminate();
      }
      workers = [];
      resolve(v);
    };
    for (let i = 0; i < n; i++) {
      const w = new Worker(workerUrl, { type: "module" });
      w.onmessage = (ev) => {
        if (ev.data.type === "stat") hashAcc += ev.data.hashes || 0;
        if (ev.data.type === "found" && ev.data.header && ev.data.hash) {
          finish({ header: ev.data.header, hash: ev.data.hash });
        }
      };
      w.postMessage({ type: "start", header: work.block.header, duty, workerId: i });
      workers.push(w);
    }
  });
}
function boot() {
  el("payout").value = loadAddress();
  el("start").addEventListener("click", () => void start());
  el("stop").addEventListener("click", () => {
    stop();
    setStatus("Stopped.");
  });
  el("preset").addEventListener("change", () => {
    if (running) {
      stop();
      void start();
    }
  });
}
boot();
