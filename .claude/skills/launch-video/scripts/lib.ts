// Shared helpers for the launch-video skill's scripts. The rendering itself
// (virtual clock, headless Chromium, ffmpeg) comes from the OpenComputer
// agent's renderer so both paths produce identical films; that module has no
// OpenComputer dependency.
import { readFile } from "node:fs/promises";

export * from "../../../../opencomputer/agents/director/tools/renderer.ts";

export const MAX_SECONDS = 90;

export function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const [key, inline] = arg.slice(2).split("=", 2);
      if (inline !== undefined) flags[key] = inline;
      else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) flags[key] = argv[++i];
      else flags[key] = "true";
    } else positional.push(arg);
  }
  return { positional, flags };
}

// Same rules the agent's tools enforce before loading a scene.
export async function readScene(path: string): Promise<string> {
  const html = await readFile(path, "utf8");
  if (html.length < 200) throw new Error("html is too short to be a scene.");
  if (!/<html[\s>]/i.test(html) && !/<body[\s>]/i.test(html)) throw new Error("html must be a complete document (include <html> and <body>).");
  if (/<(video|audio|iframe)[\s>]/i.test(html)) throw new Error("Scenes cannot use <video>, <audio>, or <iframe>; draw everything with HTML, CSS, SVG, and canvas.");
  return html;
}

export function log(message: string): void {
  process.stderr.write(`${message}\n`);
}

// Print the result and exit. The renderer keeps a shared Chromium open, so the
// process has to exit explicitly; wait for stdout to flush first (pipes are
// asynchronous on macOS and a bare process.exit can truncate the JSON).
export function finish(result: unknown, code = 0): void {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`, () => process.exit(code));
}

export function fail(error: unknown): void {
  finish({ ok: false, error: error instanceof Error ? error.message : String(error) }, 1);
}
