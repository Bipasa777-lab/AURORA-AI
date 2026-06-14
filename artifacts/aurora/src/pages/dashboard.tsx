import { useGetDashboard, useGetProfile, useListMemories } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Droplets, Moon, Target, UtensilsCrossed, Sparkles, Flame, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { data: dashboard, isLoading } = useGetDashboard();
  const { data: profile } = useGetProfile();
  const { data: memories } = useListMemories();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{greeting}{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""} 👋</h1>
            <p className="text-muted-foreground mt-1">
              {dashboard?.dailyInsight ?? "Let's make today great."}
            </p>
          </div>
          <Link href="/ai" asChild>
            <Button className="gap-2 shrink-0"><Sparkles className="w-4 h-4" />Ask Aurora AI</Button>
          </Link>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hydration */}
          <Link href="/hydration" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-500" />Hydration
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : (
                  <>
                    <div className="text-2xl font-bold mb-2">
                      {((dashboard?.hydration?.totalMl ?? 0) / 1000).toFixed(1)}L
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ {((dashboard?.hydration?.goalMl ?? 2000) / 1000).toFixed(1)}L</span>
                    </div>
                    <Progress value={dashboard?.hydration?.percentComplete ?? 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1.5">{dashboard?.hydration?.percentComplete ?? 0}% of goal</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Sleep */}
          <Link href="/sleep" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Moon className="w-4 h-4 text-purple-500" />Sleep
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : (
                  <>
                    <div className="text-2xl font-bold mb-2">
                      {dashboard?.sleep?.lastNightHours != null ? `${dashboard.sleep.lastNightHours.toFixed(1)}h` : "—"}
                      <span className="text-sm font-normal text-muted-foreground ml-1">last night</span>
                    </div>
                    <p className="text-xs text-muted-foreground">7-day avg: {dashboard?.sleep?.weeklyAvgHours ?? 0}h · {dashboard?.sleep?.consistency ?? 0}% on goal</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Habits */}
          <Link href="/habits" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-500" />Habits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : (
                  <>
                    <div className="text-2xl font-bold mb-2">
                      {dashboard?.habits?.completedToday ?? 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">/ {dashboard?.habits?.totalToday ?? 0} done</span>
                    </div>
                    <Progress value={dashboard?.habits?.progressPercent ?? 0} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1.5">{dashboard?.habits?.progressPercent ?? 0}% complete</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Nutrition */}
          <Link href="/nutrition" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-orange-500" />Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : (
                  <>
                    <div className="text-2xl font-bold mb-2">
                      {dashboard?.nutrition?.totalCalories ?? 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">kcal</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dashboard?.nutrition?.mealsLogged ?? 0} meals · P:{dashboard?.nutrition?.totalProteinG ?? 0}g C:{dashboard?.nutrition?.totalCarbsG ?? 0}g F:{dashboard?.nutrition?.totalFatG ?? 0}g</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Quick Log
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link href="/hydration" asChild>
                <Button size="sm" variant="outline" className="gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-500" />Log Water</Button>
              </Link>
              <Link href="/sleep" asChild>
                <Button size="sm" variant="outline" className="gap-1.5"><Moon className="w-3.5 h-3.5 text-purple-500" />Log Sleep</Button>
              </Link>
              <Link href="/nutrition" asChild>
                <Button size="sm" variant="outline" className="gap-1.5"><UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />Log Meal</Button>
              </Link>
              <Link href="/habits" asChild>
                <Button size="sm" variant="outline" className="gap-1.5"><Target className="w-3.5 h-3.5 text-green-500" />Check Habits</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Aurora AI Companion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">Ask me anything about your health — I have full context from your data today.</p>
              <Link href="/ai" asChild>
                <Button size="sm" className="gap-2">Chat with Aurora <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Aurora's Observations / Health Memories */}
        {memories && memories.length > 0 && (
          <Card className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10 border-indigo-100 dark:border-indigo-950/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-4 h-4" />
                Aurora's Observations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {memories.slice(0, 4).map((memory: any) => (
                  <div key={memory.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-background border border-border/50">
                    <span className="text-lg mt-0.5 select-none">
                      {memory.category === "hydration" ? "💧" : memory.category === "sleep" ? "🌙" : memory.category === "habits" ? "⭐" : "💡"}
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-normal text-foreground">{memory.observation}</p>
                      <span className="text-[10px] text-muted-foreground capitalize mt-0.5 block">{memory.category} pattern</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Meals */}
        {dashboard?.nutrition?.meals && dashboard.nutrition.meals.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Today's Meals</CardTitle>
              <Link href="/nutrition" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dashboard.nutrition.meals.slice(0, 4).map((meal: any) => (
                  <div key={meal.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{meal.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{meal.mealType}</p>
                    </div>
                    <Badge variant="secondary">{meal.calories ?? 0} kcal</Badge>
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
