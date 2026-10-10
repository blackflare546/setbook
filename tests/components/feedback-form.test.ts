import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "@formspree/react";
import { FeedbackForm } from "@/components/help/feedback-form";

const reset = vi.fn();
const handleSubmit = vi.fn(async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
});

vi.mock("@formspree/react", () => ({
  useForm: vi.fn(),
  ValidationError: ({
    errors,
    field,
    prefix = "Form",
  }: {
    errors: Record<string, string> | null;
    field?: string;
    prefix?: string;
  }) => {
    const message = errors?.[field ?? "_form"];
    return message ? `${prefix} ${message}` : null;
  },
}));

const mockedUseForm = vi.mocked(useForm);

function setFormState(
  overrides: Partial<{
    errors: Record<string, string> | null;
    submitting: boolean;
    succeeded: boolean;
  }> = {},
) {
  mockedUseForm.mockReturnValue([
    {
      errors: null,
      result: null,
      submitting: false,
      succeeded: false,
      ...overrides,
    },
    handleSubmit,
    reset,
  ] as never);
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_FORMSPREE_FORM_ID", "test-form-id");
  setFormState();
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("FeedbackForm", () => {
  it("renders the feedback fields and connects to the supplied Formspree form", () => {
    render(React.createElement(FeedbackForm));

    expect(mockedUseForm).toHaveBeenCalledWith("test-form-id");
    expect(screen.getByLabelText("Feedback type")).toHaveValue("general");
    expect(screen.getByLabelText("Your feedback")).toBeRequired();
    expect(screen.getByLabelText(/Email/)).not.toBeRequired();
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeEnabled();
  });

  it("shows an unavailable state when the Formspree environment variable is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_FORMSPREE_FORM_ID", "");
    render(React.createElement(FeedbackForm));

    expect(
      screen.getByRole("heading", {
        name: "Feedback is temporarily unavailable",
      }),
    ).toBeVisible();
    expect(mockedUseForm).not.toHaveBeenCalled();
  });

  it("uses native validation for the required message and optional email format", () => {
    render(React.createElement(FeedbackForm));

    const message = screen.getByLabelText(
      "Your feedback",
    ) as HTMLTextAreaElement;
    const email = screen.getByLabelText(/Email/) as HTMLInputElement;

    expect(message.validity.valueMissing).toBe(true);
    expect(email.checkValidity()).toBe(true);

    fireEvent.change(email, { target: { value: "not-an-email" } });
    expect(email.validity.typeMismatch).toBe(true);

    fireEvent.change(message, {
      target: { value: "The chart view is great." },
    });
    fireEvent.change(email, { target: { value: "player@example.com" } });
    expect(message.checkValidity()).toBe(true);
    expect(email.checkValidity()).toBe(true);
  });

  it("disables the submit button while Formspree is sending", () => {
    setFormState({ submitting: true });
    render(React.createElement(FeedbackForm));

    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
  });

  it("shows Formspree form-level and field-level errors", () => {
    setFormState({
      errors: {
        _form: "could not send your feedback.",
        message: "is required.",
      },
    });
    render(React.createElement(FeedbackForm));

    expect(
      screen.getByText("Form could not send your feedback."),
    ).toBeVisible();
    expect(screen.getByText("Feedback is required.")).toBeVisible();
  });

  it("shows confirmation and resets when sending more feedback", () => {
    setFormState({ succeeded: true });
    render(React.createElement(FeedbackForm));

    expect(
      screen.getByRole("heading", { name: "Thanks for the feedback" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Send more feedback" }));
    expect(reset).toHaveBeenCalledOnce();
  });
});
