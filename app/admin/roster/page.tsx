"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string | null;
  startDate: string;
  birthday: string | null;
  shareBirthday: boolean;
  active: boolean;
}

const emptyForm = {
  name: "",
  email: "",
  department: "",
  startDate: "",
  birthday: "",
  shareBirthday: false,
};

export default function RosterPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [achievement, setAchievement] = useState({ employeeId: "", title: "", description: "" });
  const [achievementStatus, setAchievementStatus] = useState<string | null>(null);
  const [loggingAchievement, setLoggingAchievement] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/employees");
    const data = await res.json();
    setEmployees(data.employees);
  };

  useEffect(() => {
    load();
  }, []);

  const addEmployee = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, birthday: form.birthday || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add employee.");
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string) => {
    await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    load();
  };

  const logAchievement = async (e: FormEvent) => {
    e.preventDefault();
    setLoggingAchievement(true);
    setAchievementStatus(null);
    try {
      const res = await fetch("/api/admin/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(achievement),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to log achievement.");
      setAchievementStatus(`Logged and celebration ${data.celebration?.status ?? "queued"}.`);
      setAchievement({ employeeId: "", title: "", description: "" });
    } catch (err) {
      setAchievementStatus(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoggingAchievement(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Roster</h1>
        <p className="text-sm text-muted-foreground">Manage employees and log one-off achievements.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={addEmployee} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department</Label>
              <Input id="department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthday">Birthday (optional, MM-DD)</Label>
              <Input
                id="birthday"
                placeholder="07-22"
                pattern="\d{2}-\d{2}"
                value={form.birthday}
                onChange={(e) => setForm({ ...form, birthday: e.target.value })}
              />
            </div>
            <div className="flex items-end gap-2 pb-1.5">
              <input
                id="shareBirthday"
                type="checkbox"
                checked={form.shareBirthday}
                onChange={(e) => setForm({ ...form, shareBirthday: e.target.checked })}
              />
              <Label htmlFor="shareBirthday" className="!text-foreground">
                OK to celebrate their birthday publicly
              </Label>
            </div>

            {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}

            <Button type="submit" disabled={saving} className="sm:col-span-2 sm:w-fit">
              {saving ? "Adding…" : "Add employee"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active employees ({employees?.length ?? "…"})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2">Name</th>
                  <th className="px-5 py-2">Department</th>
                  <th className="px-5 py-2">Start date</th>
                  <th className="px-5 py-2">Birthday</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {employees?.map((employee) => (
                  <tr key={employee.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2.5">
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-xs text-muted-foreground">{employee.email}</p>
                    </td>
                    <td className="px-5 py-2.5">{employee.department || "—"}</td>
                    <td className="px-5 py-2.5">{employee.startDate}</td>
                    <td className="px-5 py-2.5">
                      {employee.birthday ? (
                        <Badge variant={employee.shareBirthday ? "success" : "muted"}>
                          {employee.birthday} {employee.shareBirthday ? "" : "(private)"}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => deactivate(employee.id)}>
                        Deactivate
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log an achievement</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={logAchievement} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="achievementEmployee">Employee</Label>
              <select
                id="achievementEmployee"
                required
                className="flex h-9 w-full rounded-lg border border-border bg-white px-3 text-sm shadow-sm"
                value={achievement.employeeId}
                onChange={(e) => setAchievement({ ...achievement, employeeId: e.target.value })}
              >
                <option value="">Select an employee…</option>
                {employees?.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achievementTitle">Achievement</Label>
              <Input
                id="achievementTitle"
                required
                placeholder="Shipped the Q3 onboarding revamp"
                value={achievement.title}
                onChange={(e) => setAchievement({ ...achievement, title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="achievementDescription">Details (optional)</Label>
              <Input
                id="achievementDescription"
                value={achievement.description}
                onChange={(e) => setAchievement({ ...achievement, description: e.target.value })}
              />
            </div>
            {achievementStatus && <p className="text-sm text-muted-foreground">{achievementStatus}</p>}
            <Button type="submit" disabled={loggingAchievement}>
              {loggingAchievement ? "Logging…" : "Log & celebrate now"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
