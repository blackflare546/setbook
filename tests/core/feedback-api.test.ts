import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/feedback/route";

const fetchMock = vi.fn();

function feedbackRequest(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "content-type": contentType },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.stubEnv("FORMSPREE_FORM_ID", "server-form-id");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("feedback API", () => {
  it("forwards validated feedback using the server-only Formspree ID", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

    const response = await POST(
      feedbackRequest({
        feedbackType: "feature",
        message: "Please add a count-in timer.",
        email: "player@example.com",
        website: "",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://formspree.io/f/server-form-id");
    expect(JSON.parse(String(options.body))).toEqual({
      feedbackType: "feature",
      message: "Please add a count-in timer.",
      email: "player@example.com",
    });
  });

  it("rejects invalid feedback before contacting Formspree", async () => {
    const response = await POST(
      feedbackRequest({
        feedbackType: "general",
        message: "",
        email: "invalid",
        website: "",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.fieldErrors.message).toBeDefined();
    expect(body.fieldErrors.email).toBeDefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("silently accepts honeypot submissions without forwarding them", async () => {
    const response = await POST(
      feedbackRequest({
        feedbackType: "general",
        message: "Automated message",
        email: "",
        website: "https://spam.example",
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns unavailable when the server-only ID is missing", async () => {
    vi.stubEnv("FORMSPREE_FORM_ID", "");

    const response = await POST(
      feedbackRequest({
        feedbackType: "bug",
        message: "Something went wrong.",
        email: "",
        website: "",
      }),
    );

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a Formspree rejection to a retryable server error", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 429 }));

    const response = await POST(
      feedbackRequest({
        feedbackType: "general",
        message: "A valid message.",
        email: "",
        website: "",
      }),
    );

    expect(response.status).toBe(502);
  });
});
