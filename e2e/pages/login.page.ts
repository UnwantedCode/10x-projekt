import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model for the Login Page
 * @see https://playwright.dev/docs/pom
 */
export class LoginPage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly emailNotConfirmedAlert: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Define locators using accessible selectors
    this.heading = page.getByRole("heading", { name: "Zaloguj się" });
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Hasło");
    this.submitButton = page.getByRole("button", { name: /zaloguj się/i });
    this.errorAlert = page.getByRole("alert");
    this.emailNotConfirmedAlert = page.getByText("Twoje konto wymaga aktywacji");
    this.forgotPasswordLink = page.getByRole("link", { name: "Zapomniałeś hasła?" });
    this.registerLink = page.getByRole("link", { name: "Zarejestruj się" });
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto("/login");
  }

  /**
   * Fill in the login form
   */
  async fillForm(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Perform a complete login action
   */
  async login(email: string, password: string) {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string | null> {
    const alert = this.errorAlert.first();
    if (await alert.isVisible()) {
      return await alert.textContent();
    }
    return null;
  }

  /**
   * Check if the submit button shows loading state
   */
  async isSubmitting(): Promise<boolean> {
    const buttonText = await this.submitButton.textContent();
    return buttonText?.includes("Logowanie...") ?? false;
  }
}
