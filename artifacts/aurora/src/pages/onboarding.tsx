import { useState, useEffect } from "react";
import { useGetProfile, useUpsertProfile, getGetProfileQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { User, Target, Droplets, Moon, Check, Bell } from "lucide-react";

const GOALS = [
  { id: "improve_hydration", label: "Improve Hydration", icon: "💧" },
  { id: "sleep_better", label: "Sleep Better", icon: "😴" },
  { id: "build_habits", label: "Build Better Habits", icon: "🎯" },
  { id: "eat_healthier", label: "Eat Healthier", icon: "🥗" },
  { id: "improve_energy", label: "Improve Energy Levels", icon: "⚡" },
  { id: "improve_consistency", label: "Improve Consistency", icon: "📈" },
];

export default function OnboardingPage() {
  const { data: profile, isLoading } = useGetProfile();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("07:00");
  const [bedtime, setBedtime] = useState("23:00");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goals, setGoals] = useState<string[]>([]);
  const [dailyWaterGoalMl, setDailyWaterGoalMl] = useState("2000");
  const [dailySleepGoalHours, setDailySleepGoalHours] = useState("8");

  // Notification preferences state
  const [notifyHydration, setNotifyHydration] = useState(true);
  const [notifySleep, setNotifySleep] = useState(true);
  const [notifyHabits, setNotifyHabits] = useState(true);
  const [notifyInsights, setNotifyInsights] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age != null ? String(profile.age) : "");
      setGender(profile.gender || "");
      setHeightCm(profile.heightCm != null ? String(profile.heightCm) : "");
      setWeightKg(profile.weightKg != null ? String(profile.weightKg) : "");
      setWakeUpTime(profile.wakeUpTime || "07:00");
      setBedtime(profile.bedtime || "23:00");
      setActivityLevel(profile.activityLevel || "moderate");
      setGoals(profile.goals || []);
      setDailyWaterGoalMl(String(profile.dailyWaterGoalMl || 2000));
      setDailySleepGoalHours(String(profile.dailySleepGoalHours || 8));
      
      if (profile.preferences) {
        setNotifyHydration(profile.preferences.notifications?.hydration ?? true);
        setNotifySleep(profile.preferences.notifications?.sleep ?? true);
        setNotifyHabits(profile.preferences.notifications?.habits ?? true);
        setNotifyInsights(profile.preferences.notifications?.insights ?? true);
      }
    }
  }, [profile]);

  const upsert = useUpsertProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Profile saved! ✓", description: "Your health companion is ready." });
        setLocation("/dashboard");
      },
      onError: () => toast({ title: "Error saving profile", variant: "destructive" }),
    },
  });

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSave = () => {
    upsert.mutate({
      data: {
        name,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        wakeUpTime,
        bedtime,
        activityLevel,
        goals,
        dailyWaterGoalMl: parseInt(dailyWaterGoalMl) || 2000,
        dailySleepGoalHours: parseFloat(dailySleepGoalHours) || 8,
        onboardingCompleted: true,
        preferences: {
          notifications: {
            hydration: notifyHydration,
            sleep: notifySleep,
            habits: notifyHabits,
            insights: notifyInsights,
          },
          units: profile?.preferences?.units || { water: "ml", weight: "kg", height: "cm" },
          privacy: profile?.preferences?.privacy || { shareData: true },
          devices: profile?.preferences?.devices || [],
        },
      },
    });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <User className="w-7 h-7 text-primary" />Your Profile
          </h1>
          <p className="text-muted-foreground mt-1">Help Aurora personalize your health journey</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>
        ) : (
          <>
            {/* Basic Info */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="w-4 h-4" />Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-1" />
                  </div>
                  <div>
                    <Label>Age</Label>
                    <Input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" min="1" max="120" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170" className="mt-1" />
                  </div>
                  <div>
                    <Label>Weight (kg)</Label>
                    <Input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="70" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Activity Level</Label>
                  <Select value={activityLevel} onValueChange={setActivityLevel}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (desk job, minimal exercise)</SelectItem>
                      <SelectItem value="light">Light (1-3 days/week exercise)</SelectItem>
                      <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                      <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (athlete/physical job)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-green-500" />Health Goals</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GOALS.map(goal => (
                    <button key={goal.id} onClick={() => toggleGoal(goal.id)}
                      className={`p-3 rounded-xl text-center transition-all border ${goals.includes(goal.id) ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"}`}>
                      <div className="text-2xl mb-1">{goal.icon}</div>
                      <p className="text-xs font-medium">{goal.label}</p>
                      {goals.includes(goal.id) && <Check className="w-3 h-3 mx-auto mt-1 text-primary" />}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Goals */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Daily Goals</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-blue-500" />Daily water goal (ml)</Label>
                    <Input type="number" value={dailyWaterGoalMl} onChange={e => setDailyWaterGoalMl(e.target.value)} step="100" min="500" max="5000" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">{Math.round(parseInt(dailyWaterGoalMl || "2000") / 100) / 10}L per day</p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-1.5"><Moon className="w-3.5 h-3.5 text-purple-500" />Sleep goal (hours)</Label>
                    <Input type="number" value={dailySleepGoalHours} onChange={e => setDailySleepGoalHours(e.target.value)} step="0.5" min="4" max="12" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Wake-up time</Label>
                    <Input type="time" value={wakeUpTime} onChange={e => setWakeUpTime(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label>Bedtime</Label>
                    <Input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="mt-1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-500" /> Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Hydration Reminders</Label>
                    <p className="text-xs text-muted-foreground">Receive reminders to drink water and log your progress</p>
                  </div>
                  <Switch checked={notifyHydration} onCheckedChange={setNotifyHydration} />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Sleep Reminders</Label>
                    <p className="text-xs text-muted-foreground">Get prompts when it is time to wind down or log sleep</p>
                  </div>
                  <Switch checked={notifySleep} onCheckedChange={setNotifySleep} />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Habit Reminders</Label>
                    <p className="text-xs text-muted-foreground">Stay on track with notifications for daily habits</p>
                  </div>
                  <Switch checked={notifyHabits} onCheckedChange={setNotifyHabits} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Daily Insights</Label>
                    <p className="text-xs text-muted-foreground">Receive summary insights and personalized reports</p>
                  </div>
                  <Switch checked={notifyInsights} onCheckedChange={setNotifyInsights} />
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={upsert.isPending || !name} className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm transition-all duration-200" size="lg">
              {upsert.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </>
        )}
      </div>
    </AppLayout>
  );
}
