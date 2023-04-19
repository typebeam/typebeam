import { Router } from "./router";
import type { RouteHandler } from "../server/route-handler";

describe("Router", () => {
  it("should return data set for route", () => {
    const router = new Router();
    router
      .addRoute("hello")
      .set("GET", "THIS IS THE ROUTE DATA" as unknown as RouteHandler);
    const { data } = router.parse("/hello");
    expect(data).toEqual(
      expect.objectContaining({
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
        data: expect.objectContaining({ GET: "THIS IS THE ROUTE DATA" }),
      })
    );
  });

  it("should match wildcard route", () => {
    const router = new Router();
    router.addRoute("assets/*");
    const { params } = router.parse("/assets/something.js");
    expect(params).toEqual("things");
  });

  it("should return param values from key parts of route", () => {
    const router = new Router();
    router.addRoute("tracks/:slug/artist/:id");
    const { params } = router.parse("/tracks/song-title/artist/100");
    expect(params["slug"]).toEqual("song-title");
    expect(params["id"]).toEqual("100");
  });

  it("should allow different routes to use different key names", () => {
    const router = new Router();
    router.addRoute("tracks/:trackId/find");
    router.addRoute("tracks/:id/search");
    {
      const { params } = router.parse("/tracks/something/find");
      expect(Object.keys(params)).toContain("trackId");
      expect(params["trackId"]).toEqual("something");
    }
    {
      const { params } = router.parse("/tracks/random/search");
      expect(Object.keys(params)).toContain("id");
      expect(params["id"]).toEqual("random");
    }
  });
});
