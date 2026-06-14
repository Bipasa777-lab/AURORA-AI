import { useState } from "react";
import { useGetTodayNutrition, useListMeals, useCreateMealLog, useDeleteMealLog, useUpdateMealLog, getGetTodayNutritionQueryKey, getListMealsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, Plus, Trash2 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "drink"];

export default function NutritionPage() {
  const [open, setOpen] = useState(false);
  const [mealType, setMealType] = useState("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: today, isLoading } = useGetTodayNutrition();
  const { data: meals } = useListMeals({});

  const create = useCreateMealLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayNutritionQueryKey() });
        qc.invalidateQueries({ queryKey: getListMealsQueryKey() });
        setOpen(false);
        setName("");
        setCalories("");
        setProtein("");
        setCarbs("");
        setFat("");
        setNotes("");
        toast({ title: "Meal logged!" });
      },
    },
  });

  const remove = useDeleteMealLog({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTodayNutritionQueryKey() });
        qc.invalidateQueries({ queryKey: getListMealsQueryKey() });
      },
    },
  });

  const macroData = today ? [
    { name: "Protein", value: today.totalProteinG, color: "#14b8a6" },
    { name: "Carbs", value: today.totalCarbsG, color: "#8b5cf6" },
    { name: "Fat", value: today.totalFatG, color: "#f97316" },
  ].filter(d => d.value > 0) : [];

  const mealTypeColor: Record<string, string> = {
    breakfast: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    lunch: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    dinner: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    snack: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    drink: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <UtensilsCrossed className="w-7 h-7 text-orange-500" />Nutrition
            </h1>
            <p className="text-muted-foreground mt-1">Track your meals and macronutrients</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shrink-0"><Plus className="w-4 h-4" />Log Meal</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log a meal</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Meal type</Label>
                    <Select value={mealType} onValueChange={setMealType}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Food name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicken salad" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Calories (kcal)</Label>
                  <Input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="0" className="mt-1" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Protein (g)</Label>
                    <Input type="number" value={protein} onChange={e => setProtein(e.target.value)} placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <Label>Carbs (g)</Label>
                    <Input type="number" value={carbs} onChange={e => setCarbs(e.target.value)} placeholder="0" className="mt-1" />
                  </div>
                  <div>
                    <Label>Fat (g)</Label>
                    <Input type="number" value={fat} onChange={e => setFat(e.target.value)} placeholder="0" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes..." className="mt-1" />
                </div>
                <Button
                  onClick={() => create.mutate({ data: { mealType: mealType as any, name, calories: calories ? parseInt(calories) : undefined, proteinG: protein ? parseFloat(protein) : undefined, carbsG: carbs ? parseFloat(carbs) : undefined, fatG: fat ? parseFloat(fat) : undefined, notes: notes || undefined } })}
                  disabled={!name || create.isPending} className="w-full">
                  {create.isPending ? "Saving..." : "Log Meal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">Today's Summary</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-32 w-full" /> : (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-orange-500">{today?.totalCalories ?? 0}</div>
                    <p className="text-xs text-muted-foreground">kcal consumed</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-sm font-semibold text-primary">{today?.totalProteinG ?? 0}g</p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-sm font-semibold text-accent">{today?.totalCarbsG ?? 0}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-sm font-semibold text-orange-500">{today?.totalFatG ?? 0}g</p>
                      <p className="text-xs text-muted-foreground">Fat</p>
                    </div>
                  </div>
                  {macroData.length > 0 && (
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={macroData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                          {macroData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${v}g`, ""]} />
                        <Legend iconType="circle" iconSize={8} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meal Log */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Today's Meals ({today?.mealsLogged ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {today?.meals && today.meals.length > 0 ? (
                <div className="space-y-2">
                  {today.meals.map((meal: any) => (
                    <div key={meal.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{meal.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${mealTypeColor[meal.mealType] || "bg-muted text-muted-foreground"}`}>{meal.mealType}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {meal.calories != null && `${meal.calories} kcal`}
                          {meal.proteinG != null && ` · P:${meal.proteinG}g`}
                          {meal.carbsG != null && ` · C:${meal.carbsG}g`}
                          {meal.fatG != null && ` · F:${meal.fatG}g`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate({ id: meal.id })} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No meals logged today</p>
                  <p className="text-sm mt-1">Log your first meal to start tracking</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
