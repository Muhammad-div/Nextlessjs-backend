import { ErrorCode } from './ErrorCode';

export class ApiError extends Error {
  public readonly originalError: Error | null;

  public readonly publicErrorCode: ErrorCode;

  /**
   * @constructor
   * @param message - Exception message.
   * @param originalError - Wrap the original exception.
   * Happens when the exception is caught and throw again with ApiError.
   * @param publicErrorCode - Error returned by the API when the exception is thrown.
   */
  constructor(
    message: string,
    originalError: Error | null = null,
    publicErrorCode: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
  ) {
    super(message);
    this.originalError = originalError;
    this.publicErrorCode = publicErrorCode;
  }
}
