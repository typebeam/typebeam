// Because extending Errors in ES6/TypeScript is broken:
// https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md
// https://stackoverflow.com/questions/31089801/extending-error-in-javascript-with-es6-syntax-babel

class CustomError extends Error {
  /* eslint-disable @typescript-eslint/ban-ts-comment */
  // @ts-ignore
  name: string;

  constructor(message?: string) {
    super(message);
    // Set error name as constructor name
    Object.defineProperty(this, "name", {
      value: new.target.name,
      // Match native Error behaviour (name is not enumerable)
      enumerable: false,
      configurable: true,
    });

    // Fix the prototype chain
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, new.target.prototype);
    }
    // Fix the error stack
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class HttpError extends CustomError {
  public constructor(public code: number, message?: string) {
    super(message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "Not Found") {
    super(404, message);
  }
}

export class BadRequestError extends HttpError {
  constructor(
    message = "Bad Request",
    public override readonly cause?: unknown
  ) {
    super(400, message);
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message = "Method Not Allowed") {
    super(405, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "UnauthorizedError") {
    super(401, message);
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "InternalServerError") {
    super(500, message);
  }
}
