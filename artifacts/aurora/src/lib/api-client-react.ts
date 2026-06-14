import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Helper for fetch calls
async function fetcher(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// 1. OpenAI / Aurora AI Conversations
export function useListOpenaiConversations() {
  return useQuery<any[]>({
    queryKey: ["/api/openai/conversations"],
    queryFn: () => fetcher("/api/openai/conversations"),
  });
}

export function getListOpenaiConversationsQueryKey() {
  return ["/api/openai/conversations"];
}

export function useCreateOpenaiConversation(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { data: { title: string } }>({
    mutationFn: (vars) => fetcher("/api/openai/conversations", {
      method: "POST",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useGetOpenaiConversation(id: number, options?: any) {
  return useQuery<any>({
    queryKey: ["/api/openai/conversations", id],
    queryFn: () => fetcher(`/api/openai/conversations/${id}`),
    enabled: options?.query?.enabled,
  });
}

export function getGetOpenaiConversationQueryKey(id: number) {
  return ["/api/openai/conversations", id];
}

export function useDeleteOpenaiConversation(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/openai/conversations/${vars.id}`, {
      method: "DELETE",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
    onError: (err, variables, context) => {
      if (options?.mutation?.onError) {
        options.mutation.onError(err, variables, context);
      }
    }
  });
}

// 2. Dashboard, Profile and Memories
export function useGetDashboard() {
  return useQuery<any>({
    queryKey: ["/api/dashboard"],
    queryFn: () => fetcher("/api/dashboard"),
  });
}

export function getGetDashboardQueryKey() {
  return ["/api/dashboard"];
}

export function useGetProfile() {
  return useQuery<any>({
    queryKey: ["/api/profile"],
    queryFn: () => fetcher("/api/profile"),
  });
}

export function getGetProfileQueryKey() {
  return ["/api/profile"];
}

export function useUpsertProfile(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { data: any }>({
    mutationFn: (vars) => fetcher("/api/profile", {
      method: "POST",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/profile"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useListMemories() {
  return useQuery<any[]>({
    queryKey: ["/api/memories"],
    queryFn: () => fetcher("/api/memories"),
  });
}

// 3. Streaks
export function useGetStreaks() {
  return useQuery<any>({
    queryKey: ["/api/streaks"],
    queryFn: () => fetcher("/api/streaks"),
  });
}

// 4. Sleep
export function useListSleep() {
  return useQuery<any[]>({
    queryKey: ["/api/sleep"],
    queryFn: () => fetcher("/api/sleep"),
  });
}

export function getListSleepQueryKey() {
  return ["/api/sleep"];
}

export function useCreateSleepLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { data: any }>({
    mutationFn: (vars) => fetcher("/api/sleep", {
      method: "POST",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/sleep"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useDeleteSleepLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/sleep/${vars.id}`, {
      method: "DELETE",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/sleep"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useGetSleepAnalysis(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/sleep/analysis"],
    queryFn: () => fetcher("/api/sleep/analysis"),
    enabled: options?.query?.enabled,
  });
}

export function getGetSleepAnalysisQueryKey() {
  return ["/api/sleep/analysis"];
}

// 5. Reports
export function useGetWeeklyReport() {
  return useQuery<any>({
    queryKey: ["/api/reports/weekly"],
    queryFn: () => fetcher("/api/reports/weekly"),
  });
}

export function useGetMonthlyReport() {
  return useQuery<any>({
    queryKey: ["/api/reports/monthly"],
    queryFn: () => fetcher("/api/reports/monthly"),
  });
}

// 6. Nutrition
export function useGetTodayNutrition() {
  return useQuery<any>({
    queryKey: ["/api/nutrition/today"],
    queryFn: () => fetcher("/api/nutrition/today"),
  });
}

export function getGetTodayNutritionQueryKey() {
  return ["/api/nutrition/today"];
}

export function useListMeals() {
  return useQuery<any[]>({
    queryKey: ["/api/nutrition"],
    queryFn: () => fetcher("/api/nutrition"),
  });
}

export function getListMealsQueryKey() {
  return ["/api/nutrition"];
}

export function useCreateMealLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { data: any }>({
    mutationFn: (vars) => fetcher("/api/nutrition", {
      method: "POST",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/nutrition"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useDeleteMealLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/nutrition/${vars.id}`, {
      method: "DELETE",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/nutrition"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useUpdateMealLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number; data: any }>({
    mutationFn: (vars) => fetcher(`/api/nutrition/${vars.id}`, {
      method: "PUT",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/nutrition"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

// 7. Hydration
export function useGetTodayHydration() {
  return useQuery<any>({
    queryKey: ["/api/hydration/today"],
    queryFn: () => fetcher("/api/hydration/today"),
  });
}

export function getGetTodayHydrationQueryKey() {
  return ["/api/hydration/today"];
}

export function useGetWeeklyHydration() {
  return useQuery<any>({
    queryKey: ["/api/hydration/weekly"],
    queryFn: () => fetcher("/api/hydration/weekly"),
  });
}

export function getGetWeeklyHydrationQueryKey() {
  return ["/api/hydration/weekly"];
}

export function useListHydration() {
  return useQuery<any[]>({
    queryKey: ["/api/hydration"],
    queryFn: () => fetcher("/api/hydration"),
  });
}

export function getListHydrationQueryKey() {
  return ["/api/hydration"];
}

export function useCreateHydrationLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { data: { amountMl: number; note?: string } }>({
    mutationFn: (vars) => fetcher("/api/hydration", {
      method: "POST",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/hydration"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useDeleteHydrationLog(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/hydration/${vars.id}`, {
      method: "DELETE",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/hydration"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

// 8. Habits
export function useGetTodayHabits() {
  return useQuery<any[]>({
    queryKey: ["/api/habits/today"],
    queryFn: () => fetcher("/api/habits/today"),
  });
}

export function getGetTodayHabitsQueryKey() {
  return ["/api/habits/today"];
}

export function useListHabits() {
  return useQuery<any[]>({
    queryKey: ["/api/habits"],
    queryFn: () => fetcher("/api/habits"),
  });
}

export function getListHabitsQueryKey() {
  return ["/api/habits"];
}

export function useCreateHabit(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { data: any }>({
    mutationFn: (vars) => fetcher("/api/habits", {
      method: "POST",
      body: JSON.stringify(vars.data),
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/habits"] });
      qc.invalidateQueries({ queryKey: ["/api/habits/today"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useCompleteHabit(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/habits/${vars.id}/complete`, {
      method: "POST",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/habits/today"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useSkipHabit(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/habits/${vars.id}/skip`, {
      method: "POST",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/habits/today"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useDeleteHabit(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/habits/${vars.id}`, {
      method: "DELETE",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/habits"] });
      qc.invalidateQueries({ queryKey: ["/api/habits/today"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

// 9. Notifications
export function useListNotifications() {
  return useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: () => fetcher("/api/notifications"),
  });
}

export function useMarkNotificationRead(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, { id: number }>({
    mutationFn: (vars) => fetcher(`/api/notifications/${vars.id}/read`, {
      method: "POST",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}

export function useMarkAllNotificationsRead(options?: any) {
  const qc = useQueryClient();
  return useMutation<any, any, void>({
    mutationFn: () => fetcher("/api/notifications/read-all", {
      method: "POST",
    }),
    onSuccess: (data, variables, context) => {
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      if (options?.mutation?.onSuccess) {
        options.mutation.onSuccess(data, variables, context);
      }
    },
  });
}
