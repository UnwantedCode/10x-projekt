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

  async chat<T = string>(options: ChatOptions): Promise<ChatResponse<T>> {
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

  async chatWithSchema<T>(
    options: Omit<ChatOptions, "responseFormat"> & {
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

  private buildRequestBody(options: ChatOptions): OpenRouterRequestBody {
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
    let rawErrorBody: unknown;

    try {
      rawErrorBody = await response.json();
      const errorBody = rawErrorBody as { error?: { message?: string } };
      errorMessage = errorBody.error?.message ?? response.statusText;
      console.error("OpenRouter API error response:", JSON.stringify(rawErrorBody, null, 2));
    } catch {
      errorMessage = response.statusText;
      console.error("OpenRouter API error (no JSON body):", response.status, response.statusText);
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

export type { ChatMessage, ChatOptions, ChatResponse, JsonSchema, ResponseFormat };
