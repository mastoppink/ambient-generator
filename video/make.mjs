// Usage: npm run make            (uses the files in ./input)
//        npm run make -- --audio path/to/audio.mp3 --image path/to/bg.png --config path/to/video-config.json
//
// 1. Renders a short seamless loop (loopSeconds from the config) with Remotion.
// 2. Repeats that loop for the full audio length and adds the audio with ffmpeg (no re-encoding).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const dir = path.dirname(new URL(import.meta.url).pathname);
const input = path.join(dir, "input");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const find = (exts) => fs.existsSync(input)
  ? fs.readdirSync(input).filter((f) => exts.includes(path.extname(f).toLowerCase())).map((f) => path.join(input, f))[0]
  : undefined;

const audio = args.audio || find([".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"]);
const image = args.image || find([".png", ".jpg", ".jpeg", ".webp"]);
const configPath = args.config || find([".json"]);
const die = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };
if (!audio) die("Audio tidak ditemukan. Taruh file audio di video/input/ atau pakai --audio.");
if (!image) die("Gambar latar tidak ditemukan. Taruh gambar di video/input/ atau pakai --image.");

const config = configPath ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
const ext = path.extname(image).toLowerCase();
fs.mkdirSync(path.join(dir, "public"), { recursive: true });
fs.copyFileSync(image, path.join(dir, "public", "background" + ext));
const props = { ...config, image: "background" + ext };
if (!props.overlays) die("Config tidak punya 'overlays'. Unduh 'video-config.json' dari web generator.");

const outDir = path.join(dir, "out");
fs.mkdirSync(outDir, { recursive: true });
const propsFile = path.join(outDir, "props.json");
fs.writeFileSync(propsFile, JSON.stringify(props));

const bin = path.join(dir, "node_modules", ".bin", process.platform === "win32" ? "remotion.cmd" : "remotion");
const run = (a, opts = {}) => execFileSync(bin, a, { stdio: "inherit", cwd: dir, shell: process.platform === "win32", ...opts });

const seconds = parseFloat(
  execFileSync(bin, ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", audio],
    { cwd: dir, shell: process.platform === "win32" }).toString(),
);
console.log(`\n♪ Audio: ${path.basename(audio)} (${(seconds / 60).toFixed(1)} menit)`);
console.log(`▣ Gambar: ${path.basename(image)}`);
console.log(`↻ Render loop ${props.loopSeconds ?? 30} detik...\n`);

const loop = path.join(outDir, "loop.mp4");
const renderArgs = ["render", "src/index.jsx", "AmbientLoop", loop, `--props=${propsFile}`, "--codec=h264", "--crf=18", `--scale=${props.scale ?? 2}`];
if (process.env.BROWSER_EXECUTABLE) renderArgs.push(`--browser-executable=${process.env.BROWSER_EXECUTABLE}`);
run(renderArgs);

const name = path.basename(audio, path.extname(audio));
const final = path.join(outDir, `${name}.mp4`);
console.log(`\n⧉ Menggabungkan loop dengan audio...\n`);
run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-stream_loop", "-1", "-i", loop, "-i", audio,
  "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-t", String(seconds),
  "-movflags", "+faststart", final]);
console.log(`\n✔ Selesai: ${final}\n`);
