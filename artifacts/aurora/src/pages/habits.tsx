import { useState } from "react";
import { useGetTodayHabits, useListHabits, useCreateHabit, useCompleteHabit, useSkipHabit, useDeleteHabit, getGetTodayHabitsQueryKey, getListHabitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Check, SkipForward, Trash2, Flame, Trophy } from "lucide-react";

const HABIT_ICONS = ["🏃", "💧", "📚", "🧘", "💊", "🥗", "😴", "🏋️", "🎯", "✍️"];
const HABIT_COLORS = ["#14b8a6", "#8b5cf6", "#f97316", "#3b82f6", "#22c55e", "#ec4899", "#f59e0b", "#ef4444"];

export default function HabitsPage() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [color, setColor] = useState("#14b8a6");
  const [timeOfDay, setTimeOfDay] = useState("anytime");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: todayHabits, isLoading } = useGetTodayHabits();
  const { data: allHabits } = useListHabits();

  const create = useCreateHabit({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
        qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
        setOpen(false);
        setName("");
        setDescription("");
        toast({ title: "Habit created!" });
      },
    },
  });

  const complete = useCompleteHabit({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
        qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
        toast({ title: "Habit completed! 🎉" });
      },
    },
  });

  const skip = useSkipHabit({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
        toast({ title: "Habit skipped" });
      },
    },
  });

  const deleteHabit = useDeleteHabit({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayHabitsQueryKey() });
        qc.invalidateQueries({ queryKey: getListHabitsQueryKey() });
        toast({ title: "Habit deleted" });
      },
    },
  });

  const completedCount = Array.isArray(todayHabits)
    ? todayHabits.filter((h: any) => h.todayStatus === "completed").length
    : 0;
  const totalCount = Array.isArray(todayHabits) ? todayHabits.length : 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Target className="w-7 h-7 text-green-500" />Habits
            </h1>
            <p className="text-muted-foreground mt-1">Build lasting health habits, one day at a time</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" />New Habit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new habit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Habit name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning stretch" className="mt-1" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this habit involve?" className="mt-1" />
                </div>
                <div>
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {HABIT_ICONS.map(i => (
                      <button key={i} onClick={() => setIcon(i)} className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${icon === i ? "bg-primary/20 ring-2 ring-primary" : "bg-muted hover:bg-muted/80"}`}>{i}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {HABIT_COLORS.map(c => (
                      <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-foreground" : ""}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Time of day</Label>
                  <Select value={timeOfDay} onValueChange={setTimeOfDay}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="anytime">Anytime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => create.mutate({ data: { name, description: description || undefined, icon, color, timeOfDay: timeOfDay as any, frequency: "daily" } })} disabled={!name || create.isPending} className="w-full">
                  {create.isPending ? "Creating..." : "Create Habit"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Today's Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Today's Progress</span>
              <Badge variant={progress === 100 ? "default" : "secondary"}>{completedCount}/{totalCount} done</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="h-3 mb-2" />
            <p className="text-sm text-muted-foreground">{progress}% complete{progress === 100 ? " 🎉 All done!" : ""}</p>
          </CardContent>
        </Card>

        {/* Today's Habits */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Today</h2>
          {isLoading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
          ) : todayHabits && todayHabits.length > 0 ? (
            todayHabits.map((item: any) => {
              const { habit, todayStatus } = item;
              const isDone = todayStatus === "completed";
              const isSkipped = todayStatus === "skipped";
              return (
                <Card key={habit.id} className={isDone ? "opacity-75" : ""}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: (habit.color || "#14b8a6") + "22" }}>
                      {habit.icon || "🎯"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isDone ? "line-through text-muted-foreground" : ""}`}>{habit.name}</p>
                        {habit.currentStreak > 0 && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Flame className="w-3 h-3 text-orange-500" />{habit.currentStreak}
                          </Badge>
                        )}
                      </div>
                      {habit.description && <p className="text-xs text-muted-foreground truncate">{habit.description}</p>}
                      <p className="text-xs text-muted-foreground capitalize">{habit.timeOfDay || "anytime"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isDone && !isSkipped ? (
                        <>
                          <Button size="sm" onClick={() => complete.mutate({ id: habit.id, data: {} })} className="gap-1 bg-green-500 hover:bg-green-600">
                            <Check className="w-3.5 h-3.5" />Done
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => skip.mutate({ id: habit.id, data: {} })}>
                            <SkipForward className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Badge variant={isDone ? "default" : "secondary"}>{isDone ? "✓ Done" : "Skipped"}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No habits yet</p>
                <p className="text-sm mt-1">Create your first habit to get started!</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* All Habits */}
        {allHabits && allHabits.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">All Habits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allHabits.map((habit: any) => (
                <Card key={habit.id}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: (habit.color || "#14b8a6") + "22" }}>
                      {habit.icon || "🎯"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{habit.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Flame className="w-3 h-3 text-orange-500" />{habit.currentStreak} streak</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Trophy className="w-3 h-3 text-yellow-500" />{habit.totalCompletions} total</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteHabit.mutate({ id: habit.id })} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
