import { expect, test } from "@playwright/test";

test.describe("Tita Home Page", () => {
  test("should load the login page by default", async ({ page }) => {
    await page.goto("/");

    // Check if the greeting is visible
    // "Heureux de vous revoir sur Tita" is the login greeting
    await expect(
      page.getByText("Heureux de vous revoir sur Tita"),
    ).toBeVisible();

    // Check if login button is present
    const loginButton = page.getByText("Se connecter").first();
    await expect(loginButton).toBeVisible();
  });

  test("should allow switching between login and registration", async ({
    page,
  }) => {
    await page.goto("/");

    // Initially on login page
    await expect(
      page.getByText("Heureux de vous revoir sur Tita"),
    ).toBeVisible();

    // Click on "Créer un compte" to switch to signup
    // Note: It's a Text component wrapped in TouchableOpacity usually,
    // but Playwright can find it by text.
    await page.getByText("Créer un compte").click();

    // After switching, the greeting or role selection should be visible
    // "Je suis :" is a title in the registration section
    await expect(page.getByText("Je suis :")).toBeVisible();

    // Switch back to login
    await page.getByText("Se connecter").click();
    await expect(
      page.getByText("Heureux de vous revoir sur Tita"),
    ).toBeVisible();
  });

  test("should have guest login option", async ({ page }) => {
    await page.goto("/");

    // Guest login is handled by a button/touchable usually
    // Based on the code, it might be text or a button
    const guestButton = page.getByText("Invité", { exact: false });
    await expect(guestButton).toBeVisible();
  });
});
