# Plan wdrożenia usługi OpenRouter

## 1. Opis usługi

Usługa OpenRouter to wydzielony moduł odpowiedzialny za komunikację z API OpenRouter w celu realizacji uzupełnień czatów opartych na modelach LLM. Usługa zostanie zaimplementowana jako klasa `OpenRouterService` w pliku `src/lib/services/openrouter.service.ts`.

### Główne odpowiedzialności

- Wysyłanie żądań do API OpenRouter z obsługą wiadomości systemowych i użytkownika
- Obsługa ustrukturyzowanych odpowiedzi poprzez `response_format` (JSON Schema)
- Zarządzanie konfiguracją modeli i ich parametrami
- Obsługa błędów, timeoutów i retry logic
- Walidacja odpowiedzi i parsowanie wyników

### Integracja z projektem

Usługa będzie wykorzystywana przez istniejący `aiInteraction.service.ts` do sugestii priorytetów zadań, a także może być rozszerzona o inne przypadki użycia AI w aplikacji.

---

## 2. Opis konstruktora

### Konfiguracja klasy

```typescript
interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  defaultTimeout?: number;
  siteUrl?: string;
  siteName?: string;
}
```

### Konstruktor

```typescript
class OpenRouterService {
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly defaultTimeout: number;
  private readonly siteUrl: string;
  private readonly siteName: string;
  private readonly baseUrl: string = "https://openrouter.ai/api/v1/chat/completions";

  constructor(config: OpenRouterConfig) {
    if (!config.apiKey) {
      throw new Error("OpenRouter API key is required");
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? "openai/gpt-4o-mini";
    this.defaultTimeout = config.defaultTimeout ?? 30000;
    this.siteUrl = config.siteUrl ?? "https://10x-projekt.local";
    this.siteName = config.siteName ?? "10x AI Task Manager";
  }
}
```

### Factory function

Zalecana metoda tworzenia instancji usługi:

```typescript
// src/lib/services/openrouter.service.ts

export function createOpenRouterService(): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return new OpenRouterService({
    apiKey,
    defaultModel: import.meta.env.OPENROUTER_MODEL,
    siteUrl: import.meta.env.SITE_URL,
    siteName: import.meta.env.SITE_NAME,
  });
}
```

---

## 3. Publiczne metody i pola

### 3.1 Metoda `chat`

Główna metoda do komunikacji z API OpenRouter.

```typescript
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions<T = unknown> {
  model?: string;
  messages: ChatMessage[];
  responseFormat?: ResponseFormat<T>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
}

interface ChatResponse<T = string> {
  content: T;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

async chat<T = string>(options: ChatOptions<T>): Promise<ChatResponse<T>>
```

**Przykład użycia z prostą odpowiedzią tekstową:**

```typescript
const service = createOpenRouterService();

const response = await service.chat({
  messages: [
    { role: "system", content: "Jesteś pomocnym asystentem." },
    { role: "user", content: "Czym jest TypeScript?" },
  ],
  temperature: 0.7,
});

console.log(response.content); // string
```

### 3.2 Metoda `chatWithSchema`

Dedykowana metoda do uzyskiwania ustrukturyzowanych odpowiedzi JSON.

```typescript
async chatWithSchema<T>(
  options: Omit<ChatOptions<T>, "responseFormat"> & {
    schema: JsonSchema;
    schemaName: string;
  }
): Promise<ChatResponse<T>>
```

**Przykład użycia z JSON Schema:**

```typescript
interface PrioritySuggestion {
  priority: 1 | 2 | 3;
  justification: string;
  tags: string[];
}

const response = await service.chatWithSchema<PrioritySuggestion>({
  messages: [
    { role: "system", content: "Analizujesz zadania i sugerujesz priorytety." },
    { role: "user", content: "Tytuł: Przygotuj raport\nOpis: Raport kwartalny dla zarządu" },
  ],
  schema: {
    type: "object",
    properties: {
      priority: { type: "integer", enum: [1, 2, 3] },
      justification: { type: "string", maxLength: 300 },
      tags: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["priority", "justification", "tags"],
    additionalProperties: false,
  },
  schemaName: "priority_suggestion",
  temperature: 0.3,
});

console.log(response.content.priority); // 1 | 2 | 3
console.log(response.content.justification); // string
```

### 3.3 Typy publiczne

```typescript
// Eksportowane typy
export interface ResponseFormat<T = unknown> {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

export interface JsonSchema {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number | boolean)[];
  additionalProperties?: boolean;
  description?: string;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
}

export type OpenRouterModel =
  | "openai/gpt-4o-mini"
  | "openai/gpt-4o"
  | "anthropic/claude-3.5-sonnet"
  | "anthropic/claude-3-haiku"
  | "meta-llama/llama-3.1-70b-instruct"
  | string;
```

---

## 4. Prywatne metody i pola

### 4.1 Prywatne pola

```typescript
private readonly apiKey: string;
private readonly defaultModel: string;
private readonly defaultTimeout: number;
private readonly siteUrl: string;
private readonly siteName: string;
private readonly baseUrl: string;
```

### 4.2 Metoda `buildRequestBody`

Buduje ciało żądania HTTP dla API OpenRouter.

```typescript
private buildRequestBody<T>(options: ChatOptions<T>): OpenRouterRequestBody {
  const body: OpenRouterRequestBody = {
    model: options.model ?? this.defaultModel,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1000,
  };

  if (options.topP !== undefined) {
    body.top_p = options.topP;
  }

  if (options.frequencyPenalty !== undefined) {
    body.frequency_penalty = options.frequencyPenalty;
  }

  if (options.presencePenalty !== undefined) {
    body.presence_penalty = options.presencePenalty;
  }

  if (options.responseFormat) {
    body.response_format = options.responseFormat;
  }

  return body;
}
```

### 4.3 Metoda `buildHeaders`

Buduje nagłówki HTTP wymagane przez API OpenRouter.

```typescript
private buildHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${this.apiKey}`,
    "HTTP-Referer": this.siteUrl,
    "X-Title": this.siteName,
  };
}
```

### 4.4 Metoda `executeRequest`

Wykonuje żądanie HTTP z obsługą timeout.

```typescript
private async executeRequest(
  body: OpenRouterRequestBody,
  timeout: number
): Promise<OpenRouterApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      await this.handleHttpError(response);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw this.normalizeError(error);
  }
}
```

### 4.5 Metoda `parseResponse`

Parsuje odpowiedź API i wyciąga treść.

```typescript
private parseResponse<T>(
  apiResponse: OpenRouterApiResponse,
  hasJsonSchema: boolean
): T {
  const content = apiResponse.choices?.[0]?.message?.content;

  if (!content) {
    throw new OpenRouterError(
      "Empty response from API",
      "EMPTY_RESPONSE"
    );
  }

  if (hasJsonSchema) {
    return this.parseJsonResponse<T>(content);
  }

  return content as T;
}

private parseJsonResponse<T>(content: string): T {
  try {
    return JSON.parse(content) as T;
  } catch {
    // Próba wyciągnięcia JSON z tekstu
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as T;
      } catch {
        throw new OpenRouterError(
          "Failed to parse JSON response",
          "PARSE_ERROR"
        );
      }
    }
    throw new OpenRouterError(
      "Response is not valid JSON",
      "PARSE_ERROR"
    );
  }
}
```

### 4.6 Metoda `handleHttpError`

Obsługuje błędy HTTP zwracane przez API.

```typescript
private async handleHttpError(response: Response): Promise<never> {
  let errorMessage: string;
  let errorCode: OpenRouterErrorCode;

  try {
    const errorBody = await response.json();
    errorMessage = errorBody.error?.message ?? response.statusText;
  } catch {
    errorMessage = response.statusText;
  }

  switch (response.status) {
    case 400:
      errorCode = "BAD_REQUEST";
      break;
    case 401:
      errorCode = "UNAUTHORIZED";
      break;
    case 402:
      errorCode = "INSUFFICIENT_CREDITS";
      break;
    case 429:
      errorCode = "RATE_LIMITED";
      break;
    case 500:
    case 502:
    case 503:
      errorCode = "SERVICE_UNAVAILABLE";
      break;
    default:
      errorCode = "UNKNOWN_ERROR";
  }

  throw new OpenRouterError(errorMessage, errorCode, response.status);
}
```

### 4.7 Metoda `normalizeError`

Normalizuje błędy do jednolitego formatu.

```typescript
private normalizeError(error: unknown): OpenRouterError {
  if (error instanceof OpenRouterError) {
    return error;
  }

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return new OpenRouterError(
        "Request timed out",
        "TIMEOUT"
      );
    }

    if (error.message.includes("fetch")) {
      return new OpenRouterError(
        "Network error",
        "NETWORK_ERROR"
      );
    }

    return new OpenRouterError(
      error.message,
      "UNKNOWN_ERROR"
    );
  }

  return new OpenRouterError(
    "An unexpected error occurred",
    "UNKNOWN_ERROR"
  );
}
```

---

## 5. Obsługa błędów

### 5.1 Klasa błędu `OpenRouterError`

```typescript
// src/lib/errors/openrouter.error.ts

export type OpenRouterErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "EMPTY_RESPONSE"
  | "INVALID_CONFIG"
  | "UNKNOWN_ERROR";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }

  /**
   * Czy błąd jest tymczasowy i warto ponowić żądanie
   */
  get isRetryable(): boolean {
    return ["RATE_LIMITED", "SERVICE_UNAVAILABLE", "TIMEOUT", "NETWORK_ERROR"].includes(this.code);
  }

  /**
   * Czy błąd jest związany z konfiguracją
   */
  get isConfigError(): boolean {
    return ["UNAUTHORIZED", "INSUFFICIENT_CREDITS", "INVALID_CONFIG"].includes(this.code);
  }
}
```

### 5.2 Scenariusze błędów i ich obsługa

| Scenariusz                 | Kod błędu              | Status HTTP | Wiadomość dla użytkownika              |
| -------------------------- | ---------------------- | ----------- | -------------------------------------- |
| Brak klucza API            | `INVALID_CONFIG`       | -           | "AI service is not configured"         |
| Nieprawidłowy klucz API    | `UNAUTHORIZED`         | 401         | "AI service authentication failed"     |
| Brak środków na koncie     | `INSUFFICIENT_CREDITS` | 402         | "AI service temporarily unavailable"   |
| Przekroczenie limitu żądań | `RATE_LIMITED`         | 429         | "AI service is busy, please try again" |
| Timeout żądania            | `TIMEOUT`              | -           | "AI service took too long to respond"  |
| Błąd sieci                 | `NETWORK_ERROR`        | -           | "Could not connect to AI service"      |
| Błąd serwera OpenRouter    | `SERVICE_UNAVAILABLE`  | 5xx         | "AI service temporarily unavailable"   |
| Nieprawidłowe żądanie      | `BAD_REQUEST`          | 400         | "Invalid request to AI service"        |
| Pusta odpowiedź            | `EMPTY_RESPONSE`       | -           | "AI service returned empty response"   |
| Błąd parsowania JSON       | `PARSE_ERROR`          | -           | "Could not understand AI response"     |

### 5.3 Przykład obsługi błędów w warstwie API

```typescript
// src/pages/api/ai/suggest.ts

import { OpenRouterError } from "@/lib/errors/openrouter.error";

export const POST: APIRoute = async (context) => {
  try {
    // ... logika sugestii AI
  } catch (error) {
    if (error instanceof OpenRouterError) {
      const statusMap: Record<OpenRouterErrorCode, number> = {
        BAD_REQUEST: 400,
        UNAUTHORIZED: 503,
        INSUFFICIENT_CREDITS: 503,
        RATE_LIMITED: 503,
        SERVICE_UNAVAILABLE: 503,
        TIMEOUT: 503,
        NETWORK_ERROR: 503,
        PARSE_ERROR: 503,
        EMPTY_RESPONSE: 503,
        INVALID_CONFIG: 503,
        UNKNOWN_ERROR: 500,
      };

      return new Response(
        JSON.stringify({
          error: "AI_SERVICE_ERROR",
          message: error.isConfigError ? "AI service is not available" : "AI service temporarily unavailable",
        }),
        { status: statusMap[error.code] }
      );
    }

    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      }),
      { status: 500 }
    );
  }
};
```

---

## 6. Kwestie bezpieczeństwa

### 6.1 Ochrona klucza API

1. **Przechowywanie**: Klucz API musi być przechowywany wyłącznie w zmiennych środowiskowych
2. **Walidacja**: Sprawdzenie obecności klucza przy inicjalizacji usługi
3. **Nigdy nie eksponować**: Klucz nie może trafić do odpowiedzi API ani logów

```typescript
// .env
OPENROUTER_API_KEY = sk - or - v1 - xxxxxxxxxxxxx;

// Nigdy nie logować klucza
console.log("API Key:", this.apiKey); // ❌ ZABRONIONE
console.log("API configured:", !!this.apiKey); // ✅ OK
```

### 6.2 Sanityzacja danych wejściowych

Ochrona przed prompt injection:

````typescript
/**
 * Sanityzuje tekst przed włączeniem do promptu AI
 */
export function sanitizePromptInput(text: string, options: { maxLength?: number } = {}): string {
  const maxLength = options.maxLength ?? 1000;

  return (
    text
      // Usuń potencjalne instrukcje sterujące
      .replace(/```/g, "")
      .replace(/\{/g, "(")
      .replace(/\}/g, ")")
      // Usuń znaki kontrolne
      .replace(/[\x00-\x1F\x7F]/g, "")
      // Ogranicz długość
      .substring(0, maxLength)
      // Usuń nadmiarowe białe znaki
      .trim()
  );
}
````

### 6.3 Walidacja odpowiedzi

Zawsze waliduj odpowiedzi przed użyciem:

```typescript
import { z } from "zod";

const PrioritySuggestionSchema = z.object({
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  justification: z.string().max(300),
  tags: z.array(z.string()),
});

function validateAIResponse(response: unknown): PrioritySuggestion {
  const result = PrioritySuggestionSchema.safeParse(response);

  if (!result.success) {
    console.error("Invalid AI response:", result.error);
    // Zwróć domyślne wartości
    return {
      priority: 2,
      justification: "Nie udało się przeanalizować zadania",
      tags: [],
    };
  }

  return result.data;
}
```

### 6.4 Rate limiting

Rozważ implementację rate limitingu po stronie aplikacji:

```typescript
// Przyszłe rozszerzenie - prosty in-memory rate limiter
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  canMakeRequest(userId: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) ?? [];

    // Usuń stare żądania
    const recentRequests = userRequests.filter((timestamp) => now - timestamp < windowMs);

    if (recentRequests.length >= maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    return true;
  }
}
```

### 6.5 Logowanie i audyt

```typescript
interface AIRequestLog {
  timestamp: string;
  userId: string;
  model: string;
  promptHash: string; // SHA256 hash, nie pełna treść
  success: boolean;
  errorCode?: string;
  latencyMs: number;
  tokensUsed?: number;
}

function logAIRequest(log: AIRequestLog): void {
  // Wysyłaj do systemu logowania
  console.info(
    "[AI Request]",
    JSON.stringify({
      ...log,
      // Nigdy nie loguj surowej treści promptu
    })
  );
}
```

---

## 7. Plan wdrożenia krok po kroku

### Krok 1: Konfiguracja zmiennych środowiskowych

**Plik:** `.env` (aktualizacja)

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_TIMEOUT=30000
SITE_URL=https://your-domain.com
SITE_NAME=AI Task Manager
```

**Plik:** `.env.example` (aktualizacja)

```env
# OpenRouter API Configuration
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
OPENROUTER_MODEL=openai/gpt-4o-mini
```

**Plik:** `src/env.d.ts` (aktualizacja)

```typescript
/// <reference types="astro/client" />
interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly OPENROUTER_MODEL?: string;
  readonly OPENROUTER_TIMEOUT?: string;
  readonly SITE_URL?: string;
  readonly SITE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Krok 2: Utworzenie klasy błędu

**Plik:** `src/lib/errors/openrouter.error.ts`

```typescript
export type OpenRouterErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "EMPTY_RESPONSE"
  | "INVALID_CONFIG"
  | "UNKNOWN_ERROR";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }

  get isRetryable(): boolean {
    return ["RATE_LIMITED", "SERVICE_UNAVAILABLE", "TIMEOUT", "NETWORK_ERROR"].includes(this.code);
  }

  get isConfigError(): boolean {
    return ["UNAUTHORIZED", "INSUFFICIENT_CREDITS", "INVALID_CONFIG"].includes(this.code);
  }
}
```

### Krok 3: Implementacja typów usługi

**Plik:** `src/lib/services/openrouter.types.ts`

```typescript
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JsonSchema {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  required?: string[];
  enum?: (string | number | boolean)[];
  additionalProperties?: boolean;
  description?: string;
  maxLength?: number;
  minLength?: number;
  minimum?: number;
  maximum?: number;
}

export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
  };
}

export interface ChatOptions<T = unknown> {
  model?: string;
  messages: ChatMessage[];
  responseFormat?: ResponseFormat;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
}

export interface ChatResponse<T = string> {
  content: T;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  defaultTimeout?: number;
  siteUrl?: string;
  siteName?: string;
}

// Wewnętrzne typy dla API OpenRouter
export interface OpenRouterRequestBody {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  response_format?: ResponseFormat;
}

export interface OpenRouterApiResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Krok 4: Implementacja głównej usługi

**Plik:** `src/lib/services/openrouter.service.ts`

```typescript
import { OpenRouterError, type OpenRouterErrorCode } from "@/lib/errors/openrouter.error";
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  JsonSchema,
  OpenRouterApiResponse,
  OpenRouterConfig,
  OpenRouterRequestBody,
  ResponseFormat,
} from "./openrouter.types";

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly defaultTimeout: number;
  private readonly siteUrl: string;
  private readonly siteName: string;
  private readonly baseUrl = "https://openrouter.ai/api/v1/chat/completions";

  constructor(config: OpenRouterConfig) {
    if (!config.apiKey) {
      throw new OpenRouterError("API key is required", "INVALID_CONFIG");
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel ?? "openai/gpt-4o-mini";
    this.defaultTimeout = config.defaultTimeout ?? 30000;
    this.siteUrl = config.siteUrl ?? "https://10x-projekt.local";
    this.siteName = config.siteName ?? "10x AI Task Manager";
  }

  /**
   * Wysyła żądanie chat completion do OpenRouter API
   */
  async chat<T = string>(options: ChatOptions<T>): Promise<ChatResponse<T>> {
    const body = this.buildRequestBody(options);
    const timeout = options.timeout ?? this.defaultTimeout;

    const response = await this.executeRequest(body, timeout);
    const content = this.parseResponse<T>(response, !!options.responseFormat);

    return {
      content,
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * Wysyła żądanie z oczekiwaną odpowiedzią w formacie JSON Schema
   */
  async chatWithSchema<T>(
    options: Omit<ChatOptions<T>, "responseFormat"> & {
      schema: JsonSchema;
      schemaName: string;
    }
  ): Promise<ChatResponse<T>> {
    const responseFormat: ResponseFormat = {
      type: "json_schema",
      json_schema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    };

    return this.chat<T>({
      ...options,
      responseFormat,
    });
  }

  private buildRequestBody<T>(options: ChatOptions<T>): OpenRouterRequestBody {
    const body: OpenRouterRequestBody = {
      model: options.model ?? this.defaultModel,
      messages: options.messages,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }

    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }

    if (options.frequencyPenalty !== undefined) {
      body.frequency_penalty = options.frequencyPenalty;
    }

    if (options.presencePenalty !== undefined) {
      body.presence_penalty = options.presencePenalty;
    }

    if (options.responseFormat) {
      body.response_format = options.responseFormat;
    }

    return body;
  }

  private buildHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "HTTP-Referer": this.siteUrl,
      "X-Title": this.siteName,
    };
  }

  private async executeRequest(body: OpenRouterRequestBody, timeout: number): Promise<OpenRouterApiResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        await this.handleHttpError(response);
      }

      return (await response.json()) as OpenRouterApiResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw this.normalizeError(error);
    }
  }

  private parseResponse<T>(apiResponse: OpenRouterApiResponse, hasJsonSchema: boolean): T {
    const content = apiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new OpenRouterError("Empty response from API", "EMPTY_RESPONSE");
    }

    if (hasJsonSchema) {
      return this.parseJsonResponse<T>(content);
    }

    return content as T;
  }

  private parseJsonResponse<T>(content: string): T {
    try {
      return JSON.parse(content) as T;
    } catch {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T;
        } catch {
          throw new OpenRouterError("Failed to parse JSON response", "PARSE_ERROR");
        }
      }
      throw new OpenRouterError("Response is not valid JSON", "PARSE_ERROR");
    }
  }

  private async handleHttpError(response: Response): Promise<never> {
    let errorMessage: string;

    try {
      const errorBody = (await response.json()) as { error?: { message?: string } };
      errorMessage = errorBody.error?.message ?? response.statusText;
    } catch {
      errorMessage = response.statusText;
    }

    let errorCode: OpenRouterErrorCode;

    switch (response.status) {
      case 400:
        errorCode = "BAD_REQUEST";
        break;
      case 401:
        errorCode = "UNAUTHORIZED";
        break;
      case 402:
        errorCode = "INSUFFICIENT_CREDITS";
        break;
      case 429:
        errorCode = "RATE_LIMITED";
        break;
      case 500:
      case 502:
      case 503:
        errorCode = "SERVICE_UNAVAILABLE";
        break;
      default:
        errorCode = "UNKNOWN_ERROR";
    }

    throw new OpenRouterError(errorMessage, errorCode, response.status);
  }

  private normalizeError(error: unknown): OpenRouterError {
    if (error instanceof OpenRouterError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return new OpenRouterError("Request timed out", "TIMEOUT");
      }

      if (error.message.includes("fetch") || error.message.includes("network")) {
        return new OpenRouterError("Network error", "NETWORK_ERROR");
      }

      return new OpenRouterError(error.message, "UNKNOWN_ERROR");
    }

    return new OpenRouterError("An unexpected error occurred", "UNKNOWN_ERROR");
  }
}

/**
 * Factory function do tworzenia instancji OpenRouterService
 */
export function createOpenRouterService(): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new OpenRouterError("OPENROUTER_API_KEY environment variable is not set", "INVALID_CONFIG");
  }

  return new OpenRouterService({
    apiKey,
    defaultModel: import.meta.env.OPENROUTER_MODEL,
    defaultTimeout: import.meta.env.OPENROUTER_TIMEOUT ? parseInt(import.meta.env.OPENROUTER_TIMEOUT, 10) : undefined,
    siteUrl: import.meta.env.SITE_URL,
    siteName: import.meta.env.SITE_NAME,
  });
}

// Eksport typów
export type { ChatMessage, ChatOptions, ChatResponse, JsonSchema, ResponseFormat };
```

### Krok 5: Utworzenie helpera do sanityzacji

**Plik:** `src/lib/utils/prompt.utils.ts`

````typescript
/**
 * Sanityzuje tekst przed włączeniem do promptu AI
 * Chroni przed prompt injection
 */
export function sanitizePromptInput(text: string, options: { maxLength?: number } = {}): string {
  const maxLength = options.maxLength ?? 1000;

  return text
    .replace(/```/g, "")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .substring(0, maxLength)
    .trim();
}

/**
 * Generuje SHA256 hash promptu dla celów logowania/cachowania
 */
export async function hashPrompt(prompt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(prompt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
````

### Krok 6: Refaktoryzacja istniejącego aiInteraction.service.ts

Zrefaktoryzuj istniejącą usługę, aby korzystała z `OpenRouterService`:

```typescript
// src/lib/services/aiInteraction.service.ts

import { createOpenRouterService, type ChatMessage } from "./openrouter.service";
import { sanitizePromptInput } from "@/lib/utils/prompt.utils";
import type { TaskPriority } from "@/types";

// ... istniejące typy i importy

interface AIPrioritySuggestion {
  priority: 1 | 2 | 3;
  justification: string;
  tags: string[];
}

const PRIORITY_SUGGESTION_SCHEMA = {
  type: "object" as const,
  properties: {
    priority: { type: "integer" as const, enum: [1, 2, 3] },
    justification: { type: "string" as const, maxLength: 300 },
    tags: {
      type: "array" as const,
      items: { type: "string" as const },
    },
  },
  required: ["priority", "justification", "tags"],
  additionalProperties: false,
};

async function callOpenRouter(title: string, description: string | null): Promise<AIServiceResponse> {
  const openrouter = createOpenRouterService();

  const sanitizedTitle = sanitizePromptInput(title, { maxLength: 200 });
  const sanitizedDescription = description ? sanitizePromptInput(description, { maxLength: 500 }) : "Brak opisu";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Jesteś asystentem do zarządzania zadaniami. Analizujesz zadania i sugerujesz priorytety.

Priorytety:
- 1 = niski (zadania, które można odłożyć)
- 2 = średni (normalne zadania do wykonania)
- 3 = wysoki (pilne zadania z deadline'ami lub wysokim wpływem)

Dostępne tagi: deadline, impact, complexity, stakeholders, dependencies, risk`,
    },
    {
      role: "user",
      content: `Przeanalizuj poniższe zadanie i zasugeruj priorytet.

Tytuł: ${sanitizedTitle}
Opis: ${sanitizedDescription}`,
    },
  ];

  const response = await openrouter.chatWithSchema<AIPrioritySuggestion>({
    messages,
    schema: PRIORITY_SUGGESTION_SCHEMA,
    schemaName: "priority_suggestion",
    temperature: 0.3,
    maxTokens: 500,
  });

  const validTags = ["deadline", "impact", "complexity", "stakeholders", "dependencies", "risk"];

  return {
    suggestedPriority: response.content.priority as TaskPriority,
    justification: response.content.justification.substring(0, 300),
    justificationTags: response.content.tags.filter((tag) => validTags.includes(tag)),
  };
}
```

### Krok 7: Testy manualne

1. **Test podstawowego żądania:**

```bash
# Uruchom serwer deweloperski
npm run dev

# Test endpoint AI (wymaga zalogowanego użytkownika)
curl -X POST http://localhost:3000/api/ai/suggest \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=..." \
  -d '{"title": "Przygotować raport kwartalny", "description": "Raport dla zarządu, termin do piątku"}'
```

2. **Test obsługi błędów:**

```bash
# Test z nieprawidłowym kluczem API (zmień w .env na nieprawidłowy)
# Oczekiwany wynik: 503 Service Unavailable

# Test z pustym title
curl -X POST http://localhost:3000/api/ai/suggest \
  -H "Content-Type: application/json" \
  -d '{"title": ""}'
# Oczekiwany wynik: 400 Bad Request
```

3. **Test response_format (JSON Schema):**

Sprawdź czy odpowiedź zawiera poprawną strukturę:

- `suggestedPriority`: 1, 2 lub 3
- `justification`: string max 300 znaków
- `justificationTags`: tablica stringów z dozwolonych tagów

### Krok 8: Aktualizacja dokumentacji

1. Zaktualizuj `CLAUDE.md` o informacje o usłudze OpenRouter
2. Zaktualizuj `.claude/rules/general.md` jeśli potrzeba
3. Dodaj komentarze JSDoc do wszystkich publicznych metod i typów

---

## Podsumowanie

Plan wdrożenia obejmuje:

1. **Wydzieloną usługę `OpenRouterService`** z czystym interfejsem API
2. **Wsparcie dla JSON Schema** poprzez `response_format` dla ustrukturyzowanych odpowiedzi
3. **Kompleksową obsługę błędów** z typowanymi kodami błędów
4. **Bezpieczeństwo** - sanityzacja inputów, ochrona klucza API, walidacja odpowiedzi
5. **Integrację z istniejącym kodem** - refaktoryzacja `aiInteraction.service.ts`

Usługa jest zaprojektowana jako rozszerzalna - można łatwo dodać nowe przypadki użycia AI (np. generowanie opisów, kategoryzacja) korzystając z tych samych metod `chat` i `chatWithSchema`.
