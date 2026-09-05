import { chromium } from "playwright";
import { copyFileSync, mkdirSync } from "node:fs";

const baseUrl = process.env.SENTINEL_URL ?? "http://127.0.0.1:3000";
const screenshotDir = "../docs/screenshots";
const videoDir = "../docs/demo";

mkdirSync(screenshotDir, { recursive: true });
mkdirSync(videoDir, { recursive: true });

const browser = await chromium.launch({ headless: true, slowMo: 500 });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 1000 } },
});
const page = await context.newPage();
const video = page.video();

async function pause() {
  await page.waitForTimeout(1000);
}

async function capture(name) {
  await page.screenshot({ path: `${screenshotDir}/${name}`, fullPage: true });
}

await page.goto(baseUrl, { waitUntil: "networkidle" });
await page.getByText("Transactions monitored").waitFor();
await pause();
await capture("01-overview-baseline.png");

await page.locator("select").first().selectOption("mixed");
await page.waitForTimeout(1800);
await pause();
await capture("02-overview-mixed-risk.png");

await page.goto(`${baseUrl}/ingest`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Mixed review queue/i }).click();
await page.getByText("transactions ready").waitFor();
await page.getByRole("button", { name: /Score selected data/i }).click();
await page.getByText("Scoring summary").waitFor();
await pause();
await capture("03-upload-data.png");

await page.goto(`${baseUrl}/investigations`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Run fraud risk assessment/i }).click();
await page.getByText("Supporting review signals").waitFor();
await pause();
await capture("04-investigation-score.png");

await page.getByRole("button", { name: /Generate brief/i }).click();
await page.getByText(/Recommended next step/i).waitFor({ timeout: 120000 });
await pause();
await capture("05-ai-investigator-brief.png");

await page.getByRole("button", { name: /Create investigation case/i }).click();
await page.getByText("OPEN").waitFor();
await page.getByRole("button", { name: "Escalate" }).click();
await page.getByText("ESCALATED").waitFor();
await pause();
await capture("06-case-audit-workflow.png");

await page.goto(`${baseUrl}/governance`, { waitUntil: "networkidle" });
await page.getByText("Held-out test confusion matrix").waitFor();
await pause();
await capture("07-model-governance.png");

await context.close();
await browser.close();

if (video) {
  copyFileSync(await video.path(), `${videoDir}/sentinel-demo.webm`);
}

console.log("Screenshots and slow demo video created.");
