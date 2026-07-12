import { chromium, type Browser } from "playwright";

export async function launchChromium(): Promise<Browser> {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Executable doesn't exist")) {
      throw new Error("Playwright Chromium 尚未安裝。請執行：npx playwright install chromium");
    }
    throw error;
  }
}

export async function waitForDeck(page: import("playwright").Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.renderComplete === "true", null, { timeout: 30_000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images);
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    })));
  });
}
