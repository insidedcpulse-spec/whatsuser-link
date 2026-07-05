import { describe, expect, it } from "vitest";
import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/v1/business/webhook/normalize", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/business/webhook/normalize", () => {
  it("normalizes a recognized webhook payload", async () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                contacts: [{ profile: { name: "User Name" }, wa_id: "16505551234" }],
                messages: [{ from: "16505551234", id: "wamid.1", type: "text" }],
              },
            },
          ],
        },
      ],
    };

    const res = await POST(req(payload));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe("meta_cloud_api");
    expect(body.events).toHaveLength(1);
    expect(body.events[0].phone).toBe("16505551234");
  });

  it("422s with webhook_unrecognized_shape for an unrecognized payload", async () => {
    const res = await POST(req({ foo: "bar" }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("webhook_unrecognized_shape");
  });

  it("400s with webhook_invalid_json for a non-JSON body", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "{not json" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("webhook_invalid_json");
  });

  it("422s with webhook_unrecognized_shape when the JSON body is null", async () => {
    const res = await POST(req(null));
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("webhook_unrecognized_shape");
  });
});
