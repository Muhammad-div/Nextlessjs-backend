declare namespace Express {
  // Add support for `currentUserId` in Express request.
  // It's the User ID returned by default aws_iam API gateway authorizer.
  export interface Request {
    currentUserId: string;
  }
}
