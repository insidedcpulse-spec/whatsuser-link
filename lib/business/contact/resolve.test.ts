import { describe, expect, it } from "vitest";
import { resolveContact } from "./resolve";

describe("resolveContact", () => {
  it("resolves a bsuid input", () => {
    expect(resolveContact({ bsuid: "US.13491208655302741918" })).toEqual({
      id: "US.13491208655302741918",
      type: "bsuid",
      username: null,
      phone: null,
      bsuid: "US.13491208655302741918",
      displayName: null,
      phoneKnown: false,
      bsuidKnown: true,
    });
  });

  it("resolves a phone input", () => {
    expect(resolveContact({ phone: "16505551234" })).toEqual({
      id: "16505551234",
      type: "phone",
      username: null,
      phone: "16505551234",
      bsuid: null,
      displayName: null,
      phoneKnown: true,
      bsuidKnown: false,
    });
  });

  it("resolves a username input", () => {
    expect(resolveContact({ username: "joao.silva" })).toEqual({
      id: "joao.silva",
      type: "username",
      username: "joao.silva",
      phone: null,
      bsuid: null,
      displayName: null,
      phoneKnown: false,
      bsuidKnown: false,
    });
  });

  it("returns null when no identifier is given", () => {
    expect(resolveContact({})).toBeNull();
  });

  it("returns null when more than one identifier is given", () => {
    expect(resolveContact({ phone: "16505551234", username: "joao.silva" })).toBeNull();
  });
});
