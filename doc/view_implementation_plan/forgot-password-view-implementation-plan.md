# Plan implementacji widoku Forgot Password

## 1. Przegląd

Strona resetowania hasła (`/forgot-password`) umożliwia użytkownikom odzyskanie dostępu do konta poprzez wysłanie linku resetującego na podany adres email. Jest to publiczny widok dostępny bez autoryzacji, wykorzystujący minimalny layout autentykacji (`AuthLayout`). Kluczowym aspektem bezpieczeństwa jest zawsze wyświetlanie komunikatu sukcesu po wysłaniu formularza, niezależnie od tego, czy podany email istnieje w systemie - zapobiega to enumeracji kont użytkowników.

## 2. Routing widoku

- **Ścieżka**: `/forgot-password`
- **Plik**: `src/pages/forgot-password.astro`
- **Typ**: Strona publiczna (bez wymagania autoryzacji)
- **Przekierowanie**: Zalogowani użytkownicy powinni być przekierowani do `/app`

## 3. Struktura komponentów

```
forgot-password.astro
└── AuthLayout.astro
    └── ForgotPasswordForm.tsx (client:load)
        ├── Input (email)
        ├── Button (submit)
        ├── SuccessMessage (conditional)
        └── Link (powrót do logowania)
```

## 4. Szczegóły komponentów

### 4.1. AuthLayout.astro

- **Opis**: Minimalny layout Astro dla stron autentykacji. Wyświetla wycentrowany kontener z logo aplikacji i slotem na zawartość (formularz). Zapewnia spójny wygląd dla `/login`, `/register` i `/forgot-password`.

- **Główne elementy**:
  - Kontener pełnoekranowy z neutralnym tłem (`bg-gray-50`)
  - Wycentrowana karta (`max-w-md`) z białym tłem i cieniem
  - Logo aplikacji nad formularzem
  - Slot na zawartość formularza

- **Obsługiwane interakcje**: Brak (komponent statyczny)

- **Obsługiwana walidacja**: Brak

- **Typy**:
  - Props: `{ title?: string }` (dla tagu `<title>`)

- **Propsy**:
  ```typescript
  interface AuthLayoutProps {
    title?: string;
  }
  ```

### 4.2. ForgotPasswordForm.tsx

- **Opis**: Reaktywny komponent React odpowiedzialny za obsługę formularza resetowania hasła. Zarządza stanem formularza, walidacją email, wywołaniem Supabase Auth oraz wyświetlaniem komunikatu sukcesu.

- **Główne elementy**:
  - Nagłówek formularza (`<h1>`: "Resetowanie hasła")
  - Opis akcji (`<p>`: "Podaj adres email, aby otrzymać link do resetowania hasła")
  - Pole email (`<Input>`)
  - Przycisk submit (`<Button>`: "Wyślij link resetujący")
  - Link powrotu do logowania (`<a href="/login">`)
  - Komponent `SuccessMessage` (wyświetlany warunkowo po wysłaniu formularza)

- **Obsługiwane interakcje**:
  - `onChange` na polu email - aktualizacja stanu
  - `onBlur` na polu email - walidacja formatu
  - `onSubmit` formularza - wysłanie żądania resetowania

- **Obsługiwana walidacja**:
  - Email wymagany - komunikat: "Adres email jest wymagany"
  - Email w poprawnym formacie (regex) - komunikat: "Podaj poprawny adres email"

- **Typy**:
  - `ForgotPasswordFormState`
  - `ForgotPasswordFormErrors`

- **Propsy**:
  ```typescript
  interface ForgotPasswordFormProps {
    supabaseUrl: string;
    supabaseAnonKey: string;
  }
  ```

### 4.3. SuccessMessage

- **Opis**: Komponent wyświetlany po pomyślnym wysłaniu formularza. Informuje użytkownika, że jeśli podany email istnieje w systemie, otrzyma link do resetowania hasła. Nie jest to osobny plik - renderowany inline w `ForgotPasswordForm`.

- **Główne elementy**:
  - Ikona sukcesu (CheckCircle lub podobna)
  - Nagłówek: "Sprawdź swoją skrzynkę"
  - Tekst: "Jeśli konto z podanym adresem email istnieje, wyślemy link do resetowania hasła."
  - Link powrotu do logowania

- **Obsługiwane interakcje**:
  - Kliknięcie linku "Wróć do logowania" - nawigacja do `/login`

- **Obsługiwana walidacja**: Brak

- **Typy**: Brak (inline render)

- **Propsy**: Brak (część `ForgotPasswordForm`)

## 5. Typy

### 5.1. ForgotPasswordFormState

Stan wewnętrzny formularza zarządzany przez hook `useState`:

```typescript
interface ForgotPasswordFormState {
  email: string;
  isLoading: boolean;
  isSubmitted: boolean;
}
```

| Pole          | Typ       | Opis                                                                    |
| ------------- | --------- | ----------------------------------------------------------------------- |
| `email`       | `string`  | Wartość pola email                                                      |
| `isLoading`   | `boolean` | Flaga wskazująca trwające żądanie API                                   |
| `isSubmitted` | `boolean` | Flaga wskazująca, że formularz został wysłany (pokazuje SuccessMessage) |

### 5.2. ForgotPasswordFormErrors

Obiekt przechowujący błędy walidacji:

```typescript
interface ForgotPasswordFormErrors {
  email?: string;
}
```

| Pole    | Typ                   | Opis                                     |
| ------- | --------------------- | ---------------------------------------- |
| `email` | `string \| undefined` | Komunikat błędu walidacji dla pola email |

### 5.3. ForgotPasswordFormProps

Props przekazywane do komponentu formularza:

```typescript
interface ForgotPasswordFormProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
}
```

| Pole              | Typ      | Opis                     |
| ----------------- | -------- | ------------------------ |
| `supabaseUrl`     | `string` | URL instancji Supabase   |
| `supabaseAnonKey` | `string` | Klucz anonimowy Supabase |

## 6. Zarządzanie stanem

Widok wykorzystuje lokalny stan komponentu React bez potrzeby tworzenia customowego hooka - logika jest prosta i nie wymaga współdzielenia.

### Zmienne stanu

```typescript
const [formState, setFormState] = useState<ForgotPasswordFormState>({
  email: "",
  isLoading: false,
  isSubmitted: false,
});

const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
```

### Przepływ stanu

1. **Stan początkowy**: Formularz pusty, `isSubmitted: false`
2. **Wpisywanie email**: Aktualizacja `email`, czyszczenie błędu przy każdej zmianie
3. **Walidacja on-blur**: Sprawdzenie formatu email, ustawienie błędu jeśli niepoprawny
4. **Submit**:
   - Ustawienie `isLoading: true`
   - Wywołanie `resetPasswordForEmail()`
   - Ustawienie `isSubmitted: true` (niezależnie od wyniku API)
   - Ustawienie `isLoading: false`
5. **Po wysłaniu**: Wyświetlenie `SuccessMessage`, ukrycie formularza

## 7. Integracja API

### Endpoint

Wykorzystywany jest Supabase Auth SDK, a nie bezpośrednie wywołanie REST API.

### Metoda SDK

```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
});
```

### Parametry żądania

| Parametr             | Typ      | Wymagany | Opis                                  |
| -------------------- | -------- | -------- | ------------------------------------- |
| `email`              | `string` | Tak      | Adres email użytkownika               |
| `options.redirectTo` | `string` | Nie      | URL do strony ustawiania nowego hasła |

### Obsługa odpowiedzi

**Sukces lub błąd**: Zawsze ustawiamy `isSubmitted: true` i pokazujemy komunikat sukcesu. Jest to celowe działanie zapobiegające enumeracji kont - atakujący nie może dowiedzieć się, czy dany email istnieje w systemie.

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateEmail()) return;

  setFormState((prev) => ({ ...prev, isLoading: true }));

  try {
    await supabase.auth.resetPasswordForEmail(formState.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  } catch (error) {
    // Ignorujemy błędy - zawsze pokazujemy sukces
    console.error("Password reset error:", error);
  } finally {
    setFormState((prev) => ({
      ...prev,
      isLoading: false,
      isSubmitted: true,
    }));
  }
};
```

## 8. Interakcje użytkownika

### 8.1. Wpisywanie adresu email

| Zdarzenie                | Akcja                          |
| ------------------------ | ------------------------------ |
| Użytkownik wpisuje tekst | Aktualizacja `formState.email` |
| Zmiana wartości          | Czyszczenie `errors.email`     |

### 8.2. Opuszczenie pola email (blur)

| Zdarzenie          | Akcja                                                    |
| ------------------ | -------------------------------------------------------- |
| Pole puste         | Ustawienie `errors.email = "Adres email jest wymagany"`  |
| Niepoprawny format | Ustawienie `errors.email = "Podaj poprawny adres email"` |
| Poprawny email     | Czyszczenie `errors.email`                               |

### 8.3. Kliknięcie przycisku "Wyślij link resetujący"

| Zdarzenie               | Akcja                                         |
| ----------------------- | --------------------------------------------- |
| Walidacja nieudana      | Wyświetlenie błędów, brak wywołania API       |
| Walidacja udana         | Wywołanie API, pokazanie loadera na przycisku |
| Odpowiedź (sukces/błąd) | Pokazanie `SuccessMessage`                    |

### 8.4. Kliknięcie "Wróć do logowania"

| Zdarzenie        | Akcja                 |
| ---------------- | --------------------- |
| Kliknięcie linku | Nawigacja do `/login` |

### 8.5. Nawigacja klawiaturą

| Klawisz               | Akcja                                 |
| --------------------- | ------------------------------------- |
| Tab                   | Przejście między polami i przyciskami |
| Enter (na polu email) | Submit formularza                     |
| Enter (na przycisku)  | Submit formularza                     |

## 9. Warunki i walidacja

### 9.1. Walidacja pola email

| Warunek  | Reguła                         | Komunikat błędu              |
| -------- | ------------------------------ | ---------------------------- |
| Wymagane | `email.trim().length > 0`      | "Adres email jest wymagany"  |
| Format   | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | "Podaj poprawny adres email" |

### 9.2. Walidacja formularza przed wysłaniem

```typescript
const validateEmail = (): boolean => {
  const email = formState.email.trim();

  if (!email) {
    setErrors({ email: "Adres email jest wymagany" });
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    setErrors({ email: "Podaj poprawny adres email" });
    return false;
  }

  setErrors({});
  return true;
};
```

### 9.3. Wpływ walidacji na UI

| Stan                 | Wpływ na UI                                                      |
| -------------------- | ---------------------------------------------------------------- |
| Błąd walidacji email | Czerwona ramka na polu, komunikat błędu pod polem, focus na polu |
| Brak błędów          | Normalny styl pola                                               |
| `isLoading: true`    | Przycisk nieaktywny z spinnerem, pole zablokowane                |
| `isSubmitted: true`  | Ukrycie formularza, pokazanie `SuccessMessage`                   |

## 10. Obsługa błędów

### 10.1. Błędy walidacji klienta

| Błąd               | Obsługa                                       |
| ------------------ | --------------------------------------------- |
| Pusty email        | Komunikat inline "Adres email jest wymagany"  |
| Niepoprawny format | Komunikat inline "Podaj poprawny adres email" |

### 10.2. Błędy API

| Błąd                  | Obsługa                                               |
| --------------------- | ----------------------------------------------------- |
| Błąd sieci            | Logowanie do konsoli, pokazanie sukcesu użytkownikowi |
| Rate limiting         | Logowanie do konsoli, pokazanie sukcesu użytkownikowi |
| Nieistniejący email   | Celowo ignorowany - pokazanie sukcesu                 |
| Błąd serwera Supabase | Logowanie do konsoli, pokazanie sukcesu użytkownikowi |

**Uzasadnienie**: Wszystkie błędy API są celowo ignorowane z perspektywy użytkownika. Jest to standardowa praktyka bezpieczeństwa zapobiegająca enumeracji kont. Użytkownik zawsze widzi komunikat sukcesu, niezależnie od tego, czy email istnieje w systemie czy nie.

### 10.3. Przypadki brzegowe

| Przypadek                      | Obsługa                                  |
| ------------------------------ | ---------------------------------------- |
| Podwójne kliknięcie submit     | Przycisk zablokowany podczas `isLoading` |
| Odświeżenie strony po submicie | Reset do stanu początkowego (formularz)  |
| JavaScript wyłączony           | Formularz nie zadziała - wymaga React    |

## 11. Kroki implementacji

### Krok 1: Utworzenie AuthLayout

1. Utworzyć plik `src/layouts/AuthLayout.astro`
2. Zaimplementować minimalny layout z:
   - Kontenerem pełnoekranowym z tłem `bg-gray-50`
   - Wycentrowaną kartą z białym tłem
   - Logo aplikacji (tekst "AI Task Manager" lub grafika)
   - Slotem na zawartość
3. Dodać prop `title` dla tagu `<title>`

### Krok 2: Dodanie komponentów Shadcn/ui

1. Dodać komponent Input: `npx shadcn@latest add input`
2. Dodać komponent Label: `npx shadcn@latest add label`
3. Zweryfikować, że Button jest już dostępny

### Krok 3: Utworzenie ForgotPasswordForm

1. Utworzyć plik `src/components/auth/ForgotPasswordForm.tsx`
2. Zaimplementować interfejsy typów (`ForgotPasswordFormState`, `ForgotPasswordFormErrors`, `ForgotPasswordFormProps`)
3. Zaimplementować stan formularza z `useState`
4. Utworzyć instancję klienta Supabase w komponencie
5. Zaimplementować funkcję walidacji email
6. Zaimplementować handler `onChange` dla pola email
7. Zaimplementować handler `onBlur` dla walidacji
8. Zaimplementować handler `onSubmit` z wywołaniem API
9. Zaimplementować warunkowe renderowanie formularza lub `SuccessMessage`

### Krok 4: Utworzenie strony forgot-password

1. Utworzyć plik `src/pages/forgot-password.astro`
2. Zaimportować `AuthLayout`
3. Zaimportować `ForgotPasswordForm` z dyrektywą `client:load`
4. Przekazać zmienne środowiskowe Supabase do komponentu
5. Dodać middleware sprawdzające czy użytkownik jest zalogowany (przekierowanie do `/app`)

### Krok 5: Stylowanie komponentów

1. Dodać klasy Tailwind do formularza:
   - `space-y-4` dla odstępów między polami
   - Odpowiednie marginesy i paddingi
2. Ostylować komunikat błędu (czerwony tekst, `text-sm`)
3. Ostylować `SuccessMessage`:
   - Ikona sukcesu (zielona)
   - Tekst wycentrowany
4. Dodać focus ring dla dostępności

### Krok 6: Implementacja dostępności

1. Dodać `aria-invalid` do pola email przy błędzie
2. Dodać `aria-describedby` powiązane z komunikatem błędu
3. Dodać `aria-live="polite"` do kontenera błędów
4. Upewnić się, że wszystkie elementy są dostępne z klawiatury
5. Dodać `role="alert"` do komunikatu sukcesu

### Krok 7: Testowanie

1. Przetestować walidację email (pusty, niepoprawny format, poprawny)
2. Przetestować submit formularza
3. Zweryfikować, że sukces jest wyświetlany niezależnie od odpowiedzi API
4. Przetestować nawigację klawiaturą
5. Przetestować responsywność (min. 1024px)
6. Przetestować z wyłączonym JavaScript (graceful degradation info)

### Krok 8: Integracja z pozostałymi stronami auth

1. Zweryfikować spójność z `/login` i `/register`
2. Upewnić się, że linki między stronami działają poprawnie
3. Zweryfikować, że `AuthLayout` jest współdzielony
