import type { ServerResponse } from "node:http";
import { constants, createReadStream } from "fs";
import { access, stat } from "node:fs/promises";
import type { Request } from "../request";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "../../errors";
import type { ResponderInterface } from "./responder.interface";
import { mimeLookup } from "./mime.lookup";
import path from "node:path";

async function isStaticFile(path: string): Promise<boolean> {
  try {
    const f = await stat(path);
    return f.isFile();
  } catch (e) {
    return false;
  }
}

function hasErrorCode(err: unknown): err is { code: string } {
  return typeof err === "object" && !!err && Object.hasOwn(err, "code");
}

export class StaticFileResponder implements ResponderInterface {
  static async fromRequest(
    basePath: string,
    req: Request
  ): Promise<StaticFileResponder | null> {
    const path = `${basePath}${req.pathname}`;
    if (!(await isStaticFile(path))) {
      return null;
    }
    return new StaticFileResponder(path);
  }

  static async fromFilePath(
    basePath: string,
    filename: string
  ): Promise<StaticFileResponder> {
    const baseDir = path.resolve(basePath);
    const safeFilePath = path.join(baseDir, path.normalize(filename));

    if (!safeFilePath.startsWith(baseDir)) {
      throw new BadRequestError();
    }
    try {
      await access(safeFilePath, constants.R_OK);
      return new StaticFileResponder(`${basePath}${filename}`);
    } catch (err) {
      if (hasErrorCode(err) && err.code === "ENOENT") {
        throw new NotFoundError();
      }
    }
    throw new InternalServerError();
  }

  constructor(public readonly path: string, public readonly status = 200) {}

  // TODO: mechanism for overriding or providing own extension/type mapping
  respond(res: ServerResponse) {
    res.setHeader("Content-Type", mimeLookup(this.path));
    res.writeHead(this.status);
    createReadStream(this.path).pipe(res);
    return Promise.resolve();
  }

  static async fromDefaultPath(
    defaultPath: string
  ): Promise<StaticFileResponder> {
    if (!(await isStaticFile(defaultPath))) {
      throw new NotFoundError();
    }
    return new StaticFileResponder(defaultPath);
  }
}
