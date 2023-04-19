import { mimeLookup } from "./mime.lookup";

describe("mime lookup", () => {
  it("should default to text/plain", () => {
    const type = mimeLookup(
      "oiwenfg0823hg02 39j f203f23f23foihjwefwefg/wqeifkjnqwe0g98h230ginkewgnlksjggsd"
    );
    expect(type).toEqual("text/plain");
  });

  it.each([
    ["music.mp3", "audio/mpeg"],
    ["cover.jpg", "image/jpeg"],
    ["cover.jpeg", "image/jpeg"],
    ["cover.html", "text/html"],
  ])("should find simple case %#", (source, expected) => {
    const type = mimeLookup(source);
    expect(type).toEqual(expected);
  });

  it("should not find unknown extension", () => {
    const type = mimeLookup(".........");
    expect(type).toEqual("text/plain");
  });
});
