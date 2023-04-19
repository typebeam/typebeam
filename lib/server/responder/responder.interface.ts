import type { ServerResponse } from "node:http";

export interface ResponderInterface {
  respond: (res: ServerResponse) => Promise<void>;
}

// function hasStatus(v: unknown): v is { status: number } {
//   return typeof (v as any).status === "number";
// }

function hasRespond(v: unknown): v is { respond: Function } {
  return typeof (v as any).respond === "function";
}

export function isResponder(v: unknown): v is ResponderInterface {
  return !!v && hasRespond(v) && v.respond.length === 1;
}
