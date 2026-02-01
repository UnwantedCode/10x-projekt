/* eslint-disable react-hooks/rules-of-hooks -- Playwright's use() is not a React Hook */
import { test as base } from "@playwright/test";
import { LoginPage, RegisterPage } from "../pages";

/**
 * Custom test fixture that provides Page Objects
 * @see https://playwright.dev/docs/test-fixtures
 */
interface AuthFixtures {
  loginPage: LoginPage;
  registerPage: RegisterPage;
}

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await use(registerPage);
  },
});

export { expect } from "@playwright/test";
