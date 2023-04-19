import type { HttpMethod } from "../http/methods";
import type { RouteHandler } from "./route-handler";
import { MethodNotAllowedError } from "../errors";

export class RouterData {
  constructor(
    private readonly data: Partial<{
      [key in HttpMethod]: RouteHandler;
    }> = {}
  ) {}

  set(key: HttpMethod, data: RouteHandler) {
    this.data[key] = data;
  }

  get(key: HttpMethod): RouteHandler {
    if (!this.data[key]) {
      throw new MethodNotAllowedError();
    }
    return this.data[key]!;
  }
}
