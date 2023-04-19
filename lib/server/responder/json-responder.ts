import type { ServerResponse } from "node:http";
import type { ResponderInterface } from "./responder.interface";

export class DefaultJsonResponder implements ResponderInterface {
  constructor(public readonly payload: any, public readonly status = 200) {}

  async respond(res: ServerResponse) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(this.status);
    res.end(JSON.stringify(this.payload));
  }
}
