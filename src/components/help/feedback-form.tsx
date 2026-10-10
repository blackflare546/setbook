"use client";

import { ValidationError, useForm } from "@formspree/react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";

type FeedbackFormValues = {
  feedbackType: "bug" | "feature" | "general";
  message: string;
  email: string;
};

const errorClasses =
  "mt-2 text-sm font-medium text-rose-600 dark:text-rose-300";

export function FeedbackForm() {
  const formId = process.env.NEXT_PUBLIC_FORMSPREE_FORM_ID;

  if (!formId) {
    return (
      <Card className="flex min-h-56 flex-col items-start justify-center p-6 sm:p-8">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle size={22} aria-hidden="true" />
        </span>
        <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
          Feedback is temporarily unavailable
        </h3>
        <p className="mt-2 max-w-xl leading-7 text-slate-600 dark:text-slate-300">
          The feedback form has not been configured. Please try again later.
        </p>
      </Card>
    );
  }

  return <ConfiguredFeedbackForm formId={formId} />;
}

function ConfiguredFeedbackForm({ formId }: { formId: string }) {
  const [state, handleSubmit, reset] = useForm<FeedbackFormValues>(formId);

  if (state.succeeded) {
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
          onClick={reset}
        >
          Send more feedback
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSubmit}>
        <ValidationError
          errors={state.errors}
          className={`${errorClasses} mb-5 mt-0 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/40`}
          role="alert"
        />

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
              className="h-11 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-base text-slate-950 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:h-10 sm:text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:focus:ring-indigo-950"
            >
              <option value="general">General feedback</option>
              <option value="bug">Bug report</option>
              <option value="feature">Feature suggestion</option>
            </select>
            <ValidationError
              prefix="Feedback type"
              field="feedbackType"
              errors={state.errors}
              className={errorClasses}
              role="alert"
            />
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
              rows={6}
              placeholder="Tell me what worked, what did not, or what would make SetBook more useful."
              aria-describedby="feedback-message-hint"
              className="min-h-36 resize-y"
            />
            <p
              id="feedback-message-hint"
              className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              Please include the steps you took if you are reporting a problem.
            </p>
            <ValidationError
              prefix="Feedback"
              field="message"
              errors={state.errors}
              className={errorClasses}
              role="alert"
            />
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
              placeholder="you@example.com"
              aria-describedby="feedback-email-hint"
            />
            <p
              id="feedback-email-hint"
              className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400"
            >
              Add your email only if you would like a reply.
            </p>
            <ValidationError
              prefix="Email"
              field="email"
              errors={state.errors}
              className={errorClasses}
              role="alert"
            />
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
            disabled={state.submitting}
          >
            {state.submitting ? (
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
