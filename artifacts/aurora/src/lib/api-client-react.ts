import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Helper for fetch calls
async function fetcher(url: string, init?: RequestInit) {
  const mockEmail = localStorage.getItem("mock_user_email") || "";
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Mock-User-Email": mockEmail,
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
export function useListOpenaiConversations(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/openai/conversations"],
    queryFn: () => fetcher("/api/openai/conversations"),
    ...options?.query,
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
export function useGetDashboard(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/dashboard"],
    queryFn: () => fetcher("/api/dashboard"),
    ...options?.query,
  });
}

export function getGetDashboardQueryKey() {
  return ["/api/dashboard"];
}

export function useGetProfile(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/profile"],
    queryFn: () => fetcher("/api/profile"),
    ...options?.query,
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

export function useListMemories(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/memories"],
    queryFn: () => fetcher("/api/memories"),
    ...options?.query,
  });
}

// 3. Streaks
export function useGetStreaks(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/streaks"],
    queryFn: () => fetcher("/api/streaks"),
    ...options?.query,
  });
}

// 4. Sleep
export function useListSleep(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/sleep"],
    queryFn: () => fetcher("/api/sleep"),
    ...options?.query,
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
export function useGetWeeklyReport(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/reports/weekly"],
    queryFn: () => fetcher("/api/reports/weekly"),
    ...options?.query,
  });
}

export function useGetMonthlyReport(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/reports/monthly"],
    queryFn: () => fetcher("/api/reports/monthly"),
    ...options?.query,
  });
}

// 6. Nutrition
export function useGetTodayNutrition(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/nutrition/today"],
    queryFn: () => fetcher("/api/nutrition/today"),
    ...options?.query,
  });
}

export function getGetTodayNutritionQueryKey() {
  return ["/api/nutrition/today"];
}

export function useListMeals(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/nutrition"],
    queryFn: () => fetcher("/api/nutrition"),
    ...options?.query,
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
export function useGetTodayHydration(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/hydration/today"],
    queryFn: () => fetcher("/api/hydration/today"),
    ...options?.query,
  });
}

export function getGetTodayHydrationQueryKey() {
  return ["/api/hydration/today"];
}

export function useGetWeeklyHydration(options?: any) {
  return useQuery<any>({
    queryKey: ["/api/hydration/weekly"],
    queryFn: () => fetcher("/api/hydration/weekly"),
    ...options?.query,
  });
}

export function getGetWeeklyHydrationQueryKey() {
  return ["/api/hydration/weekly"];
}

export function useListHydration(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/hydration"],
    queryFn: () => fetcher("/api/hydration"),
    ...options?.query,
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
export function useGetTodayHabits(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/habits/today"],
    queryFn: () => fetcher("/api/habits/today"),
    ...options?.query,
  });
}

export function getGetTodayHabitsQueryKey() {
  return ["/api/habits/today"];
}

export function useListHabits(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/habits"],
    queryFn: () => fetcher("/api/habits"),
    ...options?.query,
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
export function useListNotifications(options?: any) {
  return useQuery<any[]>({
    queryKey: ["/api/notifications"],
    queryFn: () => fetcher("/api/notifications"),
    ...options?.query,
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
