import { useGetWeeklyReport, useGetMonthlyReport } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, Droplets, Moon, Target, UtensilsCrossed, TrendingUp, Sparkles } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 75 ? "text-primary" : score >= 50 ? "text-yellow-500" : "text-destructive";
  return (
    <div className="text-center">
      <div className={`text-5xl font-bold ${color}`}>{score}</div>
      <p className="text-sm text-muted-foreground mt-1">Consistency Score</p>
      <Progress value={score} className="mt-3 h-2" />
    </div>
  );
}

export default function ReportsPage() {
  const { data: weekly, isLoading: weeklyLoading } = useGetWeeklyReport();
  const { data: monthly, isLoading: monthlyLoading } = useGetMonthlyReport();

  const weeklyRadar = weekly ? [
    { metric: "Hydration", value: Math.round(((weekly.hydration?.goalAchievedDays ?? 0) / 7) * 100) },
    { metric: "Sleep", value: weekly.sleep?.consistency ?? 0 },
    { metric: "Habits", value: weekly.habits?.completionRate ?? 0 },
    { metric: "Nutrition", value: Math.round(((weekly.nutrition?.mealsLoggedDays ?? 0) / 7) * 100) },
  ] : [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-500" />Reports
          </h1>
          <p className="text-muted-foreground mt-1">Your health trends and insights</p>
        </div>

        <Tabs defaultValue="weekly">
          <TabsList>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          <TabsContent value="weekly" className="space-y-4 mt-4">
            {weeklyLoading ? (
              <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
            ) : weekly ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Score */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Weekly Score</CardTitle></CardHeader>
                    <CardContent><ScoreGauge score={weekly.consistencyScore ?? 0} /></CardContent>
                  </Card>

                  {/* Radar */}
                  <Card className="md:col-span-2">
                    <CardHeader><CardTitle className="text-base">Balance Overview</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={180}>
                        <RadarChart data={weeklyRadar}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                          <Radar name="Score" dataKey="value" stroke="hsl(170 72% 38%)" fill="hsl(170 72% 38%)" fillOpacity={0.25} />
                          <Tooltip formatter={(v: any) => [`${v}%`, ""]} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium">Hydration</span>
                      </div>
                      <p className="text-2xl font-bold">{(weekly.hydration?.goalAchievedDays ?? 0)}/7</p>
                      <p className="text-xs text-muted-foreground">days on goal</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round((weekly.hydration?.avgDailyMl ?? 0) / 100) / 10}L/day</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">Sleep</span>
                      </div>
                      <p className="text-2xl font-bold">{weekly.sleep?.avgHours ?? 0}h</p>
                      <p className="text-xs text-muted-foreground">avg per night</p>
                      <p className="text-xs text-muted-foreground mt-1">Consistency: {weekly.sleep?.consistency ?? 0}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium">Habits</span>
                      </div>
                      <p className="text-2xl font-bold">{weekly.habits?.completionRate ?? 0}%</p>
                      <p className="text-xs text-muted-foreground">completion rate</p>
                      <p className="text-xs text-muted-foreground mt-1">{weekly.habits?.totalCompleted ?? 0}/{weekly.habits?.totalPossible ?? 0} completed</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-medium">Nutrition</span>
                      </div>
                      <p className="text-2xl font-bold">{weekly.nutrition?.mealsLoggedDays ?? 0}/7</p>
                      <p className="text-xs text-muted-foreground">days tracked</p>
                      <p className="text-xs text-muted-foreground mt-1">Avg: {weekly.nutrition?.avgCalories ?? 0} kcal/day</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Highlights */}
                {weekly.highlights && weekly.highlights.length > 0 && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />This Week's Highlights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {weekly.highlights.map((h: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <span className="text-primary mt-0.5">✓</span>
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="monthly" className="space-y-4 mt-4">
            {monthlyLoading ? (
              <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
            ) : monthly ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Monthly Score — {monthly.month}</CardTitle></CardHeader>
                    <CardContent><ScoreGauge score={monthly.consistencyScore ?? 0} /></CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-base">Monthly Stats</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" />Hydration goal days</span>
                        <Badge variant="secondary">{monthly.hydrationGoalDays ?? 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Moon className="w-4 h-4 text-purple-500" />Sleep goal days</span>
                        <Badge variant="secondary">{monthly.sleepGoalDays ?? 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center gap-2"><Target className="w-4 h-4 text-green-500" />Habit consistency</span>
                        <Badge variant="secondary">{monthly.habitConsistency ?? 0}%</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                {monthly.behaviorTrends && monthly.behaviorTrends.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" />Behavior Trends</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {monthly.behaviorTrends.map((t: string, i: number) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary">→</span>{t}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
