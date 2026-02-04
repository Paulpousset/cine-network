import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

async function capture() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // Mobile size iPhone 14
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const outputDir = path.join(process.cwd(), "assets/images/screenshots");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log("Capturing Landing Page...");
  await page.goto("http://localhost:8081");
  await page.waitForTimeout(2000); // Wait for animations
  await page.screenshot({ path: path.join(outputDir, "landing.png") });

  console.log("Capturing Auth Page...");
  await page.goto("http://localhost:8081/auth");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, "auth.png") });

  console.log("Capturing Feature Modals...");
  await page.goto("http://localhost:8081");
  await page.waitForTimeout(1000);

  // Click on first feature to open modal
  await page.click("text=Gestion de Projets");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outputDir, "feature_projects.png") });

  await browser.close();
  console.log("Screenshots saved to assets/images/screenshots/");
}

capture().catch(console.error);
