# Plan implementacji brakujących elementów sugestii AI

## 1. Przegląd

Dokument opisuje plan wdrożenia brakującej funkcjonalności związanej z sugestiami AI w formularzu zadania. Obecna implementacja (`InlineTaskInput`) wyświetla sugestię i automatycznie ustawia priorytet, ale **nie rejestruje decyzji użytkownika** ani **nie oferuje wyboru** między akceptacją, modyfikacją i odrzuceniem.

**Zakres planu:**

- Frontend: panel akcji, rejestracja decyzji, hook, flow
- Backend: brak zmian – endpoint `PATCH /api/ai-interactions/:id` istnieje i działa
- Integracja API: funkcja `recordAIDecision` w kliencie API

**Odniesienia:**

- `doc/view_implementation_plan/task-form-modal-view-implementation-plan.md` – szczegóły UI i flow
- `doc/api_implementation_plan/record-ai-decision-endpoint-implementation-plan.md` – specyfikacja endpointu
- `.claude/rules/general.md`, `frontend.md`, `backend.md` – reguły projektowe

---

## 2. Analiza luk

### 2.1 Obecny stan

| Element                                 | Status            | Uwagi                             |
| --------------------------------------- | ----------------- | --------------------------------- |
| `POST /api/ai/suggest`                  | ✅ Działa         | Wywoływany z `suggestPriority()`  |
| `PATCH /api/ai-interactions/:id`        | ✅ Backend gotowy | Brak wywołania z frontendu        |
| `recordAIDecision` w `dashboard.api.ts` | ❌ Brak           | Endpoint nieużywany               |
| Przechowywanie `interactionId`          | ❌ Brak           | Zwracane przez API, ignorowane    |
| Panel z Akceptuj / Modyfikuj / Odrzuć   | ❌ Brak           | Tylko wyświetlenie uzasadnienia   |
| `RejectionReasonInput`                  | ❌ Brak           | Brak pola powodu odrzucenia       |
| `useAISuggestion`                       | ❌ Brak           | Logika inline w `InlineTaskInput` |

### 2.2 Ograniczenie: flow tworzenia zadania (taskId = null)

Gdy `taskId` jest `null` (nowe zadanie), backend **nie zapisuje** interakcji do bazy (tabela `ai_interactions` wymaga `task_id` NOT NULL). W odpowiedzi zwracane jest tymczasowe `interactionId` (random UUID), które **nie istnieje w bazie**.

**Konsekwencja:** `PATCH /api/ai-interactions/:id` zwróci **404** dla interakcji z flow tworzenia.

**Rozwiązanie w tym planie:**

- **taskId podany (edycja)**: zawsze wywoływać `recordAIDecision`
- **taskId = null (tworzenie)**: nie wywoływać `recordAIDecision`; decyzja użytkownika aktualizuje tylko stan formularza (priorytet / odrzucenie)

Ewentualne rozszerzenie (poza MVP): zmiana schematu (`task_id` nullable) i zapis interakcji bez zadania – wymaga migracji i logiki łączenia po utworzeniu zadania.

---

## 3. Struktura plików

```
src/
├── lib/
│   └── api/
│       └── dashboard.api.ts          # Dodanie recordAIDecision
├── components/
│   └── dashboard/
│       ├── InlineTaskInput.tsx       # Refaktor: integracja panelu i hooka
│       ├── AISuggestionPanel.tsx     # NOWY
│       ├── RejectionReasonInput.tsx  # NOWY
│       └── hooks/
│           └── useAISuggestion.ts    # NOWY (lub w src/components/hooks/)
└── types.ts                          # Istniejące typy – bez zmian
```

---

## 4. Backend

### 4.1 Stan backendu

- Endpoint `PATCH /api/ai-interactions/[id]` – **zaimplementowany**
- Serwis `recordDecision` – **działa**
- Schemat Zod `recordAIDecisionSchema` – **istnieje**
- Walidacja `decision` + `finalPriority` / `rejectedReason` – **gotowa**

**Brak wymaganych zmian po stronie backendu.**

### 4.2 Wymagane typy (już zdefiniowane w `src/types.ts`)

```typescript
type AIDecision = 1 | 2 | 3; // 1=Accept, 2=Modify, 3=Reject

interface RecordAIDecisionCommand {
  decision: AIDecision;
  finalPriority?: TaskPriority | null;
  rejectedReason?: string | null;
}

interface AIInteractionDTO {
  id: string;
  taskId: string;
  model: string;
  suggestedPriority: number;
  justification: string | null;
  justificationTags: string[];
  decision: number | null;
  decidedAt: string | null;
  finalPriority: number | null;
  rejectedReason: string | null;
  createdAt: string;
}
```

---

## 5. Frontend – klient API

### 5.1 Funkcja `recordAIDecision`

**Plik:** `src/lib/api/dashboard.api.ts`

**Dodanie:**

```typescript
import type { RecordAIDecisionCommand, AIInteractionDTO } from "@/types";

/**
 * Records user's decision on an AI suggestion.
 * Note: Only works when interaction exists in DB (i.e. taskId was provided to suggest).
 * For create flow (taskId=null), interaction is not persisted – do not call this.
 */
export async function recordAIDecision(
  interactionId: string,
  command: RecordAIDecisionCommand
): Promise<AIInteractionDTO> {
  const response = await safeFetch(`/api/ai-interactions/${interactionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  return handleResponse<AIInteractionDTO>(response);
}
```

**Obsługa błędów:**

- `handleResponse` obsługuje 400, 401, 404, 409, 500
- 404 – interakcja nie istnieje (np. flow tworzenia) → toast z komunikatem
- 409 – decyzja już zapisana → ukryć panel, kontynuować z formularzem

---

## 6. Frontend – hook `useAISuggestion`

### 6.1 Interfejs

**Plik:** `src/components/dashboard/hooks/useAISuggestion.ts`

```typescript
interface UseAISuggestionOptions {
  taskId?: string | null;
  onPriorityUpdate: (priority: TaskPriority) => void;
}

interface UseAISuggestionReturn {
  suggestion: AISuggestionDTO | null;
  isLoading: boolean;
  error: string | null;
  isProcessingDecision: boolean;

  requestSuggestion: (title: string, description: string | null) => Promise<void>;
  acceptSuggestion: () => Promise<void>;
  modifySuggestion: (priority: TaskPriority) => Promise<void>;
  rejectSuggestion: (reason: string) => Promise<void>;
  clearSuggestion: () => void;
  clearError: () => void;
}
```

### 6.2 Odpowiedzialności

1. **requestSuggestion**
   - Walidacja: `title.trim().length > 0`
   - Wywołanie `suggestPriority({ taskId, title, description })`
   - Zapis `suggestion` (z `interactionId`)
   - Obsługa błędów (503, sieć) – ustawienie `error`

2. **acceptSuggestion**
   - Jeśli `taskId` – wywołanie `recordAIDecision(interactionId, { decision: 1 })`
   - Wywołanie `onPriorityUpdate(suggestion.suggestedPriority)`
   - `clearSuggestion()`
   - Obsługa 404/409 – `clearSuggestion()`, toast jeśli potrzeba

3. **modifySuggestion**
   - Analogicznie, z `{ decision: 2, finalPriority }`
   - `onPriorityUpdate(priority)`

4. **rejectSuggestion**
   - `{ decision: 3, rejectedReason: reason }`
   - Brak zmiany priorytetu (nie wywoływać `onPriorityUpdate`)
   - `clearSuggestion()`

5. **taskId = null**
   - Przy akceptacji/modyfikacji/odrzuceniu **nie** wywoływać `recordAIDecision`
   - Tylko aktualizacja stanu formularza (priorytet lub brak zmiany)

### 6.3 Przepływ stanu

| Stan                          | suggestion      | isLoading | isProcessingDecision |
| ----------------------------- | --------------- | --------- | -------------------- |
| Idle                          | null            | false     | false                |
| Requesting                    | null            | true      | false                |
| Has suggestion                | AISuggestionDTO | false     | false                |
| Accepting/Modifying/Rejecting | AISuggestionDTO | false     | true                 |
| After decision                | null            | false     | false                |

---

## 7. Frontend – komponenty

### 7.1 `RejectionReasonInput`

**Plik:** `src/components/dashboard/RejectionReasonInput.tsx`

**Props:**

```typescript
interface RejectionReasonInputProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  maxLength?: number; // default 300
}
```

**Elementy:**

- `Input` lub `Textarea` z licznikiem znaków (max 300)
- Przycisk "Potwierdź odrzucenie" (primary)
- Przycisk "Anuluj" (ghost)

**Walidacja:**

- Min 1 znak (trimmed)
- Max 300 znaków
- Błąd przy pustym lub za długim tekście

**Accessibility:**

- `aria-label` dla pola
- `aria-describedby` dla licznika i błędu
- `aria-busy` podczas `isProcessing`

### 7.2 `AISuggestionPanel`

**Plik:** `src/components/dashboard/AISuggestionPanel.tsx`

**Props:**

```typescript
interface AISuggestionPanelProps {
  suggestion: AISuggestionDTO;
  currentPriority: TaskPriority | null;
  onAccept: () => void;
  onModify: (priority: TaskPriority) => void;
  onReject: (reason: string) => void;
  isProcessing: boolean;
}
```

**Elementy:**

1. Badge sugerowanego priorytetu (np. `PriorityBadge` / `PRIORITY_CONFIGS`)
2. Tekst uzasadnienia (`suggestion.justification`)
3. Opcjonalnie: tagi (`justificationTags`)
4. Przycisk "Akceptuj" (primary)
5. Przycisk "Modyfikuj" z dropdown priorytetów (bez sugerowanego)
6. Przycisk "Odrzuć" (destructive)
7. Warunkowe `RejectionReasonInput` po kliknięciu "Odrzuć"

**Logika modyfikacji:**

- Dropdown: Niski (1), Średni (2), Wysoki (3) – bez `suggestion.suggestedPriority`
- Po wyborze: `onModify(priority)`

**Logika odrzucenia:**

- Klik "Odrzuć" → pokazanie `RejectionReasonInput`
- Potwierdzenie z walidowanym powodem → `onReject(reason)`
- Anulowanie → ukrycie pola, panel nadal widoczny

**Stylowanie:**

- Karta/panel (`Card` lub div z border), spójne z resztą UI
- Kolory priorytetów zgodne z `PRIORITY_CONFIGS`

**Accessibility:**

- `role="status"` lub `aria-live="polite"` dla dynamicznej treści
- `aria-label` dla przycisków

---

## 8. Refaktor `InlineTaskInput`

### 8.1 Zmiana flow

**Obecnie:**

1. Klik "Zasugeruj priorytet" → `suggestPriority`
2. Odpowiedź → od razu `setPriority(data.suggestedPriority)`, wyświetlenie uzasadnienia
3. Brak wyboru użytkownika

**Docelowo:**

1. Klik "Zasugeruj priorytet" → `requestSuggestion`
2. Odpowiedź → zapis `suggestion` (z `interactionId`), **bez** automatycznej zmiany priorytetu
3. Render `AISuggestionPanel`
4. Akceptuj → priorytet + opcjonalnie `recordAIDecision` (gdy `taskId`)
5. Modyfikuj → wybór innego priorytetu + opcjonalnie `recordAIDecision`
6. Odrzuć → powód + opcjonalnie `recordAIDecision` (gdy `taskId`), priorytet bez zmian

### 8.2 Integracja hooka

```typescript
const {
  suggestion,
  isLoading: isSuggesting,
  error: suggestionError,
  isProcessingDecision,
  requestSuggestion,
  acceptSuggestion,
  modifySuggestion,
  rejectSuggestion,
  clearSuggestion,
  clearError,
} = useAISuggestion({
  taskId: null, // InlineTaskInput zawsze tworzy nowe zadanie
  onPriorityUpdate: setPriority,
});
```

### 8.3 Struktura JSX

- Przycisk "Zasugeruj priorytet" – bez zmian (już istnieje)
- Zamiast bloku z `suggestionJustification`:
  - `{suggestion && (
  <AISuggestionPanel
    suggestion={suggestion}
    currentPriority={priority}
    onAccept={acceptSuggestion}
    onModify={modifySuggestion}
    onReject={rejectSuggestion}
    isProcessing={isProcessingDecision}
  />
)}`
- `suggestionError` → toast lub lokalny komunikat błędu

### 8.4 Usunięcie

- `suggestionJustification` (string)
- `isAISuggestionRef`
- Automatyczne ustawianie priorytetu w `handleRequestSuggestion`
- Logika "nie czyść uzasadnienia przy zmianie priorytetu przez AI" – niepotrzebna

---

## 9. Obsługa błędów

### 9.1 Frontend

| Błąd                          | Akcja                                                     |
| ----------------------------- | --------------------------------------------------------- |
| 503 (AI niedostępne)          | Toast, `clearError`, użytkownik ustawia priorytet ręcznie |
| 404 (interakcja nie istnieje) | Toast "Decyzja nie została zapisana", `clearSuggestion`   |
| 409 (decyzja już zapisana)    | Toast "Decyzja została już zapisana", `clearSuggestion`   |
| Sieć / 500                    | Toast z komunikatem, `clearError`                         |

### 9.2 Walidacja

| Miejsce              | Warunek      | Komunikat                                |
| -------------------- | ------------ | ---------------------------------------- |
| RejectionReasonInput | Pusty        | "Podaj powód odrzucenia sugestii"        |
| RejectionReasonInput | > 300 znaków | "Powód może mieć maksymalnie 300 znaków" |
| Przycisk "Zasugeruj" | Brak tytułu  | Przycisk disabled                        |

---

## 10. Kroki implementacji

### Krok 1: API – `recordAIDecision`

1. Otwórz `src/lib/api/dashboard.api.ts`
2. Zaimportuj `RecordAIDecisionCommand`, `AIInteractionDTO`
3. Dodaj funkcję `recordAIDecision(interactionId, command)`
4. Upewnij się, że `handleResponse` obsługuje 404 i 409

### Krok 2: Hook `useAISuggestion`

1. Utwórz `src/components/dashboard/hooks/useAISuggestion.ts`
2. Implementacja stanu: `suggestion`, `isLoading`, `error`, `isProcessingDecision`
3. Implementacja `requestSuggestion` (wywołanie `suggestPriority`)
4. Implementacja `acceptSuggestion`, `modifySuggestion`, `rejectSuggestion` z warunkiem `taskId`
5. Implementacja `clearSuggestion`, `clearError`

### Krok 3: Komponent `RejectionReasonInput`

1. Utwórz `src/components/dashboard/RejectionReasonInput.tsx`
2. Pole tekstowe z licznikiem (max 300)
3. Walidacja on-confirm
4. Przyciski Potwierdź / Anuluj
5. Integracja z Shadcn (`Input`, `Button`, `Label`)

### Krok 4: Komponent `AISuggestionPanel`

1. Utwórz `src/components/dashboard/AISuggestionPanel.tsx`
2. Badge priorytetu (np. `PRIORITY_CONFIGS`)
3. Tekst uzasadnienia
4. Przyciski Akceptuj, Modyfikuj, Odrzuć
5. Dropdown priorytetów dla Modyfikuj (np. `Select` z Shadcn)
6. Warunkowe `RejectionReasonInput` dla Odrzuć

### Krok 5: Refaktor `InlineTaskInput`

1. Zastąp lokalną logikę AI hookiem `useAISuggestion`
2. Usuń `suggestionJustification`, `isAISuggestionRef`
3. Renderuj `AISuggestionPanel` zamiast ramki z uzasadnieniem
4. Zaktualizuj `handleRequestSuggestion` → `requestSuggestion`
5. Usuń automatyczne ustawianie priorytetu po odpowiedzi AI

### Krok 6: Testy manualne

- [ ] Sugestia → panel widoczny, priorytet nie zmienia się przed wyborem
- [ ] Akceptuj → priorytet ustawiony, panel znika (bez record – taskId null)
- [ ] Modyfikuj → dropdown, wybór innego priorytetu → priorytet zaktualizowany
- [ ] Odrzuć → pole powodu → walidacja pustego / > 300 → potwierdzenie → panel znika, priorytet bez zmian
- [ ] Błąd 503 → toast, możliwość ręcznego ustawienia priorytetu
- [ ] Przycisk "Zasugeruj" disabled przy pustym tytule

### Krok 7: Przygotowanie do flow edycji (TaskFormDialog)

Gdy pojawi się modal edycji z `taskId`:

1. Przekazać `taskId` do `useAISuggestion`
2. W `requestSuggestion` użyć `taskId` w `AISuggestCommand`
3. Hook automatycznie wywoła `recordAIDecision` przy Accept/Modify/Reject
4. Komponenty `AISuggestionPanel` i `RejectionReasonInput` pozostają bez zmian

---

## 11. Checklist przed zakończeniem

- [ ] `recordAIDecision` w `dashboard.api.ts`
- [ ] Hook `useAISuggestion` z obsługą `taskId` / brak `taskId`
- [ ] `RejectionReasonInput` z walidacją
- [ ] `AISuggestionPanel` z trzema akcjami
- [ ] Refaktor `InlineTaskInput` – panel zamiast auto-priorytetu
- [ ] Obsługa błędów (503, 404, 409)
- [ ] Brak regresji – dodawanie zadania bez AI działa
- [ ] Linter bez błędów
- [ ] Podstawowe testy dostępności (ARIA, klawiatura)

---

## 12. Zależności od innych widoków

Obecny plan dotyczy wyłącznie `InlineTaskInput`. Gdy zostanie wprowadzony `TaskFormDialog` (modal tworzenia/edycji):

- `AISuggestionPanel` i `RejectionReasonInput` mogą być współdzielone
- `useAISuggestion` przyjmie `taskId` z props modala
- Rejestracja decyzji w API będzie działać w flow edycji (gdy `taskId` jest podany)

Nic w tym planie nie blokuje późniejszej integracji z modalem.
