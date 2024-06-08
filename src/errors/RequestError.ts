export type ValidationError = {
  param: string;
  type: string;
};

// RequestError will be thrown when there is an error in the incoming request.
// When Express `params`, `query`, or `body` doesn't the follow the expected schema in validations.
export class RequestError extends Error {
  public readonly errorList: ValidationError[];

  constructor(errorList: ValidationError[]) {
    super('Error in request validation');
    this.errorList = errorList;
  }
}
