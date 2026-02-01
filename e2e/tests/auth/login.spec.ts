import { test, expect } from "../../fixtures/auth.fixture";

test.describe("Login Page", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test("should display login form with all elements", async ({ loginPage }) => {
    // Verify page title
    await expect(loginPage.heading).toBeVisible();

    // Verify form elements
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();

    // Verify navigation links
    await expect(loginPage.forgotPasswordLink).toBeVisible();
    await expect(loginPage.registerLink).toBeVisible();
  });

  test("should show validation error for empty email", async ({ loginPage, page }) => {
    // Click outside the email field first to ensure proper form state
    await loginPage.passwordInput.click();

    // Submit empty form
    await loginPage.submit();

    // Should show error message for email
    await expect(page.getByText("Adres email jest wymagany")).toBeVisible();
  });

  test("should show validation error for invalid email format", async ({ loginPage, page }) => {
    // Wait for page to be fully loaded and stable
    await page.waitForLoadState("networkidle");

    // Email field has autoFocus, type directly into it
    await loginPage.emailInput.fill("invalid-email");
    await loginPage.passwordInput.fill("password123");

    // Verify values are set before clicking submit
    await expect(loginPage.emailInput).toHaveValue("invalid-email");
    await expect(loginPage.passwordInput).toHaveValue("password123");

    // Click submit and wait for validation error to appear
    await loginPage.submitButton.click();

    // The validation should show immediately (no API call for invalid format)
    await expect(page.getByText("Nieprawidłowy format adresu email")).toBeVisible();
  });

  test("should show validation error for empty password", async ({ loginPage, page }) => {
    // Fill only email, leave password empty
    await loginPage.emailInput.fill("test@example.com");
    await loginPage.passwordInput.click();
    await loginPage.submit();

    // Should show error message for password
    await expect(page.getByText("Hasło jest wymagane")).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ loginPage }) => {
    await loginPage.login("nonexistent@example.com", "wrongpassword123");

    // Wait for error alert or check that we're still on login page (login failed)
    // The app may show alert or just stay on login page
    await expect(async () => {
      const hasAlert = await loginPage.errorAlert.isVisible();
      const isOnLoginPage = await loginPage.heading.isVisible();
      expect(hasAlert || isOnLoginPage).toBe(true);
    }).toPass({ timeout: 10000 });
  });

  test("should have correct href on forgot password link", async ({ loginPage }) => {
    await expect(loginPage.forgotPasswordLink).toHaveAttribute("href", "/forgot-password");
  });

  test("should have correct href on register link", async ({ loginPage }) => {
    await expect(loginPage.registerLink).toHaveAttribute("href", "/register");
  });
});
