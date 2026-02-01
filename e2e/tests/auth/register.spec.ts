import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Register Page - Happy Path", () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test("should display registration form with all elements", async ({ registerPage }) => {
    // Verify page heading
    await expect(registerPage.heading).toBeVisible();

    // Verify form elements
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.termsCheckbox).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
    await expect(registerPage.submitButton).toBeEnabled();

    // Verify navigation links
    await expect(registerPage.loginLink).toBeVisible();
    await expect(registerPage.termsLink).toBeVisible();
    await expect(registerPage.privacyLink).toBeVisible();
  });

  test("should have correct href on login link", async ({ registerPage }) => {
    await expect(registerPage.loginLink).toHaveAttribute("href", "/login");
  });

  test("should have correct href on terms link", async ({ registerPage }) => {
    await expect(registerPage.termsLink).toHaveAttribute("href", "/terms");
    await expect(registerPage.termsLink).toHaveAttribute("target", "_blank");
  });

  test("should have correct href on privacy link", async ({ registerPage }) => {
    await expect(registerPage.privacyLink).toHaveAttribute("href", "/privacy");
    await expect(registerPage.privacyLink).toHaveAttribute("target", "_blank");
  });
});
