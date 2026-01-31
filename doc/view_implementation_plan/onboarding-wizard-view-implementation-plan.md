# Plan implementacji widoku Onboarding Wizard

## 1. Przegląd

Onboarding Wizard to wielokrokowy overlay (modal) wyświetlany nowym użytkownikom po pierwszym zalogowaniu się do aplikacji. Jego celem jest edukacja użytkownika w zakresie:

- Modelu priorytetów (Niski/Średni/Wysoki)
- Roli AI jako sugestii (nie automatu)
- Zachęty do rozpoczęcia pracy z aplikacją

Wizard składa się z 3 kroków i może być pominięty w dowolnym momencie. Po zakończeniu lub pominięciu, system zapisuje informację o ukończeniu onboardingu poprzez wywołanie API. Użytkownik może ponownie uruchomić onboarding z poziomu menu użytkownika.

## 2. Routing widoku

Onboarding Wizard jest komponentem overlay wyświetlanym w kontekście Dashboard (`/app`). Nie posiada własnej ścieżki URL.

**Warunki wyświetlenia:**

- Automatycznie: gdy `ProfileDTO.onboardingCompletedAt` jest `null` (pierwsze uruchomienie)
- Manualnie: gdy użytkownik kliknie "Powtórz wprowadzenie" w UserMenu

**Lokalizacja komponentu:**

- Renderowany wewnątrz `DashboardLayout` jako overlay
- Wykorzystuje Shadcn/ui Dialog jako bazę

## 3. Struktura komponentów

```
OnboardingWizard (główny kontener)
├── Dialog (Shadcn/ui)
│   └── DialogContent
│       ├── DialogHeader
│       │   └── StepIndicator
│       ├── OnboardingStepContent (kontener treści kroków)
│       │   ├── StepPriorities (krok 1)
│       │   ├── StepAI (krok 2)
│       │   └── StepGetStarted (krok 3)
│       └── DialogFooter
│           └── OnboardingNavigation
│               ├── Button (Pomiń)
│               ├── Button (Wstecz) - opcjonalny
│               └── Button (Dalej/Zakończ)
```

## 4. Szczegóły komponentów

### 4.1. OnboardingWizard

**Opis:**
Główny komponent zarządzający stanem wizarda i komunikacją z API. Renderuje Dialog z zawartością kroków i nawigacją.

**Główne elementy:**

- `Dialog` z Shadcn/ui jako kontener overlay
- `DialogContent` z ustawioną szerokością (max-w-lg lub max-w-xl)
- Wewnętrzna logika zarządzania krokami poprzez custom hook `useOnboardingWizard`

**Obsługiwane interakcje:**

- Zamknięcie przez Escape (mapowane na `onSkip`)
- Zamknięcie przez kliknięcie poza modal (mapowane na `onSkip`)

**Obsługiwana walidacja:**

- Brak walidacji formularzy (wizard jest informacyjny)

**Typy:**

- `OnboardingWizardProps`

**Propsy:**

```typescript
interface OnboardingWizardProps {
  isOpen: boolean;
  onComplete: (profile: ProfileDTO) => void;
  isReplay?: boolean; // true gdy uruchomiony z menu użytkownika
}
```

### 4.2. StepIndicator

**Opis:**
Komponent wizualny pokazujący postęp w wizardzie (np. "Krok 1 z 3" lub kropki/kreski).

**Główne elementy:**

- Kontener flex z trzema elementami wskaźnika
- Aktywny krok wyróżniony kolorem (blue-600)
- Ukończone kroki w kolorze sukcesu lub przyciemnionym
- Przyszłe kroki w kolorze szarym

**Obsługiwane interakcje:**

- Brak (komponent tylko do odczytu)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `StepIndicatorProps`

**Propsy:**

```typescript
interface StepIndicatorProps {
  currentStep: number; // 0-indexed
  totalSteps: number;
}
```

### 4.3. OnboardingStepContent

**Opis:**
Kontener dla treści poszczególnych kroków. Renderuje odpowiedni komponent kroku na podstawie `currentStep`.

**Główne elementy:**

- Warunkowe renderowanie `StepPriorities`, `StepAI` lub `StepGetStarted`
- Kontener z animacją przejścia między krokami (opcjonalnie CSS transition)
- `aria-live="polite"` dla ogłaszania zmian kroków

**Obsługiwane interakcje:**

- Brak (delegowane do komponentów kroków)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `OnboardingStepContentProps`

**Propsy:**

```typescript
interface OnboardingStepContentProps {
  currentStep: number;
}
```

### 4.4. StepPriorities (Krok 1)

**Opis:**
Pierwszy krok wizarda wyjaśniający model priorytetów. Wizualizuje trzy poziomy priorytetów i tłumaczy system sortowania.

**Główne elementy:**

- Nagłówek: "Model priorytetów"
- Wizualizacja trzech poziomów priorytetów:
  - Wysoki (czerwony) - zadania krytyczne, pilne
  - Średni (żółty) - zadania ważne
  - Niski (zielony) - zadania do wykonania później
- Tekst wyjaśniający sortowanie (Wysoki → Średni → Niski)
- Ilustracja lub ikony priorytetów (PriorityBadge)

**Obsługiwane interakcje:**

- Brak (komponent informacyjny)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- Brak dodatkowych typów (bezstanowy komponent prezentacyjny)

**Propsy:**

- Brak (komponent bez propsów)

### 4.5. StepAI (Krok 2)

**Opis:**
Drugi krok wizarda wyjaśniający rolę AI w aplikacji. Podkreśla, że AI jest sugestią, a nie automatem, i zachęca do korzystania z funkcji.

**Główne elementy:**

- Nagłówek: "Inteligentne sugestie AI"
- Ikona AI (sparkles lub podobna)
- Tekst wyjaśniający:
  - AI analizuje opis zadania i sugeruje priorytet
  - Użytkownik zawsze podejmuje ostateczną decyzję
  - Można zaakceptować, zmodyfikować lub odrzucić sugestię
- Wizualizacja przepływu: Zadanie → AI → Sugestia → Decyzja użytkownika

**Obsługiwane interakcje:**

- Brak (komponent informacyjny)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- Brak dodatkowych typów

**Propsy:**

- Brak

### 4.6. StepGetStarted (Krok 3)

**Opis:**
Trzeci krok wizarda zachęcający użytkownika do rozpoczęcia pracy - utworzenia pierwszej listy i pierwszego zadania.

**Główne elementy:**

- Nagłówek: "Gotowy do działania!"
- Tekst zachęcający do utworzenia pierwszej listy zadań
- Wizualizacja pustego stanu → pełnej listy (opcjonalnie)
- Informacja o dostępności pomocy (możliwość powrotu do onboardingu)

**Obsługiwane interakcje:**

- Brak (komponent informacyjny)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- Brak dodatkowych typów

**Propsy:**

- Brak

### 4.7. OnboardingNavigation

**Opis:**
Komponent nawigacyjny na dole wizarda zawierający przyciski do poruszania się między krokami oraz pominięcia/zakończenia.

**Główne elementy:**

- Przycisk "Pomiń" (variant: ghost, po lewej stronie) - zawsze widoczny
- Przycisk "Wstecz" (variant: outline) - widoczny od kroku 2
- Przycisk "Dalej" (variant: default) - kroki 1-2
- Przycisk "Zakończ" (variant: default) - krok 3
- Loading state na przyciskach "Pomiń" i "Zakończ" podczas wywołania API

**Obsługiwane interakcje:**

- `onSkip` - pominięcie wizarda (wywołuje API)
- `onPrevious` - powrót do poprzedniego kroku
- `onNext` - przejście do następnego kroku
- `onComplete` - zakończenie wizarda (wywołuje API)

**Obsługiwana walidacja:**

- Brak

**Typy:**

- `OnboardingNavigationProps`

**Propsy:**

```typescript
interface OnboardingNavigationProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onSkip: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
}
```

## 5. Typy

### 5.1. Typy istniejące (z `src/types.ts`)

```typescript
// Command wysyłany do API
interface CompleteOnboardingCommand {
  version: number;
}

// Odpowiedź z API
interface ProfileDTO {
  id: string;
  activeListId: string | null;
  onboardingCompletedAt: string | null; // ISO8601
  onboardingVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

// Błąd z API
interface ErrorResponseDTO {
  error: string;
  message: string;
  details?: Record<string, string>;
}
```

### 5.2. Nowe typy do utworzenia

```typescript
// src/components/onboarding/types.ts

/**
 * Props głównego komponentu OnboardingWizard
 */
export interface OnboardingWizardProps {
  /** Czy wizard jest otwarty */
  isOpen: boolean;
  /** Callback wywoływany po zakończeniu lub pominięciu onboardingu */
  onComplete: (profile: ProfileDTO) => void;
  /** Czy to ponowne uruchomienie z menu (domyślnie false) */
  isReplay?: boolean;
}

/**
 * Props wskaźnika postępu kroków
 */
export interface StepIndicatorProps {
  /** Aktualny krok (0-indexed) */
  currentStep: number;
  /** Całkowita liczba kroków */
  totalSteps: number;
}

/**
 * Props kontenera treści kroków
 */
export interface OnboardingStepContentProps {
  /** Aktualny krok (0-indexed) */
  currentStep: number;
}

/**
 * Props nawigacji wizarda
 */
export interface OnboardingNavigationProps {
  /** Aktualny krok (0-indexed) */
  currentStep: number;
  /** Całkowita liczba kroków */
  totalSteps: number;
  /** Czy trwa wysyłanie do API */
  isSubmitting: boolean;
  /** Pomiń onboarding */
  onSkip: () => void;
  /** Wróć do poprzedniego kroku */
  onPrevious: () => void;
  /** Przejdź do następnego kroku */
  onNext: () => void;
  /** Zakończ onboarding */
  onComplete: () => void;
}

/**
 * Stan zwracany przez hook useOnboardingWizard
 */
export interface UseOnboardingWizardState {
  /** Aktualny krok (0-indexed) */
  currentStep: number;
  /** Całkowita liczba kroków */
  totalSteps: number;
  /** Czy trwa wysyłanie do API */
  isSubmitting: boolean;
  /** Komunikat błędu (jeśli wystąpił) */
  error: string | null;
  /** Przejdź do następnego kroku */
  goNext: () => void;
  /** Wróć do poprzedniego kroku */
  goPrevious: () => void;
  /** Pomiń onboarding (wywołuje API) */
  skip: () => Promise<void>;
  /** Zakończ onboarding (wywołuje API) */
  complete: () => Promise<void>;
}
```

## 6. Zarządzanie stanem

### 6.1. Custom hook: `useOnboardingWizard`

Hook zarządzający logiką wizarda i komunikacją z API.

**Lokalizacja:** `src/components/hooks/useOnboardingWizard.ts`

**Stan wewnętrzny:**

- `currentStep: number` - aktualny krok (0-2), domyślnie 0
- `isSubmitting: boolean` - flaga trwającego żądania API
- `error: string | null` - komunikat błędu

**Logika:**

```typescript
export function useOnboardingWizard(onComplete: (profile: ProfileDTO) => void): UseOnboardingWizardState {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 3;
  const ONBOARDING_VERSION = 1;

  const goNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const goPrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const completeOnboarding = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: ONBOARDING_VERSION }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        throw new Error("Nie udało się zapisać postępu");
      }

      const profile: ProfileDTO = await response.json();
      onComplete(profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił błąd");
    } finally {
      setIsSubmitting(false);
    }
  }, [onComplete]);

  return {
    currentStep,
    totalSteps,
    isSubmitting,
    error,
    goNext,
    goPrevious,
    skip: completeOnboarding,
    complete: completeOnboarding,
  };
}
```

### 6.2. Integracja z Dashboard

Dashboard musi zarządzać stanem wyświetlania wizarda:

```typescript
// W komponencie Dashboard lub DashboardLayout
const [showOnboarding, setShowOnboarding] = useState(false);
const [profile, setProfile] = useState<ProfileDTO | null>(null);

// Sprawdzenie przy ładowaniu profilu
useEffect(() => {
  if (profile && !profile.onboardingCompletedAt) {
    setShowOnboarding(true);
  }
}, [profile]);

// Callback po zakończeniu onboardingu
const handleOnboardingComplete = (updatedProfile: ProfileDTO) => {
  setProfile(updatedProfile);
  setShowOnboarding(false);
};

// Callback z UserMenu do ponownego uruchomienia
const handleReplayOnboarding = () => {
  setShowOnboarding(true);
};
```

## 7. Integracja API

### 7.1. Endpoint: POST /api/profile/onboarding/complete

**Request:**

```typescript
// Content-Type: application/json
const request: CompleteOnboardingCommand = {
  version: 1,
};
```

**Response (200 OK):**

```typescript
const response: ProfileDTO = {
  id: "uuid",
  activeListId: "uuid | null",
  onboardingCompletedAt: "2024-01-15T10:30:00.000Z",
  onboardingVersion: 1,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T10:30:00.000Z",
};
```

**Błędy:**

- `400 Bad Request` - nieprawidłowa wersja (version <= 0)
- `401 Unauthorized` - brak autentykacji

### 7.2. Funkcja API call

```typescript
// src/lib/api/onboarding.ts

import type { CompleteOnboardingCommand, ProfileDTO, ErrorResponseDTO } from "@/types";

export async function completeOnboardingApi(command: CompleteOnboardingCommand): Promise<ProfileDTO> {
  const response = await fetch("/api/profile/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    const error: ErrorResponseDTO = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

## 8. Interakcje użytkownika

| Interakcja                        | Komponent            | Akcja                            | Rezultat                      |
| --------------------------------- | -------------------- | -------------------------------- | ----------------------------- |
| Klik "Dalej"                      | OnboardingNavigation | `goNext()`                       | Przejście do następnego kroku |
| Klik "Wstecz"                     | OnboardingNavigation | `goPrevious()`                   | Powrót do poprzedniego kroku  |
| Klik "Pomiń"                      | OnboardingNavigation | `skip()`                         | API call → zamknięcie wizarda |
| Klik "Zakończ"                    | OnboardingNavigation | `complete()`                     | API call → zamknięcie wizarda |
| Escape                            | Dialog               | `onOpenChange(false)` → `skip()` | API call → zamknięcie wizarda |
| Klik backdrop                     | Dialog               | `onOpenChange(false)` → `skip()` | API call → zamknięcie wizarda |
| "Powtórz wprowadzenie" (UserMenu) | UserMenu             | `setShowOnboarding(true)`        | Otwarcie wizarda              |

## 9. Warunki i walidacja

### 9.1. Warunki wyświetlania wizarda

| Warunek                                  | Źródło           | Efekt                         |
| ---------------------------------------- | ---------------- | ----------------------------- |
| `profile.onboardingCompletedAt === null` | ProfileDTO z API | Automatyczne otwarcie wizarda |
| Kliknięcie "Powtórz wprowadzenie"        | UserMenu         | Manualne otwarcie wizarda     |

### 9.2. Walidacja API

| Pole      | Warunek      | Walidacja            | Komunikat błędu                  |
| --------- | ------------ | -------------------- | -------------------------------- |
| `version` | > 0, integer | Zod schema (backend) | "Version must be greater than 0" |
| `version` | <= 32767     | Zod schema (backend) | "Version must be at most 32767"  |

**Uwaga:** Frontend zawsze wysyła `version: 1` (stała), więc walidacja nie powinna nigdy zawieść przy poprawnej implementacji.

### 9.3. Warunki nawigacji

| Warunek                          | Efekt na UI                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| `currentStep === 0`              | Przycisk "Wstecz" ukryty                                    |
| `currentStep === totalSteps - 1` | Przycisk "Dalej" zamieniony na "Zakończ"                    |
| `isSubmitting === true`          | Przyciski "Pomiń" i "Zakończ" pokazują spinner, są disabled |

## 10. Obsługa błędów

### 10.1. Błędy sieciowe

| Scenariusz         | Obsługa                                                                        |
| ------------------ | ------------------------------------------------------------------------------ |
| Brak połączenia    | Toast: "Nie udało się zapisać postępu. Sprawdź połączenie i spróbuj ponownie." |
| Timeout            | Toast: "Przekroczono czas oczekiwania. Spróbuj ponownie."                      |
| Błąd serwera (500) | Toast: "Wystąpił błąd serwera. Spróbuj ponownie później."                      |

### 10.2. Błędy autentykacji

| Kod              | Obsługa                                       |
| ---------------- | --------------------------------------------- |
| 401 Unauthorized | Redirect do `/login` z zachowaniem return URL |

### 10.3. Błędy walidacji

| Kod             | Obsługa                                                                           |
| --------------- | --------------------------------------------------------------------------------- |
| 400 Bad Request | Teoretycznie niemożliwe przy stałej `version: 1`. Log do konsoli dla debugowania. |

### 10.4. Implementacja obsługi błędów

```typescript
// W hook useOnboardingWizard
const completeOnboarding = useCallback(async () => {
  setIsSubmitting(true);
  setError(null);

  try {
    const profile = await completeOnboardingApi({ version: 1 });
    onComplete(profile);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "UNAUTHORIZED") {
        // Redirect do login
        window.location.href = "/login?returnTo=/app";
        return;
      }
      setError(err.message);
      // Toast notification
      toast.error(err.message);
    } else {
      setError("Wystąpił nieoczekiwany błąd");
      toast.error("Wystąpił nieoczekiwany błąd");
    }
  } finally {
    setIsSubmitting(false);
  }
}, [onComplete]);
```

### 10.5. Stan błędu w UI

Gdy `error` nie jest `null`:

- Wyświetl komunikat błędu w wizardzie (opcjonalnie)
- Przyciski pozostają aktywne, aby użytkownik mógł spróbować ponownie
- Toast notification informuje o błędzie

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów

1. Utworzyć plik `src/components/onboarding/types.ts`
2. Zdefiniować wszystkie interfejsy opisane w sekcji 5.2

### Krok 2: Instalacja komponentu Dialog z Shadcn/ui

```bash
npx shadcn@latest add dialog
```

### Krok 3: Implementacja custom hook

1. Utworzyć plik `src/components/hooks/useOnboardingWizard.ts`
2. Zaimplementować logikę zarządzania krokami
3. Zaimplementować wywołanie API

### Krok 4: Implementacja komponentów prezentacyjnych kroków

1. Utworzyć `src/components/onboarding/StepPriorities.tsx`
2. Utworzyć `src/components/onboarding/StepAI.tsx`
3. Utworzyć `src/components/onboarding/StepGetStarted.tsx`
4. Dla każdego komponentu:
   - Dodać nagłówek i treść informacyjną
   - Dodać wizualizacje (ikony, badge'y priorytetów)
   - Zastosować styling Tailwind

### Krok 5: Implementacja StepIndicator

1. Utworzyć `src/components/onboarding/StepIndicator.tsx`
2. Zaimplementować wizualizację postępu (3 kropki/kreski)
3. Dodać odpowiednie style dla stanów: aktywny, ukończony, przyszły

### Krok 6: Implementacja OnboardingNavigation

1. Utworzyć `src/components/onboarding/OnboardingNavigation.tsx`
2. Zaimplementować logikę warunkowego renderowania przycisków
3. Dodać loading state dla przycisków podczas API call

### Krok 7: Implementacja OnboardingStepContent

1. Utworzyć `src/components/onboarding/OnboardingStepContent.tsx`
2. Zaimplementować warunkowe renderowanie kroków
3. Dodać `aria-live="polite"` dla dostępności
4. Opcjonalnie: dodać animacje przejść

### Krok 8: Implementacja OnboardingWizard

1. Utworzyć `src/components/onboarding/OnboardingWizard.tsx`
2. Połączyć wszystkie komponenty
3. Zintegrować z hookiem `useOnboardingWizard`
4. Obsłużyć zamknięcie przez Escape i backdrop

### Krok 9: Utworzenie pliku index

1. Utworzyć `src/components/onboarding/index.ts`
2. Eksportować `OnboardingWizard` i typy

### Krok 10: Integracja z Dashboard

1. W `DashboardLayout` lub głównym komponencie Dashboard:
   - Dodać stan `showOnboarding`
   - Sprawdzać `profile.onboardingCompletedAt` przy ładowaniu
   - Renderować `OnboardingWizard` warunkowo
2. Przekazać callback `onComplete` do aktualizacji profilu

### Krok 11: Integracja z UserMenu

1. Dodać opcję "Powtórz wprowadzenie" w UserMenu
2. Podłączyć callback do otwarcia wizarda

### Krok 12: Dostępność

1. Dodać `aria-label` do przycisków
2. Dodać `aria-describedby` dla treści kroków
3. Zweryfikować focus management (focus trap w dialogu)
4. Przetestować nawigację klawiaturą

### Krok 13: Testy

1. Przetestować pełny przepływ onboardingu
2. Przetestować pominięcie na każdym kroku
3. Przetestować ponowne uruchomienie z menu
4. Przetestować obsługę błędów sieciowych
5. Przetestować dostępność (screen reader)

### Krok 14: Styling i animacje

1. Dodać animacje przejść między krokami (CSS transitions)
2. Zweryfikować respektowanie `prefers-reduced-motion`
3. Dopracować visual design zgodnie z designem aplikacji
