import { useState, useEffect } from "react";
import { useGetProfile, useUpsertProfile, getGetProfileQueryKey, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Bell, 
  Ruler, 
  Smartphone, 
  Shield, 
  Target, 
  Check, 
  Loader2, 
  Sparkles, 
  Moon, 
  Droplets,
  Heart,
  Activity
} from "lucide-react";

const GOALS = [
  { id: "improve_hydration", label: "Improve Hydration", icon: "💧" },
  { id: "sleep_better", label: "Sleep Better", icon: "😴" },
  { id: "build_habits", label: "Build Better Habits", icon: "🎯" },
  { id: "eat_healthier", label: "Eat Healthier", icon: "🥗" },
  { id: "improve_energy", label: "Improve Energy Levels", icon: "⚡" },
  { id: "improve_consistency", label: "Improve Consistency", icon: "📈" },
];

export default function SettingsPage() {
  const { data: profile, isLoading } = useGetProfile();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Profile fields
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightVal, setHeightVal] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [wakeUpTime, setWakeUpTime] = useState("07:00");
  const [bedtime, setBedtime] = useState("23:00");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goals, setGoals] = useState<string[]>([]);
  const [dailyWaterGoal, setDailyWaterGoal] = useState("2000");
  const [dailySleepGoalHours, setDailySleepGoalHours] = useState("8");

  // Preferences fields
  const [notifyHydration, setNotifyHydration] = useState(true);
  const [notifySleep, setNotifySleep] = useState(true);
  const [notifyHabits, setNotifyHabits] = useState(true);
  const [notifyInsights, setNotifyInsights] = useState(true);

  const [unitWater, setUnitWater] = useState<"ml" | "oz">("ml");
  const [unitWeight, setUnitWeight] = useState<"kg" | "lbs">("kg");
  const [unitHeight, setUnitHeight] = useState<"cm" | "in">("cm");

  const [shareData, setShareData] = useState(true);

  // Device mock states
  const [devices, setDevices] = useState<string[]>([]);
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);

  // Sync state from profile
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAge(profile.age != null ? String(profile.age) : "");
      setGender(profile.gender || "");
      setWakeUpTime(profile.wakeUpTime || "07:00");
      setBedtime(profile.bedtime || "23:00");
      setActivityLevel(profile.activityLevel || "moderate");
      setGoals(profile.goals || []);
      setDailySleepGoalHours(String(profile.dailySleepGoalHours || 8));

      // Notification settings
      setNotifyHydration(profile.preferences?.notifications?.hydration ?? true);
      setNotifySleep(profile.preferences?.notifications?.sleep ?? true);
      setNotifyHabits(profile.preferences?.notifications?.habits ?? true);
      setNotifyInsights(profile.preferences?.notifications?.insights ?? true);

      // Units
      const uWater = profile.preferences?.units?.water || "ml";
      const uWeight = profile.preferences?.units?.weight || "kg";
      const uHeight = profile.preferences?.units?.height || "cm";
      
      setUnitWater(uWater);
      setUnitWeight(uWeight);
      setUnitHeight(uHeight);

      // Height value display
      const rawHeight = profile.heightCm;
      if (rawHeight != null) {
        if (uHeight === "in") {
          setHeightVal(String(Math.round(rawHeight / 2.54)));
        } else {
          setHeightVal(String(Math.round(rawHeight)));
        }
      } else {
        setHeightVal("");
      }

      // Weight value display
      const rawWeight = profile.weightKg;
      if (rawWeight != null) {
        if (uWeight === "lbs") {
          setWeightVal(String(Math.round(rawWeight * 2.20462)));
        } else {
          setWeightVal(String(Math.round(rawWeight)));
        }
      } else {
        setWeightVal("");
      }

      // Daily water goal display
      const rawWater = profile.dailyWaterGoalMl || 2000;
      if (uWater === "oz") {
        setDailyWaterGoal(String(Math.round(rawWater / 29.5735)));
      } else {
        setDailyWaterGoal(String(rawWater));
      }

      // Privacy
      setShareData(profile.preferences?.privacy?.shareData ?? true);

      // Devices
      setDevices(profile.preferences?.devices || []);
    }
  }, [profile]);

  const upsert = useUpsertProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDashboardQueryKey() });
        toast({ title: "Settings saved! ✓", description: "Your preferences and profile have been updated." });
      },
      onError: () => toast({ title: "Error saving settings", variant: "destructive" }),
    },
  });

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleDeviceToggle = (deviceName: string) => {
    if (devices.includes(deviceName)) {
      // Disconnect immediately
      setDevices(prev => prev.filter(d => d !== deviceName));
      toast({ title: `Disconnected ${deviceName}`, description: `Access to ${deviceName} health data has been revoked.` });
    } else {
      // Connect flow (simulated network lag)
      setConnectingDevice(deviceName);
      setTimeout(() => {
        setDevices(prev => [...prev, deviceName]);
        setConnectingDevice(null);
        toast({ title: `Connected ${deviceName}! ✓`, description: `Aurora is now syncing data from ${deviceName}.` });
      }, 1000);
    }
  };

  const handleSave = () => {
    // Convert height to cm for storage
    let hCm: number | undefined;
    if (heightVal) {
      const parsedHeight = parseFloat(heightVal);
      hCm = unitHeight === "in" ? parsedHeight * 2.54 : parsedHeight;
    }

    // Convert weight to kg for storage
    let wKg: number | undefined;
    if (weightVal) {
      const parsedWeight = parseFloat(weightVal);
      wKg = unitWeight === "lbs" ? parsedWeight / 2.20462 : parsedWeight;
    }

    // Convert daily water goal to ml for storage
    let wMl = 2000;
    if (dailyWaterGoal) {
      const parsedWater = parseInt(dailyWaterGoal);
      wMl = unitWater === "oz" ? Math.round(parsedWater * 29.5735) : parsedWater;
    }

    upsert.mutate({
      data: {
        name,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
        heightCm: hCm,
        weightKg: wKg,
        wakeUpTime,
        bedtime,
        activityLevel,
        goals,
        dailyWaterGoalMl: wMl,
        dailySleepGoalHours: parseFloat(dailySleepGoalHours) || 8,
        onboardingCompleted: true,
        preferences: {
          notifications: {
            hydration: notifyHydration,
            sleep: notifySleep,
            habits: notifyHabits,
            insights: notifyInsights,
          },
          units: {
            water: unitWater,
            weight: unitWeight,
            height: unitHeight,
          },
          privacy: {
            shareData,
          },
          devices,
        },
      },
    });
  };

  // Unit toggle handlers that adapt goals text inputs
  const handleWaterUnitChange = (newUnit: "ml" | "oz") => {
    if (newUnit === unitWater) return;
    const currentVal = parseFloat(dailyWaterGoal) || 0;
    if (newUnit === "oz") {
      setDailyWaterGoal(String(Math.round(currentVal / 29.5735)));
    } else {
      setDailyWaterGoal(String(Math.round(currentVal * 29.5735)));
    }
    setUnitWater(newUnit);
  };

  const handleWeightUnitChange = (newUnit: "kg" | "lbs") => {
    if (newUnit === unitWeight) return;
    const currentVal = parseFloat(weightVal) || 0;
    if (newUnit === "lbs") {
      setWeightVal(String(Math.round(currentVal * 2.20462)));
    } else {
      setWeightVal(String(Math.round(currentVal / 2.20462)));
    }
    setUnitWeight(newUnit);
  };

  const handleHeightUnitChange = (newUnit: "cm" | "in") => {
    if (newUnit === unitHeight) return;
    const currentVal = parseFloat(heightVal) || 0;
    if (newUnit === "in") {
      setHeightVal(String(Math.round(currentVal / 2.54)));
    } else {
      setHeightVal(String(Math.round(currentVal * 2.54)));
    }
    setUnitHeight(newUnit);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent flex items-center gap-2">
              <Activity className="w-8 h-8 text-primary animate-pulse" /> Profile & Settings
            </h1>
            <p className="text-muted-foreground mt-1">Configure your companion dashboard, measurements, privacy, and synced integrations.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={upsert.isPending || !name} 
            className="w-full md:w-auto h-11 px-6 bg-gradient-to-r from-primary to-indigo-600 hover:from-primary/90 hover:to-indigo-600/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300"
          >
            {upsert.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Changes
              </>
            ) : "Save Changes"}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-[200px] md:col-span-1 rounded-xl" />
            <div className="md:col-span-3 space-y-4">
              <Skeleton className="h-[120px] w-full rounded-xl" />
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
          </div>
        ) : (
          <Tabs defaultValue="profile" className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <TabsList className="flex md:flex-col items-stretch justify-start bg-card/40 border border-border/60 p-1.5 rounded-xl h-auto overflow-x-auto md:overflow-x-visible md:col-span-1 gap-1">
              <TabsTrigger value="profile" className="justify-start gap-2.5 px-4 py-3 rounded-lg text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Profile Info</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="justify-start gap-2.5 px-4 py-3 rounded-lg text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200">
                <Bell className="w-4 h-4" />
                <span className="text-sm font-medium">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="justify-start gap-2.5 px-4 py-3 rounded-lg text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200">
                <Ruler className="w-4 h-4" />
                <span className="text-sm font-medium">Units & Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="devices" className="justify-start gap-2.5 px-4 py-3 rounded-lg text-left data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all duration-200">
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-medium">Connected Devices</span>
              </TabsTrigger>
            </TabsList>

            <div className="md:col-span-3">
              {/* Profile Information Tab */}
              <TabsContent value="profile" className="mt-0 space-y-6">
                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" /> Basic Information
                    </CardTitle>
                    <CardDescription>Update your personal measurements and demographic metrics.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="prof-name">Name</Label>
                        <Input id="prof-name" value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" className="bg-background/80" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prof-age">Age</Label>
                        <Input id="prof-age" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="25" min="1" max="120" className="bg-background/80" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="prof-gender">Gender</Label>
                        <Select value={gender} onValueChange={setGender}>
                          <SelectTrigger id="prof-gender" className="bg-background/80"><SelectValue placeholder="Select Gender" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prof-height">Height ({unitHeight})</Label>
                        <Input id="prof-height" type="number" value={heightVal} onChange={e => setHeightVal(e.target.value)} placeholder={unitHeight === "cm" ? "175" : "69"} className="bg-background/80" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prof-weight">Weight ({unitWeight})</Label>
                        <Input id="prof-weight" type="number" value={weightVal} onChange={e => setWeightVal(e.target.value)} placeholder={unitWeight === "kg" ? "70" : "154"} className="bg-background/80" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="prof-activity">Activity Level</Label>
                      <Select value={activityLevel} onValueChange={setActivityLevel}>
                        <SelectTrigger id="prof-activity" className="bg-background/80"><SelectValue /></SelectTrigger>
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

                {/* Health Goals Section */}
                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="w-5 h-5 text-green-500" /> Health Goals
                    </CardTitle>
                    <CardDescription>Select the main goals Aurora should help you track.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {GOALS.map(goal => {
                        const active = goals.includes(goal.id);
                        return (
                          <button 
                            key={goal.id} 
                            onClick={() => toggleGoal(goal.id)}
                            className={`p-4 rounded-xl text-center transition-all duration-300 border flex flex-col items-center justify-center gap-1.5 group relative overflow-hidden ${
                              active 
                                ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/5" 
                                : "border-border/60 hover:border-primary/50 bg-background/40 hover:bg-background/80"
                            }`}
                          >
                            <span className="text-2xl transition-transform duration-300 group-hover:scale-110">{goal.icon}</span>
                            <span className="text-xs font-semibold tracking-tight">{goal.label}</span>
                            {active && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Daily Schedule & Targets */}
                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-500" /> Daily Targets & Schedule
                    </CardTitle>
                    <CardDescription>Adjust your sleep timeline and default daily goals.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="prof-water-goal" className="flex items-center gap-1.5">
                          <Droplets className="w-4 h-4 text-blue-500" /> Daily Water Intake ({unitWater})
                        </Label>
                        <Input 
                          id="prof-water-goal" 
                          type="number" 
                          value={dailyWaterGoal} 
                          onChange={e => setDailyWaterGoal(e.target.value)} 
                          className="bg-background/80" 
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Target in metric: {unitWater === "oz" ? Math.round(parseFloat(dailyWaterGoal || "0") * 29.5735) : dailyWaterGoal} ml
                        </p>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prof-sleep-goal" className="flex items-center gap-1.5">
                          <Moon className="w-4 h-4 text-purple-500" /> Daily Sleep Target (hours)
                        </Label>
                        <Input 
                          id="prof-sleep-goal" 
                          type="number" 
                          value={dailySleepGoalHours} 
                          onChange={e => setDailySleepGoalHours(e.target.value)} 
                          step="0.5" 
                          className="bg-background/80" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="prof-wakeup">Wake-up Time</Label>
                        <Input id="prof-wakeup" type="time" value={wakeUpTime} onChange={e => setWakeUpTime(e.target.value)} className="bg-background/80" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="prof-bedtime">Bedtime</Label>
                        <Input id="prof-bedtime" type="time" value={bedtime} onChange={e => setBedtime(e.target.value)} className="bg-background/80" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Preferences Tab */}
              <TabsContent value="notifications" className="mt-0">
                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Bell className="w-5 h-5 text-amber-500" /> Notification Reminders
                    </CardTitle>
                    <CardDescription>Manage how and when Aurora reaches out to keep you accountable.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 transition-all hover:bg-background/60">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-blue-500" /> Hydration Reminders
                        </Label>
                        <p className="text-xs text-muted-foreground max-w-md">Aurora will nudge you to keep up with your water intake if you run behind schedule.</p>
                      </div>
                      <Switch checked={notifyHydration} onCheckedChange={setNotifyHydration} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 transition-all hover:bg-background/60">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-purple-500" /> Sleep Reminders
                        </Label>
                        <p className="text-xs text-muted-foreground max-w-md">Get bedtime prep suggestions 30 minutes before your scheduled bedtime.</p>
                      </div>
                      <Switch checked={notifySleep} onCheckedChange={setNotifySleep} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 transition-all hover:bg-background/60">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-green-500" /> Habit Reminders
                        </Label>
                        <p className="text-xs text-muted-foreground max-w-md">Get micro-nudges to complete habits configured in your routine.</p>
                      </div>
                      <Switch checked={notifyHabits} onCheckedChange={setNotifyHabits} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 transition-all hover:bg-background/60">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" /> Daily Insights & Reports
                        </Label>
                        <p className="text-xs text-muted-foreground max-w-md">Receive customized observations like "You sleep better on weekends" or monthly reports.</p>
                      </div>
                      <Switch checked={notifyInsights} onCheckedChange={setNotifyInsights} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Units & Privacy Tab */}
              <TabsContent value="preferences" className="mt-0 space-y-6">
                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Ruler className="w-5 h-5 text-indigo-500" /> Measurement Units
                    </CardTitle>
                    <CardDescription>Select preferred measurement standards across weight, height, and liquids.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="unit-water">Liquid Intake</Label>
                        <Select value={unitWater} onValueChange={handleWaterUnitChange}>
                          <SelectTrigger id="unit-water" className="bg-background/80"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ml">Milliliters (ml)</SelectItem>
                            <SelectItem value="oz">Fluid Ounces (oz)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="unit-weight">Body Weight</Label>
                        <Select value={unitWeight} onValueChange={handleWeightUnitChange}>
                          <SelectTrigger id="unit-weight" className="bg-background/80"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kg">Kilograms (kg)</SelectItem>
                            <SelectItem value="lbs">Pounds (lbs)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="unit-height">Height</Label>
                        <Select value={unitHeight} onValueChange={handleHeightUnitChange}>
                          <SelectTrigger id="unit-height" className="bg-background/80"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cm">Centimeters (cm)</SelectItem>
                            <SelectItem value="in">Inches (in)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-emerald-500" /> Security & Privacy
                    </CardTitle>
                    <CardDescription>Control your profile visibility and diagnostic data sharing options.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Share Diagnostic Metadata</Label>
                        <p className="text-xs text-muted-foreground max-w-md">Help us improve Aurora by sharing anonymized behavior metrics and system diagnostics.</p>
                      </div>
                      <Switch checked={shareData} onCheckedChange={setShareData} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Connected Devices Tab */}
              <TabsContent value="devices" className="mt-0">
                <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-primary" /> Connected Integrations
                    </CardTitle>
                    <CardDescription>Sync fitness trackers to automate your hydration, sleep, and activity logs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Apple Health */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-bold">
                          🍎
                        </div>
                        <div>
                          <Label className="text-sm font-semibold block">Apple Health</Label>
                          <p className="text-xs text-muted-foreground">Sync steps, sleep cycles, and daily activity logs.</p>
                        </div>
                      </div>
                      <Button 
                        variant={devices.includes("Apple Health") ? "destructive" : "outline"}
                        disabled={connectingDevice === "Apple Health"}
                        onClick={() => handleDeviceToggle("Apple Health")}
                        className="w-28 h-9 text-xs rounded-lg"
                      >
                        {connectingDevice === "Apple Health" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : devices.includes("Apple Health") ? (
                          "Disconnect"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>

                    {/* Google Fit */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                          🏃
                        </div>
                        <div>
                          <Label className="text-sm font-semibold block">Google Fit</Label>
                          <p className="text-xs text-muted-foreground">Import logs for workouts, activity points, and sleep records.</p>
                        </div>
                      </div>
                      <Button 
                        variant={devices.includes("Google Fit") ? "destructive" : "outline"}
                        disabled={connectingDevice === "Google Fit"}
                        onClick={() => handleDeviceToggle("Google Fit")}
                        className="w-28 h-9 text-xs rounded-lg"
                      >
                        {connectingDevice === "Google Fit" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : devices.includes("Google Fit") ? (
                          "Disconnect"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>

                    {/* Fitbit */}
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                          ⌚
                        </div>
                        <div>
                          <Label className="text-sm font-semibold block">Fitbit Device</Label>
                          <p className="text-xs text-muted-foreground">Keep real-time watch telemetry like sleep phases in sync.</p>
                        </div>
                      </div>
                      <Button 
                        variant={devices.includes("Fitbit") ? "destructive" : "outline"}
                        disabled={connectingDevice === "Fitbit"}
                        onClick={() => handleDeviceToggle("Fitbit")}
                        className="w-28 h-9 text-xs rounded-lg"
                      >
                        {connectingDevice === "Fitbit" ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : devices.includes("Fitbit") ? (
                          "Disconnect"
                        ) : (
                          "Connect"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
