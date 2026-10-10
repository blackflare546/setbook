import { NextResponse } from "next/server";
import { z } from "zod";

const feedbackSchema = z.object({
  feedbackType: z.enum(["bug", "feature", "general"]),
  message: z.string().trim().min(1, "Feedback is required.").max(5000),
  email: z.union([z.literal(""), z.string().trim().email().max(254)]),
  website: z.string().max(200).optional().default(""),
});

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json(
      { error: "Feedback must be submitted as JSON." },
      { status: 415 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  // Treat a filled honeypot as success so automated senders do not retry.
  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  const formId = process.env.FORMSPREE_FORM_ID;
  if (!formId) {
    console.error("FORMSPREE_FORM_ID is not configured");
    return NextResponse.json(
      { error: "Feedback is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const formspreeResponse = await fetch(
      `https://formspree.io/f/${encodeURIComponent(formId)}`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          feedbackType: parsed.data.feedbackType,
          message: parsed.data.message,
          ...(parsed.data.email ? { email: parsed.data.email } : {}),
        }),
        cache: "no-store",
      },
    );

    if (!formspreeResponse.ok) {
      console.error(
        "Formspree rejected a feedback submission",
        formspreeResponse.status,
      );
      return NextResponse.json(
        { error: "Unable to send feedback. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to reach Formspree", error);
    return NextResponse.json(
      { error: "Unable to send feedback. Please try again." },
      { status: 502 },
    );
  }
}
