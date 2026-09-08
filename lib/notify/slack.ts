import type { Notifier } from "./types";

/**
 * One implementation of `Notifier`. Teams or email would be another
 * implementation of the same interface — the caller (lib/celebrate.ts)
 * never needs to know which one is wired up.
 */
export class SlackNotifier implements Notifier {
  constructor(private readonly webhookUrl: string) {}

  async send(text: string): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      throw new Error(`Slack webhook request failed (${res.status}): ${body}`);
    }
  }
}

export function getNotifier(): Notifier {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL is not configured (see .env.example).");
  }
  return new SlackNotifier(webhookUrl);
}
