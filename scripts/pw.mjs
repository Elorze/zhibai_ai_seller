import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { chromium } = require("D:/deps/playwright-runner/node_modules/playwright");

const executablePath =
  process.env.PW_CHROME_PATH ||
  "D:/ms-playwright/chromium-1243/chrome-win64/chrome.exe";

export async function launchBrowser() {
  return chromium.launch({ headless: true, executablePath });
}
