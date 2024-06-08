import { ApiError } from '@/errors/ApiError';

export class Env {
  /**
   * @param key - Environment variable key.
   * @param required - Indicates if the key is required.
   * If yes, it'll throw an error when the environment isn't defined.
   * @return result - returns the value from environment variable.
   */
  public static getValue(key: string, required: boolean = true): string {
    const res = process.env[key];

    if (res) {
      return res;
    }

    if (required) {
      throw new ApiError(`${key} is not defined`);
    }

    return '';
  }
}
