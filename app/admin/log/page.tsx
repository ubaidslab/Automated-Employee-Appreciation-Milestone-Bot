"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CelebrationRow {
  id: string;
  employeeName: string | null;
  milestoneType: string;
  messageText: string;
  aiGenerated: boolean;
  sentAt: string;
  deliveryStatus: "sent" | "failed" | string;
  deliveryError: string | null;
}

const typeEmoji: Record<string, string> = {
  anniversary: "🎉",
  birthday: "🎂",
  achievement: "👏",
};

export default function CelebrationLogPage() {
  const [rows, setRows] = useState<CelebrationRow[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/celebrations")
      .then((res) => res.json())
      .then((data) => setRows(data.celebrations));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Celebration log</h1>
        <p className="text-sm text-muted-foreground">Every message the bot has sent (or tried to), most recent first.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows === null && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rows !== null && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing sent yet — try the Send celebration button on the dashboard, or log an achievement on the Roster page.
            </p>
          )}
          {rows?.map((row) => (
            <div key={row.id} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span aria-hidden>{typeEmoji[row.milestoneType] ?? "🔔"}</span>
                  <span className="text-sm font-medium">{row.employeeName ?? "Unknown employee"}</span>
                  <Badge variant={row.deliveryStatus === "sent" ? "success" : "destructive"}>
                    {row.deliveryStatus}
                  </Badge>
                  <Badge variant={row.aiGenerated ? "default" : "warning"}>
                    {row.aiGenerated ? "AI-generated" : "Template fallback"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(row.sentAt).toLocaleString()}</span>
              </div>
              <p className="text-sm">{row.messageText}</p>
              {row.deliveryError && <p className="mt-1 text-xs text-destructive">{row.deliveryError}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
