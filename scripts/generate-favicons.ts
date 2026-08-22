import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import path from "node:path";

/**
 * Renders scripts/favicon-source.html (the Ascent mark: summit + survey flag
 * on a basalt badge) to crisp PNGs at several sizes, then hand-builds a
 * single-image PNG-ICO container for legacy favicon.ico support. No image
 * libraries needed — the SVG scales losslessly via Playwright's Chromium.
 */

const ROOT = path.resolve(__dirname, "..");
const SOURCE = path.join(ROOT, "scripts/favicon-source.html");

async function renderPng(size: number): Promise<Buffer> {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.goto(`file://${SOURCE}`);
  await page.evaluate((s) => {
    const svg = document.getElementById("icon")!;
    svg.setAttribute("width", String(s));
    svg.setAttribute("height", String(s));
  }, size);
  const el = await page.$("#icon");
  const buf = await el!.screenshot({ omitBackground: true });
  await browser.close();
  return buf;
}

/** Minimal single-image "PNG ICO": standard ICO header/dir entry wrapping a PNG payload. */
function buildIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // image count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // color palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image data size
  entry.writeUInt32LE(6 + 16, 12); // offset of image data

  return Buffer.concat([header, entry, png]);
}

async function main() {
  const png32 = await renderPng(32);
  const png180 = await renderPng(180);
  const png512 = await renderPng(512);

  writeFileSync(path.join(ROOT, "app/icon.png"), png512);
  writeFileSync(path.join(ROOT, "app/apple-icon.png"), png180);
  writeFileSync(path.join(ROOT, "app/favicon.ico"), buildIco(png32, 32));

  console.log("Wrote app/icon.png (512x512), app/apple-icon.png (180x180), app/favicon.ico (32x32).");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
