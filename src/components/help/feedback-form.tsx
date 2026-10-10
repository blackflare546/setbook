"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

type FeedbackFormValues = {
  feedbackType: "bug" | "feature" | "general";
  message: string;
  email: string;
};

type SubmissionState = {
  status: "idle" | "submitting" | "succeeded" | "error";
  error: string | null;
  fieldErrors: Partial<Record<keyof FeedbackFormValues, string[]>>;
};

const initialState: SubmissionState = {
  status: "idle",
  error: null,
  fieldErrors: {},
};

const errorClasses =
  "mt-2 text-sm font-medium text-rose-600 dark:text-rose-300";

export function FeedbackForm() {
  const [state, setState] = useState<SubmissionState>(initialState);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    setState({ status: "submitting", error: null, fieldErrors: {} });

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        fieldErrors?: SubmissionState["fieldErrors"];
      } | null;

      if (!response.ok) {
        setState({
          status: "error",
          error: result?.error ?? "Unable to send feedback. Please try again.",
          fieldErrors: result?.fieldErrors ?? {},
        });
        return;
      }

      setState({ status: "succeeded", error: null, fieldErrors: {} });
    } catch {
      setState({
        status: "error",
        error: "Unable to send feedback. Check your connection and try again.",
        fieldErrors: {},
      });
    }
  }

  if (state.status === "succeeded") {
    return (
      <Card
        className="flex min-h-72 flex-col items-start justify-center p-6 sm:p-8"
        role="status"
        aria-live="polite"
      >
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 size={22} aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
          Thanks for the feedback
        </h3>
        <p className="mt-2 max-w-xl leading-7 text-slate-600 dark:text-slate-300">
          Your message has been sent. It will help make SetBook better.
        </p>
        <Button
          className="mt-6"
          type="button"
          variant="secondary"
          onClick={() => setState(initialState)}
        >
          Send more feedback
        </Button>
      </Card>
    );
  }

  const messageError = state.fieldErrors.message?.[0];
  const emailError = state.fieldErrors.email?.[0];
  const feedbackTypeError = state.fieldErrors.feedbackType?.[0];
  const submitting = state.status === "submitting";

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit}>
        {state.error && (
          <p
            className={`${errorClasses} mb-5 mt-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/40`}
            role="alert"
          >
            {state.error}
          </p>
        )}

        <div
          className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          aria-hidden="true"
        >
          <label htmlFor="feedback-website">Website</label>
          <input
            id="feedback-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid gap-5">
          <div>
            <label
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100"
              htmlFor="feedback-type"
            >
              Feedback type
            </label>
            <select
              id="feedback-type"
              name="feedbackType"
              defaultValue="general"
              aria-describedby={
                feedbackTypeError ? "feedback-type-error" : undefined
              }
              className="h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-base text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:h-10 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:ring-indigo-950"
            >
              <option value="general">General feedback</option>
              <option value="bug">Bug report</option>
              <option value="feature">Feature suggestion</option>
            </select>
            {feedbackTypeError && (
              <p id="feedback-type-error" className={errorClasses} role="alert">
                {feedbackTypeError}
              </p>
            )}
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100"
              htmlFor="feedback-message"
            >
              Your feedback
            </label>
            <Textarea
              id="feedback-message"
              name="message"
              required
              maxLength={5000}
              rows={6}
              placeholder="Tell me what worked, what did not, or what would make SetBook more useful."
              aria-describedby={`feedback-message-hint${messageError ? " feedback-message-error" : ""}`}
              className="min-h-36 resize-y"
            />
            <p
              id="feedback-message-hint"
              className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              Please include the steps you took if you are reporting a problem.
            </p>
            {messageError && (
              <p
                id="feedback-message-error"
                className={errorClasses}
                role="alert"
              >
                {messageError}
              </p>
            )}
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-100"
              htmlFor="feedback-email"
            >
              Email{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <Input
              id="feedback-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              aria-describedby={`feedback-email-hint${emailError ? " feedback-email-error" : ""}`}
            />
            <p
              id="feedback-email-hint"
              className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              Add your email only if you would like a reply.
            </p>
            {emailError && (
              <p
                id="feedback-email-error"
                className={errorClasses}
                role="alert"
              >
                {emailError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <p className="max-w-xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            Feedback and any email you provide are processed by Formspree and
            sent to SetBook’s developer.
          </p>
          <Button
            className="w-full shrink-0 sm:w-auto"
            type="submit"
            disabled={submitting}
          >
            {submitting ? (
              "Sending…"
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Send feedback
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
