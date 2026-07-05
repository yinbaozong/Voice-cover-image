import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tempDir = path.join(root, ".local-build");
const releaseDir = path.join(root, "local-html");
const outputFile = path.join(releaseDir, "Voice-Cover-Image.html");
const noteFile = path.join(releaseDir, "使用说明.txt");

const run = spawnSync(
  process.execPath,
  [path.join(root, "node_modules", "vite", "bin", "vite.js"), "build", "--outDir", tempDir, "--emptyOutDir"],
  { cwd: root, stdio: "inherit" },
);

if (run.status !== 0) {
  process.exit(run.status ?? 1);
}

const htmlPath = path.join(tempDir, "index.html");
const html = readFileSync(htmlPath, "utf8");

const cssMatch = html.match(/<link rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/);
const jsMatch = html.match(/<script type="module"[^>]+src="([^"]+)"[^>]*><\/script>/);

if (!cssMatch || !jsMatch) {
  throw new Error("Could not find built CSS or JS entry in index.html.");
}

const readBuiltAsset = (assetPath) => {
  const cleanPath = assetPath.replace(/^\.\//, "");
  return readFileSync(path.join(tempDir, cleanPath), "utf8");
};

let css = readBuiltAsset(cssMatch[1]);
let js = readBuiltAsset(jsMatch[1]);

css = css.replace(/url\((["']?)\.\.\/fonts\/([^)"']+)\1\)/g, (_match, _quote, fontName) => {
  const fontPath = path.join(tempDir, "fonts", fontName);
  const fontBase64 = readFileSync(fontPath).toString("base64");
  return `url(data:font/ttf;base64,${fontBase64})`;
});

js = js.replace(/(["'`])\.\/assets\/([^"'`]+\.(png|jpe?g|webp|gif|svg))\1/g, (_match, quote, assetName, extension) => {
  const assetPath = path.join(tempDir, "assets", assetName);
  const assetBase64 = readFileSync(assetPath).toString("base64");
  const mimeType = extension === "svg" ? "image/svg+xml" : `image/${extension === "jpg" ? "jpeg" : extension}`;
  return `${quote}data:${mimeType};base64,${assetBase64}${quote}`;
});

js = js.replace(
  /new URL\((["'])([^"']+\.(png|jpe?g|webp|gif|svg))\1,\s*import\.meta\.url\)\.href/g,
  (_match, quote, assetName, extension) => {
    const assetPath = path.join(tempDir, "assets", assetName);
    const assetBase64 = readFileSync(assetPath).toString("base64");
    const mimeType = extension === "svg" ? "image/svg+xml" : `image/${extension === "jpg" ? "jpeg" : extension}`;
    return `${quote}data:${mimeType};base64,${assetBase64}${quote}`;
  },
);

js = js.replace(/<\/script/gi, "<\\/script");

const singleHtml = html
  .replace(cssMatch[0], `<style>\n${css}\n</style>`)
  .replace(jsMatch[0], `<script type="module">\n${js}\n</script>`);

if (!existsSync(releaseDir)) {
  mkdirSync(releaseDir, { recursive: true });
}

writeFileSync(outputFile, singleHtml, "utf8");
writeFileSync(
  noteFile,
  [
    "Voice Cover Image 本地单文件版",
    "",
    "使用方式：",
    "1. 双击 Voice-Cover-Image.html。",
    "2. 在浏览器里上传照片和 Logo。",
    "3. 调整标题、蒙版、照片位置和调色参数。",
    "4. 点击右上角“导出 PNG”。",
    "",
    "说明：",
    "- 这个 HTML 已经内联了 JS、CSS 和字体。",
    "- 图片只在本地浏览器里处理，不会上传服务器。",
    "- 如果某个浏览器禁止 file:// 页面运行，请换 Chrome / Edge，或使用 npm run dev 启动开发版。",
    "",
  ].join("\n"),
  "utf8",
);

rmSync(tempDir, { recursive: true, force: true });

console.log(`Local single-file HTML generated:\n${outputFile}`);
