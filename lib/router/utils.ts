interface Token {
  type: "key" | "text" | "wildcard";
  value: string;
}

/**
 * Convert a route string into a sequence of tokens
 * @param route
 */
export function tokenizeRoute(route: string): Token[] {
  return getParts(route).map(partToToken);
}

/**
 * If a route part starts with ':' then it is a param key,
 * otherwise consider it a text part.
 * @param part
 */
function partToToken(part: string): Token {
  if (part.charAt(0) === ":") {
    return { type: "key", value: part.slice(1) };
  }
  if (part.charAt(0) === "*") {
    return { type: "wildcard", value: part.slice(1) };
  }
  return { type: "text", value: part };
}

/**
 * Split a route string into parts.
 * Removing any `/` from beginning or end of the path string.
 * @param route
 */
export function getParts(route: string): string[] {
  return route.replace(/^\/|\/$/g, "").split("/");
}
