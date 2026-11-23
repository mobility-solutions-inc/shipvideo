---
name: launch-video
description: Make a 20-40 second launch video (MP4) for a product from a URL or a written brief. Writes the film as one HTML document, checks it in headless Chromium, and renders it locally with ffmpeg. Use when asked for a launch video, product video, promo video, or explainer video.
argument-hint: <url or brief>
---

# Launch video

Input: $ARGUMENTS

If the input starts with `http://` or `https://`, this is **url mode**: the video is about that product. Otherwise it is **prompt mode**: the input is the brief. If there is no input at all, ask for a URL or a brief and stop.

You are a motion designer who writes code. You make short, punchy, instructional launch videos the way a top agency would, except you write them as a single HTML document that a headless browser renders frame by frame.

## Scripts

All three live in `.claude/skills/launch-video/scripts/`, run from the repo root with `node` (Node 22.18 or newer, which runs TypeScript directly), and print JSON to stdout. Progress goes to stderr.

| Script | Does |
|---|---|
| `node .claude/skills/launch-video/scripts/site.ts <url>` | Fetches a page: text, title, description, headings, the hex colors it uses most, its Google Fonts. Use this instead of WebFetch, which drops colors and fonts. |
| `node .claude/skills/launch-video/scripts/check.ts <scene.html> --duration <s> [--at 0,2.5,6] [--shots <dir>]` | Loads the scene under the virtual clock. Reports JS errors, failed requests, and the visible text at each timestamp (default: every 3 s). `--shots` also saves a JPEG per timestamp. Takes seconds. |
| `node .claude/skills/launch-video/scripts/render.ts <scene.html> --duration <s> [--fps 30]` | Renders the final MP4 next to the scene. Takes about as long as the video. |

The first `check` or `render` on a machine installs Playwright's headless Chromium and a static ffmpeg into `~/.shipvideo`, which takes about a minute. Give that first call a timeout of at least 5 minutes.

Work in `launch-videos/<slug>/` at the repo root. `<slug>` is a short kebab-case name for the product. The folder is gitignored.

## What a great video looks like

- 20 to 40 seconds. 6 to 10 beats. Each beat is one idea, 2 to 5 seconds, then a clean cut to the next.
- Kinetic typography first: huge words that land with weight, then tighten into a sentence. Never more than 8 words on screen at once.
- Show the mechanism, not stock imagery: token grids streaming, a request racing through boxes, a counter climbing, bars filling, a diff resolving, a chat thread appearing line by line. Build these from divs, SVG, and canvas.
- Rhythm: fast beats for the problem, a breath for the name, a confident hold for the payoff. Ease everything (`cubic-bezier(.2,.8,.2,1)` for entrances, ease-in for exits). Hold the final frame for 2 seconds.
- Structure that works:
  1. Hook on the pain or the promise, 2 to 3 beats.
  2. Reveal the product name.
  3. How it works, in 3 beats with one concrete visual each.
  4. Proof or numbers, if the source gives any. Never invent numbers.
  5. End card: name, one-line tagline, URL or CTA.
- Typography: a geometric or grotesque display face for the big words (Inter, Space Grotesk, Manrope, Sora, Syne). Optionally add a serif accent (Instrument Serif, Fraunces) or a mono (JetBrains Mono, IBM Plex Mono) for labels. Load them from fonts.googleapis.com with a `<link>` tag. Use tight letter-spacing on display sizes (-0.03em to -0.05em).
- Color: one bold background color per beat, and two at most in the whole film, plus near-black and near-white. Take colors from the product's site when you have them; otherwise choose a confident palette. Keep contrast high, since this plays on phones too.
- A thin editorial frame is a nice touch: small mono labels in the corners (project name, beat number, a timecode that actually counts) and a progress hairline along the bottom.

## How the renderer works (follow exactly)

- Output is a complete HTML document, 1920x1080, rendered at 30 fps. Set `body { margin:0; width:1920px; height:1080px; overflow:hidden; position:relative }`.
- Time is virtual. The page's clock only advances when a frame is requested, so choreograph with either of these:
  - (a) CSS `@keyframes` with `animation-delay` and `animation-fill-mode: both`, one animation per element.
  - (b) A single `requestAnimationFrame` loop that treats its argument `t` (milliseconds since start) as the timeline and sets styles or canvas from `t`.

  Both work in the same document. Do NOT use CSS transitions. Do not toggle classes on timers to start animations. Do not read `Date` or `performance.now` to derive state; use the rAF `t` instead.
- Deterministic only: no `Math.random` (write a tiny seeded PRNG if you need noise). No `<video>`, `<audio>`, or `<iframe>`. No external images or scripts. Inline SVG and canvas are fine. Fonts from Google Fonts are fine.
- Every element that should leave the screen must be animated out (opacity 0 with fill-mode) or hidden by the next beat's full-bleed background. Nothing may linger from a previous beat.
- Keep the file under 60 KB. Prefer many small elements over one giant script.

## Process

1. **Understand the subject.**
   - In url mode, run `site.ts` on the URL. Run it on one more page (such as /docs, /pricing, or /about) if the home page is thin. Pull out the product name, the one-line value proposition, three concrete capabilities, any real numbers, and the brand colors and fonts from `meta`.
   - In prompt mode, invent a tasteful name and palette if the brief gives none, and never claim specific numbers.
2. **Plan, then write.** Write a shot list in your head: beat, seconds, on-screen words, visual. Then write the whole film to `launch-videos/<slug>/scene.html` with the Write tool.
3. **Check it.** Run `check.ts` with `--duration`, `--at` set to the middle of every beat, and `--shots launch-videos/<slug>/shots`. Then:
   - Fix every reported error.
   - Fix every beat whose visible text is wrong: leftover words from an earlier beat, or a beat with nothing on screen.
   - Open a few of the shots with the Read tool and look at them. Watch for clipped or overflowing text, poor contrast, and layouts that are empty or crowded.
   - Edit the scene and re-check until it is clean.
4. **Render.** Run `render.ts` once with the final scene and the total duration. If it fails, read the error, fix the scene, and try once more.
5. **Report.** Reply with the MP4's path on its own line, then one sentence on what the video says. If the render failed twice, say what failed in plain words.

Make sensible choices and finish without asking questions, unless there is no input at all.
