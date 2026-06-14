import { useState } from "react";
import { useListSleep, useCreateSleepLog, useDeleteSleepLog, useGetSleepAnalysis, getListSleepQueryKey, getGetSleepAnalysisQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Moon, Plus, Trash2, TrendingUp, Sparkles } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SleepPage() {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("06:30");
  const [quality, setQuality] = useState([7]);
  const [sleepDate, setSleepDate] = useState(yesterday);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: analysis, isLoading: analysisLoading } = useGetSleepAnalysis();
  const { data: logs } = useListSleep({ limit: 14 });

  const create = useCreateSleepLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSleepQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSleepAnalysisQueryKey() });
        toast({ title: "Sleep logged!" });
      },
    },
  });

  const remove = useDeleteSleepLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSleepQueryKey() });
        qc.invalidateQueries({ queryKey: getGetSleepAnalysisQueryKey() });
      },
    },
  });

  const handleLog = () => {
    const bedtimeDate = new Date(`${sleepDate}T${bedtime}:00`);
    const wakeDate = new Date(`${today}T${wakeTime}:00`);
    if (wakeDate <= bedtimeDate) wakeDate.setDate(wakeDate.getDate() + 1);

    create.mutate({
      data: {
        sleepDate,
        bedtime: bedtimeDate.toISOString(),
        wakeTime: wakeDate.toISOString(),
        qualityScore: quality[0],
        notes: notes || undefined,
      },
    });
  };

  const chartData = logs?.slice()?.reverse()?.map(l => ({
    date: l.sleepDate,
    hours: l.durationHours,
    quality: l.qualityScore,
  })) ?? [];

  const qualityLabel = (q: number | null | undefined) => {
    if (q == null) return "Not rated";
    if (q >= 8) return "Excellent";
    if (q >= 6) return "Good";
    if (q >= 4) return "Fair";
    return "Poor";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Moon className="w-7 h-7 text-purple-500" />Sleep
          </h1>
          <p className="text-muted-foreground mt-1">Track your sleep patterns and quality</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Analysis */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">This Week</CardTitle></CardHeader>
              <CardContent>
                {analysisLoading ? <Skeleton className="h-24 w-full" /> : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-purple-500">{analysis?.avgDurationHours ?? 0}h</div>
                      <p className="text-xs text-muted-foreground">Average per night</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-semibold">{analysis?.consistency ?? 0}%</p>
                        <p className="text-xs text-muted-foreground">Consistency</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2">
                        <p className="text-lg font-semibold">{analysis?.avgQualityScore?.toFixed(1) ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Avg Quality</p>
                      </div>
                    </div>
                    {analysis?.insight && (
                      <div className="flex items-start gap-2 bg-accent/10 rounded-lg p-3">
                        <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{analysis.insight}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Log Sleep */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Log Sleep</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Sleep date</Label>
                  <Input type="date" value={sleepDate} onChange={e => setSleepDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Bedtime</Label>
                  <Input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>Wake time</Label>
                  <Input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Sleep quality: <span className="font-semibold text-purple-500">{quality[0]}/10</span> — {qualityLabel(quality[0])}</Label>
                <Slider value={quality} onValueChange={setQuality} min={1} max={10} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. woke up twice, vivid dreams..." className="mt-1" />
              </div>
              <Button onClick={handleLog} disabled={create.isPending} className="w-full gap-2">
                <Plus className="w-4 h-4" />{create.isPending ? "Saving..." : "Log Sleep"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Sleep Duration (14 days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(262 52% 54%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(262 52% 54%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" })} tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `${v}h`} tick={{ fontSize: 11 }} domain={[0, 12]} width={35} />
                  <Tooltip formatter={(v: any) => [`${v}h`, "Sleep"]} />
                  <Area type="monotone" dataKey="hours" stroke="hsl(262 52% 54%)" fill="url(#sleepGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Log History */}
        {logs && logs.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent Sleep Logs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Moon className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.durationHours.toFixed(1)}h · {log.sleepDate}</p>
                        <p className="text-xs text-muted-foreground">
                          Quality: {qualityLabel(log.qualityScore)}
                          {log.notes && ` · ${log.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.qualityScore && <Badge variant="secondary">{log.qualityScore}/10</Badge>}
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: log.id })} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
