// Prints the HTML sources listed in a manifest to PDF files.
// Usage: node kb/render-pdf.js <work directory>
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const workDir = process.argv[2] ?? "artifacts/kb/_html";
const manifest = JSON.parse(await readFile(path.join(workDir, "manifest.json"), "utf8"));

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  for (const { html, pdf } of manifest) {
    await mkdir(path.dirname(pdf), { recursive: true });
    await page.goto(pathToFileURL(path.resolve(html)).href);
    await page.pdf({ path: pdf, format: "A4", margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" } });
  }
} finally {
  await browser.close();
}
console.log(`${manifest.length} PDF files written`);
