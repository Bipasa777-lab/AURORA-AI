import { useGetStreaks } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, Droplets, Moon, Target, UtensilsCrossed, Lock } from "lucide-react";

export default function StreaksPage() {
  const { data, isLoading } = useGetStreaks();

  const streakCards = [
    { key: "hydration", label: "Hydration", icon: Droplets, color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
    { key: "sleep", label: "Sleep", icon: Moon, color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
    { key: "habits", label: "Habits", icon: Target, color: "text-green-500", bg: "bg-green-100 dark:bg-green-900/30" },
    { key: "nutrition", label: "Nutrition", icon: UtensilsCrossed, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  ] as const;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Flame className="w-7 h-7 text-orange-500" />Streaks & Achievements
          </h1>
          <p className="text-muted-foreground mt-1">Your consistency journey</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {isLoading ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />) : (
            streakCards.map(({ key, label, icon: Icon, color, bg }) => {
              const streak = (data as any)?.[key];
              return (
                <Card key={key}>
                  <CardContent className="p-4 text-center">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      <Flame className="w-5 h-5 text-orange-500" />
                      {streak?.currentStreak ?? 0}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                    <p className="text-xs text-muted-foreground">Best: {streak?.longestStreak ?? 0}</p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Active Streaks */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Active Streaks
                {data.totalActiveStreaks > 0 && <Badge variant="secondary">{data.totalActiveStreaks} active</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {streakCards.map(({ key, label, icon: Icon, color, bg }) => {
                  const streak = (data as any)?.[key];
                  if (!streak || streak.currentStreak === 0) return null;
                  return (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">Best: {streak.longestStreak} days</p>
                      </div>
                      <div className="flex items-center gap-1 text-orange-500 font-bold">
                        <Flame className="w-4 h-4" />
                        {streak.currentStreak} day{streak.currentStreak !== 1 ? "s" : ""}
                      </div>
                    </div>
                  );
                })}
                {data.totalActiveStreaks === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Flame className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No active streaks yet — start logging to build momentum!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Achievements */}
        {data?.achievements && (
          <div>
            <h2 className="font-semibold text-lg mb-3">Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.achievements.map((achievement: any) => (
                <Card key={achievement.id} className={achievement.earned ? "border-primary/30 bg-primary/5" : "opacity-60"}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${achievement.earned ? "bg-primary/15" : "bg-muted"}`}>
                      {achievement.earned ? achievement.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{achievement.title}</p>
                        {achievement.earned && <Badge className="text-xs">Earned</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
