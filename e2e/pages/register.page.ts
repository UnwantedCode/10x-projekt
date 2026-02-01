import type { Locator, Page } from "@playwright/test";

/**
 * Page Object Model for the Register Page
 * @see https://playwright.dev/docs/pom
 */
export class RegisterPage {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly loginLink: Locator;
  readonly termsLink: Locator;
  readonly privacyLink: Locator;
  readonly passwordStrengthIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Define locators using accessible selectors
    this.heading = page.getByRole("heading", { name: "Utwórz konto" });
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Hasło", { exact: true });
    this.confirmPasswordInput = page.getByLabel("Potwierdź hasło");
    this.termsCheckbox = page.getByRole("checkbox");
    this.submitButton = page.getByRole("button", { name: /zarejestruj się/i });
    this.errorAlert = page.getByRole("alert");
    this.loginLink = page.getByRole("link", { name: "Zaloguj się" });
    this.termsLink = page.getByRole("link", { name: "regulamin" });
    this.privacyLink = page.getByRole("link", { name: "politykę prywatności" });
    this.passwordStrengthIndicator = page.getByText("Siła hasła:");
  }

  /**
   * Navigate to the register page
   */
  async goto() {
    await this.page.goto("/register");
  }

  /**
   * Fill in the registration form
   */
  async fillForm(email: string, password: string, confirmPassword?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
  }

  /**
   * Accept terms and conditions
   */
  async acceptTerms() {
    // Shadcn checkbox is a button, not a native checkbox - use click() instead of check()
    await this.termsCheckbox.click();
  }

  /**
   * Submit the registration form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Perform a complete registration action
   */
  async register(email: string, password: string, confirmPassword?: string) {
    await this.fillForm(email, password, confirmPassword);
    await this.acceptTerms();
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
    return buttonText?.includes("Rejestrowanie...") ?? false;
  }

  /**
   * Generate a unique test email
   */
  generateTestEmail(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `test-${timestamp}-${random}@example.com`;
  }
}
