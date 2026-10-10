import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { FeedbackForm } from "@/components/help/feedback-form";

const fetchMock = vi.fn();

function form() {
  return screen.getByRole("button", { name: "Send feedback" }).closest("form")!;
}

function fillRequiredMessage() {
  fireEvent.change(screen.getByLabelText("Your feedback"), {
    target: { value: "The chart view is great." },
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("FeedbackForm", () => {
  it("renders the feedback fields with native validation", () => {
    render(React.createElement(FeedbackForm));

    const message = screen.getByLabelText(
      "Your feedback",
    ) as HTMLTextAreaElement;
    const email = screen.getByLabelText(/Email/) as HTMLInputElement;

    expect(screen.getByLabelText("Feedback type")).toHaveValue("general");
    expect(message).toBeRequired();
    expect(message).toHaveAttribute("maxlength", "5000");
    expect(message.validity.valueMissing).toBe(true);
    expect(email).not.toBeRequired();
    expect(email.checkValidity()).toBe(true);

    fireEvent.change(email, { target: { value: "not-an-email" } });
    expect(email.validity.typeMismatch).toBe(true);
  });

  it("disables the submit button while the server is sending", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(React.createElement(FeedbackForm));
    fillRequiredMessage();

    fireEvent.submit(form());

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/feedback",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows server validation errors", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "Please check the highlighted fields.",
          fieldErrors: { message: ["Feedback is required."] },
        }),
        { status: 400, headers: { "content-type": "application/json" } },
      ),
    );
    render(React.createElement(FeedbackForm));

    fireEvent.submit(form());

    expect(
      await screen.findByText("Please check the highlighted fields."),
    ).toBeVisible();
    expect(screen.getByText("Feedback is required.")).toBeVisible();
  });

  it("shows confirmation and resets after a successful submission", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    render(React.createElement(FeedbackForm));
    fillRequiredMessage();

    fireEvent.submit(form());

    expect(
      await screen.findByRole("heading", { name: "Thanks for the feedback" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Send more feedback" }));
    expect(screen.getByLabelText("Your feedback")).toHaveValue("");
  });

  it("keeps the form available after a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(React.createElement(FeedbackForm));
    fillRequiredMessage();

    fireEvent.submit(form());

    await waitFor(() =>
      expect(
        screen.getByText(
          "Unable to send feedback. Check your connection and try again.",
        ),
      ).toBeVisible(),
    );
    expect(screen.getByLabelText("Your feedback")).toHaveValue(
      "The chart view is great.",
    );
  });
});
