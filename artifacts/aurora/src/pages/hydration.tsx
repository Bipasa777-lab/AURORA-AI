import { useState } from "react";
import { useGetTodayHydration, useGetWeeklyHydration, useCreateHydrationLog, useDeleteHydrationLog, useListHydration, getGetTodayHydrationQueryKey, getGetWeeklyHydrationQueryKey, getListHydrationQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Plus, Trash2, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const QUICK_AMOUNTS = [200, 250, 350, 500, 750];

export default function HydrationPage() {
  const [amount, setAmount] = useState("250");
  const [note, setNote] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: today, isLoading: todayLoading } = useGetTodayHydration();
  const { data: weekly } = useGetWeeklyHydration();
  const { data: logs } = useListHydration({ limit: 20 });

  const create = useCreateHydrationLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayHydrationQueryKey() });
        qc.invalidateQueries({ queryKey: getGetWeeklyHydrationQueryKey() });
        qc.invalidateQueries({ queryKey: getListHydrationQueryKey() });
        setAmount("250");
        setNote("");
        toast({ title: "Logged!", description: `${amount}ml added` });
      },
    },
  });

  const remove = useDeleteHydrationLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayHydrationQueryKey() });
        qc.invalidateQueries({ queryKey: getGetWeeklyHydrationQueryKey() });
        qc.invalidateQueries({ queryKey: getListHydrationQueryKey() });
      },
    },
  });

  const handleLog = () => {
    const ml = parseInt(amount, 10);
    if (!ml || ml < 1) return;
    create.mutate({ data: { amountMl: ml, note: note || undefined } });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Droplets className="w-7 h-7 text-blue-500" />Hydration
          </h1>
          <p className="text-muted-foreground mt-1">Track your daily water intake</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Progress */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {todayLoading ? <Skeleton className="h-24 w-full" /> : (
                <>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-500 mb-1">
                      {((today?.totalMl ?? 0) / 1000).toFixed(2)}L
                    </div>
                    <p className="text-sm text-muted-foreground">of {((today?.goalMl ?? 2000) / 1000).toFixed(1)}L goal</p>
                  </div>

                  {/* Virtual Water Bottle */}
                  <div className="flex flex-col items-center py-4 bg-muted/30 rounded-xl">
                    <div className="relative w-20 h-40 border-4 border-blue-500 rounded-t-2xl rounded-b-lg overflow-hidden bg-blue-50 dark:bg-blue-950/20">
                      {/* Bottle Cap */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-3 bg-blue-600 rounded-t-sm z-20" />
                      {/* Water Fill */}
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-blue-400/70 transition-all duration-700 ease-out"
                        style={{ height: `${Math.min(100, today?.percentComplete ?? 0)}%` }}
                      >
                        {/* Wave line */}
                        {(today?.percentComplete ?? 0) > 0 && (
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-300 rounded-t-full" />
                        )}
                      </div>
                      {/* Percentage Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-base text-blue-900 dark:text-blue-100 z-10 drop-shadow">
                        {today?.percentComplete ?? 0}%
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground mt-2">Virtual Water Bottle</span>
                  </div>

                  <Progress value={today?.percentComplete ?? 0} className="h-3" />
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-lg font-semibold">{today?.percentComplete ?? 0}%</p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-lg font-semibold">{((today?.remainingMl ?? 0) / 1000).toFixed(2)}L</p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Log Water */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Log Water</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map(ml => (
                  <Button key={ml} variant={amount === String(ml) ? "default" : "outline"} size="sm"
                    onClick={() => setAmount(String(ml))}>
                    {ml}ml
                  </Button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor="amount">Custom amount (ml)</Label>
                  <Input id="amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" className="mt-1" />
                </div>
                <div className="flex-1">
                  <Label htmlFor="note">Note (optional)</Label>
                  <Input id="note" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. morning coffee" className="mt-1" />
                </div>
              </div>
              <Button onClick={handleLog} disabled={create.isPending} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                {create.isPending ? "Logging..." : "Log Water"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Chart */}
        {weekly && weekly.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />7-Day Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekly}>
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString("en", { weekday: "short" })} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={v => `${(v / 1000).toFixed(1)}L`} tick={{ fontSize: 12 }} width={45} />
                  <Tooltip formatter={(v: any) => [`${(v / 1000).toFixed(2)}L`, "Water"]} />
                  <Bar dataKey="totalMl" radius={[4, 4, 0, 0]}>
                    {weekly.map((entry, i) => (
                      <Cell key={i} fill={entry.percentComplete >= 80 ? "hsl(170 72% 38%)" : "hsl(210 72% 60%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Log History */}
        {logs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <Droplets className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.amountMl}ml</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.loggedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
                          {log.note && ` · ${log.note}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: log.id })} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
