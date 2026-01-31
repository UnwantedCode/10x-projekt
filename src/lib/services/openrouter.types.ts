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

export interface ChatOptions {
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
