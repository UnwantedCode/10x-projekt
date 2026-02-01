# Plan Testów dla Aplikacji "AI Task Manager"

## 1. Wprowadzenie i cele testowania

### 1.1. Wprowadzenie
Niniejszy dokument stanowi kompleksowy plan testów dla aplikacji internetowej "AI Task Manager". Jest to aplikacja typu "Software as a Service" (SaaS) zbudowana w oparciu o nowoczesny stos technologiczny, obejmujący Astro, React, TypeScript, Supabase jako backend (BaaS) oraz integrację z zewnętrznym API (OpenRouter) w celu implementacji funkcji opartych na sztucznej inteligencji. Aplikacja umożliwia użytkownikom zarządzanie zadaniami pogrupowanymi w listy, z kluczową funkcjonalnością sugerowania priorytetów zadań przez AI.

### 1.2. Cele testowania
Głównym celem procesu testowania jest zapewnienie najwyższej jakości, niezawodności, wydajności i bezpieczeństwa aplikacji przed jej wdrożeniem produkcyjnym.

Szczegółowe cele obejmują:
*   **Weryfikacja funkcjonalna:** Upewnienie się, że wszystkie funkcje aplikacji działają zgodnie z założeniami, w tym m.in. autentykacja, zarządzanie listami i zadaniami (CRUD), filtrowanie, sortowanie oraz integracja z AI.
*   **Zapewnienie jakości UI/UX:** Sprawdzenie, czy interfejs użytkownika jest intuicyjny, responsywny i spójny wizualnie na różnych urządzeniach i przeglądarkach.
*   **Ocena niezawodności:** Identyfikacja i eliminacja błędów, które mogłyby prowadzić do awarii aplikacji lub utraty danych.
*   **Testowanie bezpieczeństwa:** Weryfikacja, czy dane użytkowników są bezpieczne i czy istnieją odpowiednie zabezpieczenia przed nieautoryzowanym dostępem.
*   **Weryfikacja wydajności:** Ocena, jak aplikacja radzi sobie pod obciążeniem, zwłaszcza w kontekście dużej liczby zadań i list.
*   **Walidacja integracji:** Sprawdzenie poprawności komunikacji z usługami zewnętrznymi, takimi jak Supabase i OpenRouter API, w tym obsługi błędów.

## 2. Zakres testów

### 2.1. Funkcjonalności objęte testami (In-Scope)
*   **Moduł uwierzytelniania:**
    *   Rejestracja nowego użytkownika.
    *   Logowanie i wylogowywanie.
    *   Proces odzyskiwania hasła.
    *   Walidacja formularzy i obsługa błędów.
*   **Panel główny (Dashboard):**
    *   Zarządzanie listami zadań (tworzenie, odczyt, aktualizacja, usuwanie - CRUD).
    *   Zarządzanie zadaniami (CRUD w kontekście wybranej listy).
    *   Zmiana statusu zadania (do zrobienia/zrobione).
    *   Edycja zadań w dedykowanym oknie modalnym.
*   **Filtrowanie i Sortowanie Zadań:**
    *   Filtrowanie po statusie (pokaż/ukryj ukończone).
    *   Sortowanie zadań według priorytetu, daty utworzenia i kolejności własnej.
    *   Wyszukiwanie tekstowe zadań.
*   **Funkcjonalność AI:**
    *   Generowanie sugestii priorytetu dla nowych i istniejących zadań.
    *   Obsługa akcji użytkownika (akceptacja, modyfikacja, odrzucenie sugestii).
    *   Obsługa błędów i niedostępności usługi AI.
*   **Onboarding:**
    *   Wyświetlanie kreatora onboardingu dla nowych użytkowników.
    *   Możliwość ukończenia lub pominięcia onboardingu.
*   **API Backendu:**
    *   Weryfikacja wszystkich punktów końcowych API pod kątem logiki biznesowej, bezpieczeństwa i walidacji danych wejściowych.

### 2.2. Funkcjonalności wyłączone z testów (Out-of-Scope)
*   Testowanie wewnętrznej infrastruktury Supabase oraz OpenRouter.
*   Testy jednostkowe zewnętrznych bibliotek UI (np. Radix UI), zakładamy ich poprawność; testujemy jedynie ich implementację.
*   Szczegółowe testy kompatybilności z nieobsługiwanymi lub przestarzałymi przeglądarkami.

## 3. Typy testów do przeprowadzenia

Proces testowania zostanie podzielony na kilka poziomów, aby zapewnić kompleksowe pokrycie.

*   **Testy Jednostkowe (Unit Tests):** Skupią się na weryfikacji małych, izolowanych fragmentów kodu – głównie funkcji pomocniczych, hooków Reacta oraz logiki w serwisach po stronie serwera.
*   **Testy Komponentów (Component Tests):** Będą weryfikować pojedyncze komponenty UI (Astro/React) w izolacji, sprawdzając ich renderowanie i zachowanie w odpowiedzi na interakcje użytkownika.
*   **Testy Integracyjne (Integration Tests):** Połączą kilka modułów w celu weryfikacji ich współpracy. Przykłady obejmują testowanie formularzy logowania z ich logiką (hookami) lub interakcję między panelem bocznym (listy) a główną zawartością (zadania).
*   **Testy End-to-End (E2E):** Zautomatyzowane scenariusze symulujące pełne przepływy użytkownika w aplikacji, od rejestracji po zarządzanie zadaniami.
*   **Testy API:** Bezpośrednie testowanie punktów końcowych API w celu weryfikacji logiki biznesowej, autoryzacji, walidacji danych wejściowych (Zod schemas) i poprawności odpowiedzi serwera.
*   **Testy Wydajnościowe:** Skoncentrowane na mierzeniu czasu ładowania aplikacji, responsywności interfejsu przy dużej liczbie danych (np. setki zadań) i działania funkcji "infinite scroll".
*   **Testy Bezpieczeństwa:** Weryfikacja zabezpieczeń, w szczególności uprawnień dostępu do danych (czy użytkownik A może odczytać/zmodyfikować dane użytkownika B) oraz walidacji danych wejściowych po stronie serwera.
*   **Testy Użyteczności i Dostępności (Manualne):** Ręczne testy eksploracyjne w celu oceny ogólnego doświadczenia użytkownika (UX) oraz weryfikacji zgodności z podstawowymi standardami dostępności (WCAG).

## 4. Scenariusze testowe dla kluczowych funkcjonalności

Poniżej przedstawiono przykładowe, wysokopoziomowe scenariusze testowe. Szczegółowe przypadki testowe zostaną opracowane w osobnym dokumencie.

| ID | Funkcjonalność | Scenariusz | Oczekiwany Rezultat | Priorytet |
|---|---|---|---|---|
| **AUTH-01** | Rejestracja | Użytkownik wypełnia formularz poprawnymi danymi (unikalny e-mail, silne hasło, akceptacja regulaminu) i klika "Zarejestruj się". | Konto zostaje utworzone, a użytkownik jest przekierowany na stronę logowania z komunikatem o sukcesie. | Krytyczny |
| **AUTH-02** | Logowanie | Zarejestrowany użytkownik podaje poprawne dane logowania. | Użytkownik zostaje pomyślnie zalogowany i przekierowany do panelu głównego (`/app`). | Krytyczny |
| **AUTH-03** | Walidacja | Użytkownik próbuje zarejestrować się z już istniejącym adresem e-mail lub z hasłami, które się nie zgadzają. | Formularz wyświetla czytelne komunikaty o błędach przy odpowiednich polach. | Wysoki |
| **LIST-01** | Tworzenie listy | Zalogowany użytkownik tworzy nową listę o unikalnej nazwie. | Nowa lista pojawia się na pasku bocznym i staje się aktywną listą. | Krytyczny |
| **LIST-02** | Usuwanie listy | Użytkownik usuwa istniejącą listę. | Lista jest usuwana z paska bocznego. Jeśli była aktywna, wybrana zostaje inna lista lub żadna. Wszystkie zadania powiązane z listą są usuwane. | Wysoki |
| **TASK-01** | Tworzenie zadania | Użytkownik dodaje nowe zadanie z tytułem i priorytetem do aktywnej listy. | Zadanie pojawia się na liście zadań w odpowiedniej grupie priorytetowej. | Krytyczny |
| **TASK-02** | Zmiana statusu | Użytkownik zaznacza checkbox przy zadaniu. | Status zadania zmienia się na "ukończone", a interfejs jest odpowiednio aktualizowany (np. styl przekreślenia). | Krytyczny |
| **TASK-03** | Sortowanie | Użytkownik zmienia tryb sortowania na "Własna kolejność" i przeciąga zadanie w inne miejsce na liście. | Po odświeżeniu strony kolejność zadań zostaje zachowana. | Średni |
| **AI-01** | Sugestia AI | Użytkownik wpisuje tytuł zadania (np. "Prepare quarterly financial report") i klika "Zasugeruj priorytet". | Aplikacja komunikuje się z API AI i wyświetla panel z sugerowanym priorytetem (np. Wysoki) i uzasadnieniem. | Wysoki |
| **AI-02** | Błąd AI | Usługa AI (OpenRouter) jest niedostępna. Użytkownik próbuje uzyskać sugestię. | Aplikacja wyświetla stosowny komunikat o błędzie (np. toast), nie blokując dalszej pracy. | Wysoki |
| **PERF-01** | Wydajność | Użytkownik otwiera listę zawierającą ponad 500 zadań. | Aplikacja ładuje się w akceptowalnym czasie (< 3s), a przewijanie listy jest płynne dzięki "infinite scroll". | Średni |
| **SEC-01** | Izolacja danych | Użytkownik 1 próbuje uzyskać dostęp do listy lub zadania użytkownika 2 poprzez bezpośrednie wywołanie API z odpowiednim ID. | API zwraca błąd 404 (Not Found) lub 403 (Forbidden), uniemożliwiając dostęp do danych. | Krytyczny |

## 5. Środowisko testowe

*   **Środowisko developerskie (lokalne):** Używane do pisania i uruchamiania testów jednostkowych i komponentowych.
*   **Środowisko stagingowe (testowe):** Osobna instancja aplikacji wdrożona w środowisku zbliżonym do produkcyjnego. Będzie korzystać z dedykowanej bazy danych Supabase, zasilonej danymi testowymi (seed). Wszystkie testy integracyjne, E2E i manualne będą przeprowadzane na tym środowisku.
*   **Przeglądarki:** Testy będą przeprowadzane na najnowszych wersjach przeglądarek:
    *   Google Chrome (podstawowa)
    *   Mozilla Firefox
    *   Microsoft Edge
    *   Safari
*   **Urządzenia:** Testy responsywności będą wykonywane na emulatorach urządzeń mobilnych (w narzędziach deweloperskich przeglądarki) oraz na wybranych urządzeniach fizycznych.

## 6. Narzędzia do testowania

| Typ testu | Narzędzie | Uzasadnienie |
|---|---|---|
| **Testy jednostkowe, komponentowe i integracyjne** | **Vitest** z **React Testing Library** | Vitest to nowoczesny i szybki framework do testowania, w pełni kompatybilny z Vite, na którym opiera się Astro. React Testing Library promuje dobre praktyki testowania komponentów z perspektywy użytkownika. |
| **Testy End-to-End** | **Playwright** | Nowoczesne narzędzie od Microsoftu, zapewniające szybkie i niezawodne testy E2E na wszystkich głównych silnikach przeglądarek. Umożliwia łatwą obsługę scenariuszy logowania i testowanie złożonych interakcji. |
| **Testy API** | **Vitest** (z `supertest` lub `fetch`) / **Postman** | Vitest może być użyty do zautomatyzowanych testów API w ramach CI/CD. Postman będzie wykorzystywany do testów eksploracyjnych i manualnej weryfikacji API. |
| **Testy wydajności** | **Google Lighthouse** / **WebPageTest** | Standardowe narzędzia do audytu wydajności, dostępne bezpośrednio w przeglądarce lub jako usługa online. |
| **CI/CD** | **GitHub Actions** | Integracja z repozytorium kodu w celu automatycznego uruchamiania testów po każdym pushu do kluczowych gałęzi (main, develop). |

## 7. Harmonogram testów

Testowanie będzie procesem ciągłym, zintegrowanym z cyklem rozwoju oprogramowania (CI/CD).

*   **Faza 1: Rozwój (Sprint 1-4)**
    *   Deweloperzy piszą testy jednostkowe i komponentowe równolegle z tworzeniem nowych funkcjonalności.
    *   Inżynier QA przygotowuje scenariusze i skrypty dla testów E2E i API.
*   **Faza 2: Stabilizacja (Sprint 5)**
    *   Intensywne testy integracyjne i E2E na środowisku stagingowym.
    *   Przeprowadzenie pierwszej tury testów manualnych, wydajnościowych i bezpieczeństwa.
*   **Faza 3: Regresja (przed wdrożeniem)**
    *   Pełne wykonanie wszystkich testów E2E i krytycznych testów manualnych w celu zapewnienia, że ostatnie poprawki nie wprowadziły nowych błędów.
*   **Po wdrożeniu:**
    *   Testy "dymne" (smoke tests) na środowisku produkcyjnym w celu weryfikacji kluczowych funkcjonalności.

## 8. Kryteria akceptacji testów

### 8.1. Kryteria wejścia (rozpoczęcia testów)
*   Funkcjonalność została zaimplementowana i wdrożona na środowisku stagingowym.
*   Testy jednostkowe i komponentowe dla danej funkcjonalności zostały napisane i przechodzą pomyślnie.
*   Dostępna jest dokumentacja techniczna (jeśli dotyczy).

### 8.2. Kryteria wyjścia (zakończenia testów)
*   **100%** krytycznych i wysokich scenariuszy testowych E2E zakończyło się powodzeniem.
*   Pokrycie kodu testami jednostkowymi wynosi co najmniej **80%**.
*   **Brak otwartych błędów** o priorytecie krytycznym (blokującym) lub wysokim.
*   Wszystkie zidentyfikowane luki bezpieczeństwa zostały naprawione.
*   Wyniki testów wydajnościowych spełniają założone progi (np. wskaźnik Lighthouse > 90).

## 9. Role i odpowiedzialności

*   **Inżynier QA (Lider Testów):**
    *   Tworzenie i utrzymanie planu testów.
    *   Projektowanie i implementacja testów E2E i API.
    *   Przeprowadzanie testów manualnych, eksploracyjnych i regresji.
    *   Zarządzanie procesem raportowania błędów.
*   **Deweloperzy:**
    *   Pisanie testów jednostkowych i komponentowych.
    *   Poprawianie zgłoszonych błędów.
    *   Uczestnictwo w code review, w tym przegląd testów.
*   **Project Manager / Product Owner:**
    *   Definiowanie priorytetów dla testowanych funkcjonalności.
    *   Akceptacja wyników testów.

## 10. Procedury raportowania błędów

Wszystkie zidentyfikowane błędy będą raportowane w systemie do śledzenia zadań (np. Jira, GitHub Issues).

Każdy raport o błędzie musi zawierać następujące informacje:
*   **Tytuł:** Zwięzły i jednoznaczny opis problemu.
*   **Środowisko:** Wersja aplikacji, przeglądarka, system operacyjny.
*   **Kroki do odtworzenia:** Szczegółowa, ponumerowana lista kroków prowadzących do wystąpienia błędu.
*   **Rezultat oczekiwany:** Opis, jak aplikacja powinna się zachować.
*   **Rezultat aktualny:** Opis, jak aplikacja faktycznie się zachowała.
*   **Priorytet/Waga:**
    *   **Krytyczny:** Blokuje działanie kluczowych funkcjonalności, brak obejścia.
    *   **Wysoki:** Poważnie zakłóca działanie funkcjonalności, ale istnieje obejście.
    *   **Średni:** Powoduje nieprawidłowe działanie, ale nie jest to kluczowa funkcja.
    *   **Niski:** Drobny błąd kosmetyczny lub literówka.
*   **Załączniki:** Zrzuty ekranu, nagrania wideo, logi z konsoli.