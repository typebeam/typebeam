import { isString } from "../utils";

export const HttpMethods = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
] as const;
export type HttpMethod = (typeof HttpMethods)[number];

export function isHttpMethod(m: unknown): m is HttpMethod {
  if (!isString(m)) {
    return false;
  }
  return HttpMethods.includes(m as HttpMethod);
}
