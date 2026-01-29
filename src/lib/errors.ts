/**
 * Error thrown when a referenced list is invalid (not found or doesn't belong to user)
 */
export class InvalidListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidListError";
  }
}

/**
 * Error thrown when a database operation fails
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}
