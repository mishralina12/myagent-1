// Common types used across the application

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User-related types
export interface UserPreferences {
  brand_voice?: string;
  tone?: string;
  default_hashtags?: string[];
  banned_phrases?: string[];
}

// JWT payload
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Fastify request extensions
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}
