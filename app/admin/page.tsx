"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface UpcomingMilestone {
  employeeId: string;
  employeeName: string;
  type: "anniversary" | "birthday";
  date: string;
  years?: number;
}

export default function DashboardPage() {
  const [upcoming, setUpcoming] = useState<UpcomingMilestone[] | null>(null);
  const [today, setToday] = useState<string>("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/upcoming");
    const data = await res.json();
    setUpcoming(data.upcoming);
    setToday(data.today);
  };

  useEffect(() => {
    load();
  }, []);

  const sendTest = async (employeeId: string) => {
    setSendingId(employeeId);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send.");
      const summary = data.outcomes?.map((o: { type: string; status: string }) => `${o.type}: ${o.status}`).join(", ");
      setFeedback(summary || data.message || "Done.");
      load();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSendingId(null);
    }
  };

  const dueToday = upcoming?.filter((m) => m.date === today) ?? [];
  const dueLater = upcoming?.filter((m) => m.date !== today) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Milestones detected from the roster — the same logic the daily cron uses.
        </p>
      </div>

      {feedback && (
        <div className="rounded-lg border border-border bg-white px-4 py-2 text-sm">{feedback}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Due today ({today || "…"})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {upcoming !== null && dueToday.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing due today.</p>
          )}
          {dueToday.map((m) => (
            <div key={`${m.employeeId}-${m.type}`} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>
                  {m.type === "anniversary" ? "🎉" : "🎂"}
                </span>
                <div>
                  <p className="text-sm font-medium">{m.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type === "anniversary" ? `${m.years}-year anniversary` : "Birthday"}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => sendTest(m.employeeId)} disabled={sendingId === m.employeeId}>
                {sendingId === m.employeeId ? "Sending…" : "Send celebration"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coming up in the next 30 days</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {upcoming !== null && dueLater.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing else on the horizon.</p>
          )}
          {dueLater.map((m) => (
            <div key={`${m.employeeId}-${m.type}-${m.date}`} className="flex items-center justify-between border-b border-border py-2 last:border-0">
              <div className="flex items-center gap-3">
                <span aria-hidden>{m.type === "anniversary" ? "🎉" : "🎂"}</span>
                <span className="text-sm">{m.employeeName}</span>
                <Badge variant="muted">{m.type === "anniversary" ? `${m.years} years` : "Birthday"}</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{m.date}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
