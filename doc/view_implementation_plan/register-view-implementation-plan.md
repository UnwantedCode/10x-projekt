# Plan implementacji widoku Rejestracji

## 1. Przegląd

Widok rejestracji umożliwia nowym użytkownikom utworzenie konta w aplikacji AI Task Manager. Jest to publiczna strona dostępna bez uwierzytelnienia, zawierająca formularz rejestracji z polami email, hasło i potwierdzenie hasła, checkbox akceptacji regulaminu oraz wskaźnik siły hasła. Po pomyślnej rejestracji użytkownik jest przekierowywany do strony logowania z komunikatem o sukcesie.

## 2. Routing widoku

- **Ścieżka**: `/register`
- **Dostęp**: Publiczny (nie wymaga uwierzytelnienia)
- **Plik**: `src/pages/register.astro`

## 3. Struktura komponentów

```
RegisterPage (src/pages/register.astro)
└── AuthLayout (src/layouts/AuthLayout.astro)
    └── RegisterForm (src/components/auth/RegisterForm.tsx) [React, client:load]
        ├── Logo (src/components/ui/Logo.astro lub inline)
        ├── Input (email) - shadcn/ui
        ├── Input (password) - shadcn/ui
        ├── PasswordStrengthIndicator (src/components/auth/PasswordStrengthIndicator.tsx)
        ├── Input (confirmPassword) - shadcn/ui
        ├── Checkbox (terms) - shadcn/ui
        ├── Button (submit) - shadcn/ui
        └── Link do /login
```

## 4. Szczegóły komponentów

### 4.1 AuthLayout

- **Plik**: `src/layouts/AuthLayout.astro`
- **Opis**: Minimalny layout Astro przeznaczony dla stron uwierzytelniania (logowanie, rejestracja). Wyświetla wycentrowaną zawartość na pełnej wysokości ekranu z neutralnym tłem.
- **Główne elementy**:
  - Kontener `<main>` z klasami Tailwind do centrowania: `min-h-screen flex items-center justify-center bg-background`
  - Karta/kontener formularza z ograniczoną szerokością: `w-full max-w-md p-8`
  - Slot dla zawartości strony
- **Propsy**:
  ```typescript
  interface Props {
    title?: string;
  }
  ```

### 4.2 RegisterForm

- **Plik**: `src/components/auth/RegisterForm.tsx`
- **Opis**: Interaktywny komponent React obsługujący formularz rejestracji z walidacją w czasie rzeczywistym, wskaźnikiem siły hasła i integracją z Supabase Auth.
- **Główne elementy**:
  - Logo aplikacji (element `<img>` lub komponent SVG)
  - Nagłówek formularza (`<h1>`) z tekstem "Utwórz konto"
  - Pole email (`<Input type="email">`)
  - Pole hasła (`<Input type="password">`)
  - Komponent `PasswordStrengthIndicator`
  - Pole potwierdzenia hasła (`<Input type="password">`)
  - Checkbox akceptacji regulaminu z linkiem do regulaminu
  - Przycisk "Zarejestruj" (`<Button>`)
  - Link do strony logowania
  - Obszar komunikatów błędów (alert)
- **Obsługiwane interakcje**:
  - `onChange` na polach formularza - aktualizacja stanu i walidacja
  - `onBlur` na polach - walidacja pola przy utracie focusu
  - `onSubmit` formularza - wysłanie danych do Supabase
  - `onClick` na linku do regulaminu
- **Obsługiwana walidacja**:
  - Email: wymagany, poprawny format (regex)
  - Hasło: wymagane, minimum 8 znaków
  - Potwierdzenie hasła: wymagane, musi być identyczne z hasłem
  - Checkbox regulaminu: wymagany (musi być zaznaczony)
- **Typy**:
  - `RegisterFormData` - stan formularza
  - `RegisterFormErrors` - błędy walidacji
  - `PasswordStrength` - poziom siły hasła
- **Propsy**: Brak (komponent samodzielny)

### 4.3 PasswordStrengthIndicator

- **Plik**: `src/components/auth/PasswordStrengthIndicator.tsx`
- **Opis**: Komponent wizualny wyświetlający siłę hasła w formie paska postępu z kolorowym wskaźnikiem i etykietą tekstową.
- **Główne elementy**:
  - Kontener z paskami siły (4 segmenty)
  - Etykieta tekstowa opisująca siłę hasła
- **Obsługiwane interakcje**: Brak (komponent prezentacyjny)
- **Obsługiwana walidacja**: Brak
- **Typy**:
  - `PasswordStrength` - enum/union type dla poziomów siły
- **Propsy**:
  ```typescript
  interface PasswordStrengthIndicatorProps {
    password: string;
  }
  ```

### 4.4 Komponenty Shadcn/ui do dodania

Przed implementacją należy dodać następujące komponenty z biblioteki shadcn/ui:
- `Input` - pole tekstowe
- `Checkbox` - pole wyboru
- `Label` - etykieta pola
- `Alert` / `AlertDescription` - komunikaty błędów (opcjonalnie)
- `Card` / `CardHeader` / `CardContent` - kontener formularza (opcjonalnie)

## 5. Typy

### 5.1 RegisterFormData (ViewModel)

```typescript
interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
}
```

### 5.2 RegisterFormErrors (ViewModel)

```typescript
interface RegisterFormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptedTerms?: string;
  general?: string; // błędy ogólne (np. z API)
}
```

### 5.3 PasswordStrength (ViewModel)

```typescript
type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-4
  label: string; // "Słabe", "Przeciętne", "Dobre", "Silne"
}
```

### 5.4 RegisterState (ViewModel)

```typescript
interface RegisterState {
  formData: RegisterFormData;
  errors: RegisterFormErrors;
  isSubmitting: boolean;
  isSuccess: boolean;
}
```

## 6. Zarządzanie stanem

### 6.1 Stan lokalny komponentu RegisterForm

Stan formularza będzie zarządzany lokalnie w komponencie `RegisterForm` przy użyciu hooków React:

```typescript
const [formData, setFormData] = useState<RegisterFormData>({
  email: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
});

const [errors, setErrors] = useState<RegisterFormErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

### 6.2 Custom Hook: usePasswordStrength

```typescript
// src/components/hooks/usePasswordStrength.ts
function usePasswordStrength(password: string): PasswordStrengthResult {
  // Oblicza siłę hasła na podstawie:
  // - długości
  // - obecności małych/wielkich liter
  // - obecności cyfr
  // - obecności znaków specjalnych
}
```

### 6.3 Custom Hook: useRegisterForm (opcjonalnie)

Jeśli logika formularza stanie się zbyt złożona, można wyekstrahować ją do osobnego hooka:

```typescript
// src/components/hooks/useRegisterForm.ts
function useRegisterForm() {
  // Zarządza stanem formularza
  // Obsługuje walidację
  // Obsługuje submit
  return { formData, errors, isSubmitting, handleChange, handleSubmit };
}
```

## 7. Integracja API

### 7.1 Supabase Auth SDK

Rejestracja wykorzystuje metodę `signUp()` z Supabase Auth SDK:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

// W komponencie RegisterForm
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) return;

  setIsSubmitting(true);
  setErrors({});

  try {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (error) {
      // Obsługa błędów Supabase
      setErrors({ general: mapSupabaseError(error) });
      return;
    }

    // Sukces - przekierowanie do logowania
    window.location.href = '/login?registered=true';
  } catch (err) {
    setErrors({ general: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.' });
  } finally {
    setIsSubmitting(false);
  }
};
```

### 7.2 Klient Supabase dla komponentów klienckich

Należy utworzyć osobny klient Supabase dla komponentów React działających po stronie klienta:

```typescript
// src/db/supabase.browser.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabaseBrowser = createClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);
```

### 7.3 Typy żądania i odpowiedzi

**Żądanie (signUp)**:
```typescript
{
  email: string;
  password: string;
}
```

**Odpowiedź sukcesu**:
```typescript
{
  data: {
    user: User | null;
    session: Session | null;
  };
  error: null;
}
```

**Odpowiedź błędu**:
```typescript
{
  data: { user: null; session: null };
  error: AuthError;
}
```

## 8. Interakcje użytkownika

| Interakcja | Element | Oczekiwany rezultat |
|------------|---------|---------------------|
| Wpisanie email | Input email | Aktualizacja stanu, walidacja formatu przy blur |
| Wpisanie hasła | Input password | Aktualizacja stanu, aktualizacja wskaźnika siły |
| Wpisanie potwierdzenia | Input confirmPassword | Aktualizacja stanu, walidacja zgodności w czasie rzeczywistym |
| Zaznaczenie checkbox | Checkbox terms | Aktualizacja stanu acceptedTerms |
| Kliknięcie "Zarejestruj" | Button submit | Walidacja formularza, wywołanie API, obsługa wyniku |
| Kliknięcie linku logowania | Link | Przekierowanie do /login |
| Kliknięcie linku regulaminu | Link | Otwarcie regulaminu (nowa karta lub modal) |

## 9. Warunki i walidacja

### 9.1 Walidacja email

| Warunek | Komunikat błędu | Moment walidacji |
|---------|-----------------|------------------|
| Pole puste | "Email jest wymagany" | onBlur, onSubmit |
| Niepoprawny format | "Podaj poprawny adres email" | onBlur, onSubmit |

**Regex walidacji**: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### 9.2 Walidacja hasła

| Warunek | Komunikat błędu | Moment walidacji |
|---------|-----------------|------------------|
| Pole puste | "Hasło jest wymagane" | onBlur, onSubmit |
| Mniej niż 8 znaków | "Hasło musi mieć minimum 8 znaków" | onChange, onSubmit |

### 9.3 Walidacja potwierdzenia hasła

| Warunek | Komunikat błędu | Moment walidacji |
|---------|-----------------|------------------|
| Pole puste | "Potwierdzenie hasła jest wymagane" | onBlur, onSubmit |
| Niezgodność z hasłem | "Hasła muszą być identyczne" | onChange (real-time), onSubmit |

### 9.4 Walidacja akceptacji regulaminu

| Warunek | Komunikat błędu | Moment walidacji |
|---------|-----------------|------------------|
| Niezaznaczony | "Musisz zaakceptować regulamin" | onSubmit |

### 9.5 Funkcja walidacji

```typescript
function validateForm(formData: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  // Email
  if (!formData.email.trim()) {
    errors.email = 'Email jest wymagany';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = 'Podaj poprawny adres email';
  }

  // Password
  if (!formData.password) {
    errors.password = 'Hasło jest wymagane';
  } else if (formData.password.length < 8) {
    errors.password = 'Hasło musi mieć minimum 8 znaków';
  }

  // Confirm password
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Potwierdzenie hasła jest wymagane';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Hasła muszą być identyczne';
  }

  // Terms
  if (!formData.acceptedTerms) {
    errors.acceptedTerms = 'Musisz zaakceptować regulamin';
  }

  return errors;
}
```

## 10. Obsługa błędów

### 10.1 Błędy walidacji formularza

- Wyświetlane bezpośrednio pod odpowiednim polem formularza
- Czerwony kolor tekstu i obramowania pola
- Ikona błędu (opcjonalnie)
- Focus na pierwszym polu z błędem po nieudanej walidacji

### 10.2 Błędy Supabase Auth

| Kod błędu Supabase | Komunikat dla użytkownika |
|--------------------|---------------------------|
| `user_already_exists` | "Konto z tym adresem email już istnieje" |
| `invalid_email` | "Podany adres email jest nieprawidłowy" |
| `weak_password` | "Hasło jest zbyt słabe" |
| `signup_disabled` | "Rejestracja jest obecnie wyłączona" |
| (inne) | "Wystąpił błąd podczas rejestracji. Spróbuj ponownie." |

```typescript
function mapSupabaseError(error: AuthError): string {
  switch (error.message) {
    case 'User already registered':
      return 'Konto z tym adresem email już istnieje';
    case 'Invalid email':
      return 'Podany adres email jest nieprawidłowy';
    case 'Password should be at least 6 characters':
      return 'Hasło jest zbyt słabe';
    case 'Signups not allowed for this instance':
      return 'Rejestracja jest obecnie wyłączona';
    default:
      return 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.';
  }
}
```

### 10.3 Błędy sieciowe

- Wyświetlany komunikat: "Brak połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie."
- Przycisk "Spróbuj ponownie" pozostaje aktywny
- Dane formularza nie są czyszczone

### 10.4 Obsługa stanu ładowania

- Przycisk "Zarejestruj" wyświetla spinner i tekst "Rejestrowanie..."
- Wszystkie pola formularza są zablokowane (disabled)
- Zapobieganie wielokrotnemu wysłaniu formularza

## 11. Kroki implementacji

### Krok 1: Dodanie komponentów Shadcn/ui

```bash
npx shadcn@latest add input
npx shadcn@latest add checkbox
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add alert
```

### Krok 2: Utworzenie klienta Supabase dla przeglądarki

Utworzyć plik `src/db/supabase.browser.ts` z klientem Supabase używającym zmiennych `PUBLIC_*`:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### Krok 3: Utworzenie AuthLayout

Utworzyć plik `src/layouts/AuthLayout.astro` z minimalnym layoutem do stron uwierzytelniania.

### Krok 4: Utworzenie hooka usePasswordStrength

Utworzyć plik `src/components/hooks/usePasswordStrength.ts` z logiką obliczania siły hasła.

### Krok 5: Utworzenie komponentu PasswordStrengthIndicator

Utworzyć plik `src/components/auth/PasswordStrengthIndicator.tsx` z wizualnym wskaźnikiem siły hasła.

### Krok 6: Utworzenie komponentu RegisterForm

Utworzyć plik `src/components/auth/RegisterForm.tsx` z pełną implementacją formularza rejestracji:
- Stan formularza
- Walidacja
- Integracja z Supabase
- Obsługa błędów
- Wskaźnik siły hasła

### Krok 7: Utworzenie strony rejestracji

Utworzyć plik `src/pages/register.astro` używający AuthLayout i osadzający RegisterForm z dyrektywą `client:load`.

### Krok 8: Aktualizacja zmiennych środowiskowych

Upewnić się, że zmienne `PUBLIC_SUPABASE_URL` i `PUBLIC_SUPABASE_ANON_KEY` są zdefiniowane w `.env` i `src/env.d.ts`.

### Krok 9: Dodanie przekierowania po rejestracji

Zaktualizować stronę logowania, aby obsługiwała parametr `?registered=true` i wyświetlała komunikat o pomyślnej rejestracji.

### Krok 10: Testowanie

- Testy manualne wszystkich scenariuszy walidacji
- Testy integracyjne z Supabase (środowisko development)
- Testy dostępności (nawigacja klawiaturą, screen reader)
- Testy responsywności (mobile, tablet, desktop)

### Krok 11: Stylowanie i dopracowanie

- Dopasowanie stylów do design systemu aplikacji
- Dodanie animacji i mikrointerakcji (opcjonalnie)
- Optymalizacja dla różnych rozdzielczości ekranu