import type { ServerResponse } from "node:http";
import { HttpError } from "./http-errors";
import type { LoggerInterface } from "../server/server-builder";
import { isString } from "../utils";

function hasMessage(v: unknown): v is { message: unknown } {
  return !!v && typeof v === "object" && Object.hasOwn(v, "message");
}

function hasStringMessage(v: unknown): v is { message: string } {
  return hasMessage(v) && isString(v.message);
}

export function handleError(
  error: unknown,
  res: ServerResponse,
  logger: LoggerInterface
) {
  const message = hasStringMessage(error) ? error.message : "Unknown error";
  logger.error(message);

  if (error instanceof HttpError) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(error.code);
    res.end(
      JSON.stringify({
        ...error,
        message: error?.message,
        stack: undefined,
      })
    );
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.writeHead(500);
  res.end(JSON.stringify({ message }));
  return;
}
