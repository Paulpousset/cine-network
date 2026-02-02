import { expect, test } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should login as Guest and navigate to projects", async ({ page }) => {
    await page.goto("/");

    // Click on guest login
    // Using a more flexible selector for the Guest button
    await page.getByText("Invité").click();

    // After guest login, it should redirect to /my-projects
    // We wait for the URL to contain 'my-projects'
    await expect(page).toHaveURL(/.*my-projects/);

    // Verify we are on the projects page
    // Using "Mes Projets" which is more likely to match the header or sidebar
    await expect(page.getByText("Mes Projets")).toBeVisible();
  });

  test("should be able to logout from account page", async ({ page }) => {
    // First, login as guest
    await page.goto("/");
    await page.getByText("Invité").click();
    await expect(page).toHaveURL(/.*my-projects/);

    // Navigate to account page (usually via sidebar or direct URL for test)
    // Let's try direct navigation for robustness in tests
    await page.goto("/account");

    // Find and click logout button
    await page.getByText("Se déconnecter").click();

    // Should be back at the landing page
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByText("Heureux de vous revoir sur Tita"),
    ).toBeVisible();
  });
});
