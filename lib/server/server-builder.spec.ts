import { ServerBuilder } from "./server-builder";
import type { Request } from "./request";

describe("ServerBuilder", () => {
  it("should register separate methods on same route", async () => {
    const builder = new ServerBuilder();
    builder.get("tracks").handle(() => "one");
    builder.post("tracks").handle(() => "two");

    const server = await builder.build();
    const routeData = server["options"].router.parse("tracks");
    const getHandler = routeData.data?.get("GET")!;
    const postHandler = routeData.data?.get("POST")!;

    const args = {
      ctx: {},
      params: {},
      query: {},
      ability: {},
      body: {},
      files: {},
      logger: console,
      inject: {},
      request: {} as Request,
      config: {},
    };
    expect(getHandler["options"].callback(args)).toEqual("one");
    expect(postHandler["options"].callback(args)).toEqual("two");
  });
});
