import type { IncomingMessage } from "node:http";
import type { ParsedUrlQuery } from "node:querystring";
import { parse, type UrlWithParsedQuery } from "node:url";

import { type HttpMethod, isHttpMethod } from "../http/methods";
import { BadRequestError } from "../errors";
import * as querystring from "querystring";

export class Request {
  static fromIncomingMessage(req: IncomingMessage): Request {
    const url = parse(req.url ?? "", true);
    const method = req.method;
    if (!isHttpMethod(method)) {
      throw new BadRequestError("Unknown HTTP Method");
    }
    return new Request(url, method, req);
  }

  constructor(
    private readonly url: UrlWithParsedQuery,
    public readonly method: HttpMethod,
    public readonly req: IncomingMessage
  ) {}

  get pathname(): string {
    return this.url.pathname ?? "/";
  }

  get query(): ParsedUrlQuery {
    return this.url.query;
  }

  get headers() {
    return this.req.headers;
  }

  getBody() {
    return new Promise((resolve, reject) => {
      let content = "";
      this.req.on("data", (chunk) => (content += chunk));
      this.req.on("end", () => {
        if (!content) {
          resolve({} as any);
          return;
        }
        try {
          if (
            this.headers["content-type"] === "application/x-www-form-urlencoded"
          ) {
            const body = querystring.parse(content);
            resolve(body);
          }
          if (this.headers["content-type"] === "application/json") {
            const body = JSON.parse(content);
            resolve(body);
          }
          const body = JSON.parse(content);
          resolve(body);
        } catch (e) {
          reject(e);
        }
      });
      this.req.on("error", (e) => reject(e));
    });
  }

  getAuthToken(): string | null {
    return getTokenFromHeader(this.req.headers.authorization);
  }
}

function getTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }
  const [, part] = authHeader.split(" ");
  const token = part?.trim();
  if (token && token.length > 0) {
    return token;
  }
  return null;
}
