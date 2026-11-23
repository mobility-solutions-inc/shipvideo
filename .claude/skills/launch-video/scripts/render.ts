// Usage: node render.ts <scene.html> --duration 28 [--fps 30] [--out <file.mp4>]
// Renders the scene frame by frame under the virtual clock and encodes an
// H.264 MP4 (1920x1080, crf 18). Defaults to <scene dir>/<dir name>.mp4.
// Mirrors the agent's render_video tool, minus the /workspace copy.
import { mkdir, stat } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { MAX_SECONDS, bootstrap, fail, finish, log, parseArgs, readScene, renderMp4 } from "./lib.ts";

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  if (!positional[0] || !flags.duration) throw new Error("usage: node render.ts <scene.html> --duration 28 [--fps 30] [--out file.mp4]");
  const scenePath = resolve(positional[0]);
  const html = await readScene(scenePath);
  const durationSeconds = Number(flags.duration);
  if (!Number.isFinite(durationSeconds) || durationSeconds < 3 || durationSeconds > MAX_SECONDS) {
    throw new Error(`--duration must be between 3 and ${MAX_SECONDS} seconds.`);
  }
  const fps = flags.fps === "24" ? 24 : 30;
  const sceneDir = dirname(scenePath);
  const outPath = resolve(flags.out && flags.out !== "true" ? flags.out : join(sceneDir, `${basename(sceneDir)}.mp4`));
  await mkdir(dirname(outPath), { recursive: true });

  await bootstrap((step) => log(step));
  log(`rendering ${Math.round(durationSeconds * fps)} frames to ${outPath}`);
  const rendered = await renderMp4({
    html,
    durationSeconds,
    fps,
    outPath,
    onProgress: (frame, total) => log(`  frame ${frame}/${total}`),
  });
  const info = await stat(outPath);
  finish({
    ok: true,
    path: outPath,
    bytes: info.size,
    durationSeconds,
    fps,
    frames: rendered.frames,
    renderSeconds: Math.round(rendered.renderMs / 1000),
    errors: rendered.errors.slice(0, 20),
  });
}

main().catch(fail);
