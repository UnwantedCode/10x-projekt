import { test as base } from "@playwright/test";
import { LoginPage } from "../pages";

/**
 * Custom test fixture that provides Page Objects
 * @see https://playwright.dev/docs/test-fixtures
 */
type AuthFixtures = {
  loginPage: LoginPage;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
});

export { expect } from "@playwright/test";
