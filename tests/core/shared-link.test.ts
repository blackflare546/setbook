import { describe, expect, it } from "vitest";
import { publicTokenFromSharedLink } from "@/lib/sharing/shared-link";

describe("public shared links", () => {
  const origin = "https://setbook.example";

  it("accepts only same-origin public setlist links", () => {
    expect(
      publicTokenFromSharedLink("https://setbook.example/s/abc123", origin),
    ).toBe("abc123");
    expect(publicTokenFromSharedLink("/s/ABCdef789", origin)).toBe("ABCdef789");
    expect(
      publicTokenFromSharedLink("https://other.example/s/abc123", origin),
    ).toBeNull();
    expect(publicTokenFromSharedLink("/shared/abc123", origin)).toBeNull();
  });

  it("rejects capability fragments, query strings, and malformed tokens", () => {
    expect(
      publicTokenFromSharedLink("/s/abc123#editor=secret", origin),
    ).toBeNull();
    expect(
      publicTokenFromSharedLink("/s/abc123?owner=secret", origin),
    ).toBeNull();
    expect(publicTokenFromSharedLink("/s/no", origin)).toBeNull();
  });
});
