import { describe, expect, it } from "vitest";
import { normalizeWebhook } from "./normalize";

function envelope(value: unknown) {
  return { entry: [{ changes: [{ value }] }] };
}

describe("normalizeWebhook", () => {
  it("normalizes a classic message payload with no username", () => {
    const value = {
      contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234" }],
      messages: [{ from: "16505551234", id: "wamid.1", type: "text" }],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result).toEqual({
      provider: "meta_cloud_api",
      events: [
        {
          kind: "message",
          bsuid: null,
          phone: "16505551234",
          username: null,
          displayName: "User Name",
          raw: value.messages[0],
        },
      ],
    });
  });

  it("normalizes a message payload with username inside the 30-day window", () => {
    const value = {
      contacts: [
        {
          profile: { name: "User Name", username: "username" },
          wa_id: "16505551234",
          user_id: "US.13491208655302741918",
        },
      ],
      messages: [
        { from: "16505551234", from_user_id: "US.13491208655302741918", id: "wamid.2", type: "text" },
      ],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result?.events[0]).toEqual({
      kind: "message",
      bsuid: "US.13491208655302741918",
      phone: "16505551234",
      username: "username",
      displayName: "User Name",
      raw: value.messages[0],
    });
  });

  it("normalizes a message payload with wa_id omitted outside the 30-day window", () => {
    const value = {
      contacts: [{ profile: { name: "User Name", username: "username" }, user_id: "US.13491208655302741918" }],
      messages: [{ from_user_id: "US.13491208655302741918", id: "wamid.3", type: "text" }],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result?.events[0]).toEqual({
      kind: "message",
      bsuid: "US.13491208655302741918",
      phone: null,
      username: "username",
      displayName: "User Name",
      raw: value.messages[0],
    });
  });

  it("normalizes a status event using recipient_id/recipient_user_id", () => {
    const value = {
      contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234", user_id: "US.13491208655302741918" }],
      statuses: [{ recipient_id: "16505551234", recipient_user_id: "US.13491208655302741918", status: "delivered" }],
    };

    const result = normalizeWebhook(envelope(value));

    expect(result?.events[0]).toEqual({
      kind: "status",
      bsuid: "US.13491208655302741918",
      phone: "16505551234",
      username: null,
      displayName: "User Name",
      raw: value.statuses[0],
    });
  });

  it("accepts a bare value-shaped object without the entry/changes envelope", () => {
    const value = {
      contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234" }],
      messages: [{ from: "16505551234", id: "wamid.4", type: "text" }],
    };

    const result = normalizeWebhook(value);

    expect(result?.events).toHaveLength(1);
  });

  it("returns null for an unrecognized payload shape", () => {
    expect(normalizeWebhook({})).toBeNull();
    expect(normalizeWebhook({ foo: "bar" })).toBeNull();
  });
});
