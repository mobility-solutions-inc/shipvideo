// Usage: node check.ts <scene.html> [--duration 30] [--at 0,2.5,6,12] [--shots <dir>]
// Loads the scene under the renderer's virtual clock, seeks to each timestamp,
// and prints JS errors, failed requests, and the text visible at each moment.
// With --shots, also saves a JPEG of each timestamp so the frames can be
// looked at, not just read. Mirrors the agent's check_scene tool.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MAX_SECONDS, bootstrap, fail, finish, loadScene, log, parseArgs, readScene } from "./lib.ts";

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  if (!positional[0]) throw new Error("usage: node check.ts <scene.html> [--duration 30] [--at 0,2.5,6] [--shots <dir>]");
  const html = await readScene(positional[0]);
  const duration = Math.min(Number(flags.duration ?? 30), MAX_SECONDS);
  const stamps = flags.at
    ? flags.at.split(",").map(Number).filter((t) => Number.isFinite(t) && t >= 0 && t <= MAX_SECONDS)
    : Array.from({ length: Math.floor(duration / 3) + 1 }, (_, i) => i * 3);
  const shotsDir = flags.shots && flags.shots !== "true" ? flags.shots : null;
  if (shotsDir) await mkdir(shotsDir, { recursive: true });

  await bootstrap((step) => log(step));
  const scene = await loadScene(html);
  const frames: Array<{ t: number; visibleText: string; bodyBackground: string; shot?: string }> = [];
  try {
    for (const t of stamps) {
      await scene.page.evaluate((ms: number) => (window as any).__seek(ms), t * 1000);
      const snapshot = await scene.page.evaluate(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const texts: string[] = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const s = (n.textContent ?? "").replace(/\s+/g, " ").trim();
          if (!s) continue;
          const el = n.parentElement;
          if (!el) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue;
          texts.push(s.slice(0, 80));
        }
        return { visibleText: [...new Set(texts)].join(" | ").slice(0, 1200), bodyBackground: getComputedStyle(document.body).backgroundColor };
      });
      let shot: string | undefined;
      if (shotsDir) {
        shot = join(shotsDir, `t${t.toFixed(1).padStart(5, "0")}.jpg`);
        await writeFile(shot, await scene.page.screenshot({ type: "jpeg", quality: 70 }));
      }
      frames.push({ t, ...snapshot, ...(shot ? { shot } : {}) });
    }
  } finally {
    await scene.close();
  }
  finish({ ok: scene.errors.length === 0, errors: scene.errors.slice(0, 20), frames });
}

main().catch(fail);
