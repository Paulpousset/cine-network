const { chromium } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const outputDir = path.join(process.cwd(), "assets/images/screenshots");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Capturing Landing Page...");
  try {
    await page.goto("http://localhost:8081", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, "landing.png") });

    console.log("Navigating to Auth Page...");
    await page.goto("http://localhost:8081/auth", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, "auth.png") });

    console.log("Logging in as Guest...");
    // Click Guest button
    await page.click("text=Invité");
    await page.waitForTimeout(4000); // Wait for login and redirect to feed

    console.log("Capturing Feed (Tabs)...");
    await page.screenshot({ path: path.join(outputDir, "feed.png") });

    console.log("Capturing Network...");
    await page.goto("http://localhost:8081/network", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, "network.png") });

    console.log("Capturing Projects...");
    await page.goto("http://localhost:8081/project", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, "projects.png") });

    console.log("Capturing Direct Messages...");
    await page.goto("http://localhost:8081/direct-messages", {
      waitUntil: "networkidle",
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(outputDir, "messages.png") });

    console.log("Screenshots saved to assets/images/screenshots/");
  } catch (e) {
    console.error("Error capturing:", e.message);
    console.log("Make sure http://localhost:8081 is running!");
  } finally {
    await browser.close();
  }
}

capture();
