# Plan implementacji widoku logowania

## 1. Przegląd

Widok logowania (`/login`) to publiczna strona umożliwiająca użytkownikowi uwierzytelnienie się w aplikacji AI Task Manager. Strona zawiera minimalny layout z wycentrowanym formularzem logowania, obsługującym pola email i hasło. Po pomyślnym zalogowaniu użytkownik jest przekierowywany do głównego widoku aplikacji z listami zadań. Widok implementuje najlepsze praktyki UX (autofocus, walidacja on-blur) oraz bezpieczeństwa (zapobieganie enumeracji użytkowników, maskowanie hasła).

## 2. Routing widoku

- **Ścieżka**: `/login`
- **Typ dostępu**: Publiczny (nieautoryzowany)
- **Plik**: `src/pages/login.astro`
- **Przekierowania**:
  - Zalogowany użytkownik odwiedzający `/login` → przekierowanie do `/dashboard`
  - Niezalogowany użytkownik próbujący dostępu do chronionych stron → przekierowanie do `/login`

## 3. Struktura komponentów

```
src/pages/login.astro (Strona Astro)
└── AuthLayout.astro (Layout)
    └── LoginForm.tsx (React, client:load)
        ├── Logo
        ├── FormTitle
        ├── EmailField
        │   ├── Label
        │   └── Input (shadcn/ui)
        ├── PasswordField
        │   ├── Label
        │   └── Input (shadcn/ui)
        ├── Alert (shadcn/ui, warunkowy - przy błędzie)
        ├── Button (shadcn/ui, submit)
        ├── Link → /register
        └── Link → /forgot-password
```

## 4. Szczegóły komponentów

### 4.1. LoginPage (`src/pages/login.astro`)

- **Opis**: Strona Astro hostująca formularz logowania. Sprawdza, czy użytkownik jest już zalogowany i ewentualnie przekierowuje do dashboardu.
- **Główne elementy**:
  - Import i użycie `AuthLayout`
  - Renderowanie komponentu `LoginForm` z dyrektywą `client:load`
  - Sprawdzenie sesji w frontmatter i przekierowanie
- **Obsługiwane interakcje**: Brak (statyczna strona)
- **Obsługiwana walidacja**: Weryfikacja sesji przed renderowaniem
- **Typy**: Brak
- **Propsy**: Brak

### 4.2. AuthLayout (`src/layouts/AuthLayout.astro`)

- **Opis**: Minimalny layout dla stron uwierzytelniania. Centruje zawartość na ekranie, zapewnia spójny wygląd dla stron logowania, rejestracji i resetowania hasła.
- **Główne elementy**:
  - `<html>`, `<head>` z meta tagami
  - `<body>` z flexbox centrującym zawartość
  - `<main>` z maksymalną szerokością i paddingiem
  - `<slot />` dla zawartości potomnej
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak
- **Propsy**:
  - `title?: string` - tytuł strony (default: "AI Task Manager")

### 4.3. LoginForm (`src/components/auth/LoginForm.tsx`)

- **Opis**: Główny komponent React formularza logowania. Zarządza stanem formularza, walidacją i komunikacją z Supabase Auth. Wyświetla pola email/hasło, komunikaty błędów oraz linki nawigacyjne.
- **Główne elementy**:
  - `<form>` z obsługą onSubmit
  - Logo aplikacji (opcjonalnie)
  - Nagłówek formularza
  - Pole email z `<Label>` i `<Input>`
  - Pole hasła z `<Label>` i `<Input type="password">`
  - `<Alert>` do wyświetlania błędów (warunkowy)
  - `<Button>` typu submit
  - Linki do rejestracji i odzyskiwania hasła
- **Obsługiwane interakcje**:
  - `onChange` na polach input - aktualizacja stanu formularza
  - `onBlur` na polach input - walidacja pojedynczego pola
  - `onSubmit` formularza - walidacja całości i wywołanie API
- **Obsługiwana walidacja**:
  - Email: wymagany, poprawny format (regex)
  - Hasło: wymagane, minimum 6 znaków
  - Walidacja on-blur dla dotkniętych pól
  - Pełna walidacja przed submit
- **Typy**:
  - `LoginFormValues`
  - `LoginFormErrors`
- **Propsy**: Brak (komponent samodzielny)

### 4.4. Input (`src/components/ui/input.tsx`)

- **Opis**: Komponent pola tekstowego z shadcn/ui. Obsługuje różne typy (text, email, password), stany błędów i dostępność.
- **Główne elementy**:
  - `<input>` z klasami Tailwind
  - Wsparcie dla `aria-invalid` przy błędach
  - Focus ring dla dostępności
- **Obsługiwane interakcje**:
  - `onChange` - zmiana wartości
  - `onBlur` - utrata focusu (walidacja)
  - `onFocus` - uzyskanie focusu
- **Obsługiwana walidacja**: Przekazywana przez propsy (aria-invalid)
- **Typy**: `React.InputHTMLAttributes<HTMLInputElement>`
- **Propsy**:
  - Wszystkie standardowe atrybuty HTML input
  - `className?: string`

### 4.5. Button (`src/components/ui/button.tsx`)

- **Opis**: Komponent przycisku z shadcn/ui (już istnieje w projekcie). Obsługuje różne warianty i rozmiary.
- **Główne elementy**:
  - `<button>` lub `<Slot>` (gdy asChild)
  - Klasy Tailwind dla stylowania
- **Obsługiwane interakcje**:
  - `onClick` - kliknięcie
  - Stan `disabled` podczas ładowania
- **Obsługiwana walidacja**: Brak
- **Typy**: `ButtonProps` z VariantProps
- **Propsy**:
  - `variant`: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  - `size`: "default" | "sm" | "lg" | "icon"
  - `asChild?: boolean`
  - `disabled?: boolean`
  - Wszystkie standardowe atrybuty button

### 4.6. Alert (`src/components/ui/alert.tsx`)

- **Opis**: Komponent do wyświetlania komunikatów błędów i ostrzeżeń z shadcn/ui.
- **Główne elementy**:
  - `<div role="alert">` z ikoną i tekstem
  - `AlertTitle` - tytuł alertu
  - `AlertDescription` - opis/treść
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: `AlertProps`
- **Propsy**:
  - `variant`: "default" | "destructive"
  - `className?: string`

### 4.7. Label (`src/components/ui/label.tsx`)

- **Opis**: Komponent etykiety dla pól formularza z shadcn/ui. Zapewnia prawidłowe powiązanie z inputem przez `htmlFor`.
- **Główne elementy**:
  - `<label>` z klasami Tailwind
- **Obsługiwane interakcje**: Brak
- **Obsługiwana walidacja**: Brak
- **Typy**: `React.LabelHTMLAttributes<HTMLLabelElement>`
- **Propsy**:
  - `htmlFor: string` - ID powiązanego inputa
  - `className?: string`

## 5. Typy

### 5.1. LoginFormValues

```typescript
/**
 * Wartości pól formularza logowania
 */
interface LoginFormValues {
  /** Adres email użytkownika */
  email: string;
  /** Hasło użytkownika */
  password: string;
}
```

### 5.2. LoginFormErrors

```typescript
/**
 * Błędy walidacji formularza logowania
 */
interface LoginFormErrors {
  /** Błąd walidacji pola email */
  email?: string;
  /** Błąd walidacji pola hasła */
  password?: string;
  /** Ogólny błąd formularza (np. błąd serwera, nieprawidłowe dane logowania) */
  form?: string;
}
```

### 5.3. UseLoginFormReturn

```typescript
/**
 * Typ zwracany przez hook useLoginForm
 */
interface UseLoginFormReturn {
  /** Aktualne wartości formularza */
  values: LoginFormValues;
  /** Błędy walidacji */
  errors: LoginFormErrors;
  /** Czy trwa wysyłanie formularza */
  isSubmitting: boolean;
  /** Handler zmiany wartości pola */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler utraty focusu - walidacja pola */
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Handler wysłania formularza */
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}
```

## 6. Zarządzanie stanem

### 6.1. Stan lokalny formularza

Komponent `LoginForm` zarządza następującym stanem lokalnym:

```typescript
// Wartości pól formularza
const [values, setValues] = useState<LoginFormValues>({
  email: "",
  password: "",
});

// Błędy walidacji
const [errors, setErrors] = useState<LoginFormErrors>({});

// Czy formularz jest w trakcie wysyłania
const [isSubmitting, setIsSubmitting] = useState(false);

// Zbiór pól, które były już "dotknięte" (dla walidacji on-blur)
const [touchedFields, setTouchedFields] = useState<Set<keyof LoginFormValues>>(new Set());
```

### 6.2. Custom Hook: useLoginForm

Zalecane jest wyodrębnienie logiki formularza do custom hooka `useLoginForm`:

```typescript
// src/components/auth/useLoginForm.ts
function useLoginForm(): UseLoginFormReturn {
  // Stan formularza
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<keyof LoginFormValues>>(new Set());

  // Walidacja pojedynczego pola
  const validateField = (name: keyof LoginFormValues, value: string): string | undefined => { ... };

  // Walidacja całego formularza
  const validateForm = (): LoginFormErrors => { ... };

  // Handlery
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => { ... };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => { ... };

  return { values, errors, isSubmitting, handleChange, handleBlur, handleSubmit };
}
```

### 6.3. Przepływ stanu

1. **Inicjalizacja**: Puste wartości, brak błędów, `isSubmitting = false`
2. **Wpisywanie**: `handleChange` aktualizuje `values`, czyści błąd jeśli pole było dotknięte
3. **Blur**: `handleBlur` dodaje pole do `touchedFields`, waliduje pole
4. **Submit**: `handleSubmit` waliduje wszystko, ustawia `isSubmitting`, wywołuje API
5. **Sukces**: Przekierowanie do `/dashboard`
6. **Błąd**: Ustawia `errors.form`, wyłącza `isSubmitting`

## 7. Integracja API

### 7.1. Metoda uwierzytelnienia

Widok wykorzystuje Supabase Auth SDK do logowania użytkownika:

```typescript
// Wywołanie API
const { data, error } = await supabase.auth.signInWithPassword({
  email: values.email,
  password: values.password,
});
```

### 7.2. Typy żądania i odpowiedzi

**Żądanie (SignInWithPasswordCredentials):**

```typescript
{
  email: string;
  password: string;
}
```

**Odpowiedź sukcesu (AuthResponse):**

```typescript
{
  data: {
    user: User; // Obiekt użytkownika Supabase
    session: Session; // Sesja z tokenami JWT
  }
  error: null;
}
```

**Odpowiedź błędu (AuthResponse):**

```typescript
{
  data: {
    user: null;
    session: null;
  }
  error: AuthError; // { message: string; status: number; }
}
```

### 7.3. Inicjalizacja klienta Supabase

W komponencie React należy utworzyć klienta Supabase dla przeglądarki:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
```

### 7.4. Przekierowanie po zalogowaniu

Po pomyślnym zalogowaniu:

```typescript
if (data.session) {
  // Sprawdź czy jest parametr redirectTo
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get("redirectTo") || "/dashboard";
  window.location.href = redirectTo;
}
```

## 8. Interakcje użytkownika

| Interakcja                             | Element        | Oczekiwany rezultat                                       |
| -------------------------------------- | -------------- | --------------------------------------------------------- |
| Wejście na stronę                      | Strona         | Autofocus na polu email                                   |
| Wpisanie tekstu w pole email           | Input email    | Aktualizacja stanu `values.email`                         |
| Opuszczenie pola email                 | Input email    | Walidacja formatu, wyświetlenie błędu jeśli nieprawidłowy |
| Wpisanie tekstu w pole hasła           | Input password | Aktualizacja stanu `values.password`                      |
| Opuszczenie pola hasła                 | Input password | Walidacja długości, wyświetlenie błędu jeśli za krótkie   |
| Kliknięcie "Zaloguj" (poprawne dane)   | Button         | Loader, wywołanie API, przekierowanie do `/dashboard`     |
| Kliknięcie "Zaloguj" (błędne dane)     | Button         | Loader, wywołanie API, wyświetlenie komunikatu błędu      |
| Kliknięcie "Zaloguj" (błędy walidacji) | Button         | Wyświetlenie wszystkich błędów walidacji                  |
| Kliknięcie "Zarejestruj się"           | Link           | Nawigacja do `/register`                                  |
| Kliknięcie "Zapomniałem hasła"         | Link           | Nawigacja do `/forgot-password`                           |
| Naciśnięcie Enter w formularzu         | Form           | Wysłanie formularza (jak kliknięcie "Zaloguj")            |

## 9. Warunki i walidacja

### 9.1. Walidacja pola email

| Warunek                           | Komunikat błędu                     | Moment sprawdzenia |
| --------------------------------- | ----------------------------------- | ------------------ |
| Pole nie może być puste           | "Adres email jest wymagany"         | on-blur, on-submit |
| Musi być poprawnym formatem email | "Nieprawidłowy format adresu email" | on-blur, on-submit |

**Regex dla walidacji email:**

```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### 9.2. Walidacja pola hasła

| Warunek                 | Komunikat błędu                        | Moment sprawdzenia |
| ----------------------- | -------------------------------------- | ------------------ |
| Pole nie może być puste | "Hasło jest wymagane"                  | on-blur, on-submit |
| Minimum 6 znaków        | "Hasło musi mieć co najmniej 6 znaków" | on-blur, on-submit |

### 9.3. Walidacja formularza

- Przycisk "Zaloguj" jest **zawsze aktywny** (nie disabled)
- Przy kliknięciu przycisku z błędami walidacji:
  - Wszystkie błędy są wyświetlane
  - Formularz nie jest wysyłany
  - Focus przenoszony na pierwsze pole z błędem
- Walidacja client-side nie zastępuje walidacji server-side

### 9.4. Wpływ walidacji na UI

| Stan                 | Email Input                    | Password Input                 | Button  | Alert                  |
| -------------------- | ------------------------------ | ------------------------------ | ------- | ---------------------- |
| Początkowy           | Normalny                       | Normalny                       | Aktywny | Ukryty                 |
| Błąd walidacji email | aria-invalid, czerwona obwódka | Normalny                       | Aktywny | Ukryty                 |
| Błąd walidacji hasła | Normalny                       | aria-invalid, czerwona obwódka | Aktywny | Ukryty                 |
| Wysyłanie            | Disabled                       | Disabled                       | Loading | Ukryty                 |
| Błąd serwera         | Normalny                       | Normalny                       | Aktywny | Widoczny z komunikatem |

## 10. Obsługa błędów

### 10.1. Błędy walidacji klienta

- Wyświetlane bezpośrednio pod polem formularza
- Czerwony tekst z odpowiednim komunikatem
- Pole oznaczone `aria-invalid="true"`
- Komunikaty w języku polskim

### 10.2. Błędy uwierzytelniania (Supabase Auth)

| Błąd Supabase               | Komunikat dla użytkownika                                      |
| --------------------------- | -------------------------------------------------------------- |
| `Invalid login credentials` | "Nieprawidłowy email lub hasło"                                |
| `Email not confirmed`       | "Adres email nie został potwierdzony. Sprawdź swoją skrzynkę." |
| Dowolny inny błąd auth      | "Nieprawidłowy email lub hasło"                                |

**Ważne**: Wszystkie błędy związane z nieistniejącym kontem lub błędnym hasłem muszą zwracać **ten sam** generyczny komunikat, aby zapobiec enumeracji użytkowników.

### 10.3. Błędy sieciowe

| Błąd            | Komunikat dla użytkownika                                                        |
| --------------- | -------------------------------------------------------------------------------- |
| Brak połączenia | "Błąd połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie." |
| Timeout         | "Serwer nie odpowiada. Spróbuj ponownie za chwilę."                              |
| Błąd 5xx        | "Wystąpił błąd serwera. Spróbuj ponownie później."                               |

### 10.4. Implementacja obsługi błędów

```typescript
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    // Mapowanie błędów Supabase na generyczny komunikat
    if (error.message.includes("Email not confirmed")) {
      setErrors({ form: "Adres email nie został potwierdzony. Sprawdź swoją skrzynkę." });
    } else {
      // Generyczny komunikat dla błędów auth (zapobiega enumeracji)
      setErrors({ form: "Nieprawidłowy email lub hasło" });
    }
    return;
  }

  // Sukces - przekierowanie
  window.location.href = "/dashboard";
} catch (e) {
  // Błędy sieciowe
  setErrors({ form: "Błąd połączenia z serwerem. Spróbuj ponownie." });
} finally {
  setIsSubmitting(false);
}
```

## 11. Kroki implementacji

### Krok 1: Instalacja komponentów shadcn/ui

```bash
# Input
npx shadcn@latest add input

# Label
npx shadcn@latest add label

# Alert
npx shadcn@latest add alert
```

### Krok 2: Utworzenie layoutu AuthLayout

Utworzyć plik `src/layouts/AuthLayout.astro`:

- Minimalny HTML z meta tagami
- Flexbox centrujący zawartość (min-h-screen)
- Slot dla zawartości
- Importy globalnych stylów Tailwind

### Krok 3: Utworzenie typów dla formularza

Utworzyć plik `src/components/auth/types.ts`:

- Zdefiniować `LoginFormValues`
- Zdefiniować `LoginFormErrors`
- Zdefiniować `UseLoginFormReturn`

### Krok 4: Utworzenie hooka useLoginForm

Utworzyć plik `src/components/auth/useLoginForm.ts`:

- Implementacja stanu formularza
- Funkcje walidacji pól
- Handlery onChange, onBlur, onSubmit
- Integracja z Supabase Auth
- Obsługa błędów

### Krok 5: Utworzenie komponentu LoginForm

Utworzyć plik `src/components/auth/LoginForm.tsx`:

- Użycie hooka `useLoginForm`
- Struktura formularza z komponentami shadcn/ui
- Autofocus na polu email
- Warunkowe wyświetlanie alertu błędu
- Linki do rejestracji i resetowania hasła
- Stan loading na przycisku

### Krok 6: Utworzenie strony login.astro

Utworzyć plik `src/pages/login.astro`:

- Sprawdzenie sesji w frontmatter (przekierowanie jeśli zalogowany)
- Import AuthLayout
- Renderowanie LoginForm z `client:load`

### Krok 7: Konfiguracja middleware dla sesji

Upewnić się, że middleware (`src/middleware/index.ts`):

- Tworzy klienta Supabase SSR
- Sprawdza sesję
- Ustawia `context.locals.supabase`
- Przekierowuje niezalogowanych z chronionych stron

### Krok 8: Testy manualne

1. Test walidacji pól (puste, nieprawidłowy format)
2. Test logowania z poprawnymi danymi
3. Test logowania z błędnymi danymi
4. Test przekierowania zalogowanego użytkownika
5. Test dostępności (nawigacja klawiaturą, screen reader)
6. Test responsywności na różnych urządzeniach

### Krok 9: Stylowanie i poprawki

- Dostosowanie stylów do design systemu
- Dodanie animacji/transitions
- Obsługa dark mode (jeśli wymagane)
- Poprawki accessibility (aria-labels, role)
