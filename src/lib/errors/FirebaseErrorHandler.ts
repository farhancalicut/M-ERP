import { AppError } from "./AppError";

export class FirebaseErrorHandler {
  static handle(error: unknown): AppError {
    let message = "An unexpected database error occurred.";
    let statusCode = 500;

    if (error && typeof error === 'object' && 'code' in error) {
      const code = (error as { code: string }).code;
      switch (code) {
        case "permission-denied":
          message = "You do not have permission to perform this action.";
          statusCode = 403;
          break;
        case "not-found":
          message = "The requested resource was not found.";
          statusCode = 404;
          break;
        case "unauthenticated":
          message = "Please login to continue.";
          statusCode = 401;
          break;
        case "auth/user-not-found":
        case "auth/invalid-credential":
          message = "Invalid user credentials.";
          statusCode = 401;
          break;
        case "auth/email-already-in-use":
          message = "This account is already registered.";
          statusCode = 409;
          break;
        default:
          if ('message' in error) {
            message = (error as { message: string }).message;
          }
      }
    }

    return new AppError(message, statusCode);
  }
}
