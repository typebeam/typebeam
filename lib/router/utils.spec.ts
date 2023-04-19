/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { getParts, tokenizeRoute } from "./utils";

describe("tokenizeRoute", () => {
  it("should identify which route parts are keys and which are just text", () => {
    const parts = tokenizeRoute("/track/:slug/artist/:id");
    expect(parts).toHaveLength(4);
    expect(parts[0]!.type).toEqual("text");
    expect(parts[0]!.value).toEqual("track");
    expect(parts[1]!.type).toEqual("key");
    expect(parts[1]!.value).toEqual("slug");
    expect(parts[2]!.type).toEqual("text");
    expect(parts[2]!.value).toEqual("artist");
    expect(parts[3]!.type).toEqual("key");
    expect(parts[3]!.value).toEqual("id");
  });
  it("should identify wildcard route parts", () => {
    const parts = tokenizeRoute("/assets/*path");
    expect(parts).toHaveLength(2);
    expect(parts[0]!.type).toEqual("text");
    expect(parts[0]!.value).toEqual("assets");
    expect(parts[1]!.type).toEqual("wildcard");
    expect(parts[1]!.value).toEqual("path");
  });
});

describe("getParts", () => {
  it("should split a route string into parts", () => {
    const parts = getParts("hello/world");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toEqual("hello");
    expect(parts[1]).toEqual("world");
  });

  it("should remove extra forward slash from beginning and end", () => {
    const parts = getParts("/test/");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toEqual("test");
  });
});
