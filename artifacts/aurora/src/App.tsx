import { useEffect } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@/lib/clerk";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import HydrationPage from "@/pages/hydration";
import SleepPage from "@/pages/sleep";
import HabitsPage from "@/pages/habits";
import NutritionPage from "@/pages/nutrition";
import AuroraAIPage from "@/pages/aurora-ai";
import StreaksPage from "@/pages/streaks";
import ReportsPage from "@/pages/reports";
import OnboardingPage from "@/pages/onboarding";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";

const isBypass =
  import.meta.env.VITE_BYPASS_CLERK === "true" ||
  !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY.includes("dummy");

const clerkPubKey = isBypass
  ? "pk_test_mock"
  : publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    );
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: shadcn,
  options: {
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(170, 72%, 38%)",
    colorForeground: "hsl(222, 25%, 12%)",
    colorMutedForeground: "hsl(220, 12%, 50%)",
    colorBackground: "hsl(220, 20%, 98%)",
    colorInput: "hsl(220, 14%, 88%)",
    colorInputForeground: "hsl(222, 25%, 12%)",
    colorNeutral: "hsl(222, 25%, 12%)",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    cardBox: "w-[440px] max-w-full shadow-xl border border-border bg-card",
    formButtonPrimary: "bg-primary text-primary-foreground hover:opacity-90",
    footerActionLink: "text-primary hover:text-primary/80",
  },
};

function QueryInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  useEffect(() => {
    return addListener(({ session }: any) => {
      if (!session) qc.clear();
    });
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isSignedIn } = useUser();
  const { data: profile, isLoading } = useGetProfile({
    query: {
      enabled: !!isSignedIn,
      queryKey: getGetProfileQueryKey(),
    },
  });
  const [location] = useLocation();

  if (!isSignedIn) {
    return <Redirect to="/" />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (profile && !profile.onboardingCompleted && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={() => (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </div>
      )} />
      <Route path="/sign-up/*?" component={() => (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </div>
      )} />
      <Route path="/onboarding" component={() => <ProtectedRoute component={OnboardingPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/hydration" component={() => <ProtectedRoute component={HydrationPage} />} />
      <Route path="/sleep" component={() => <ProtectedRoute component={SleepPage} />} />
      <Route path="/habits" component={() => <ProtectedRoute component={HabitsPage} />} />
      <Route path="/nutrition" component={() => <ProtectedRoute component={NutritionPage} />} />
      <Route path="/ai" component={() => <ProtectedRoute component={AuroraAIPage} />} />
      <Route path="/streaks" component={() => <ProtectedRoute component={StreaksPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "next-themes";

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to: string) => {
        window.history.pushState({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
      routerReplace={(to: string) => {
        window.history.replaceState({}, "", to);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }}
      appearance={clerkAppearance}
      afterSignOutUrl={basePath || "/"}
    >
      <QueryClientProvider client={queryClient}>
        <QueryInvalidator />
        <TooltipProvider>
          <WouterRouter base={basePath}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
      </ClerkProvider>
    </ThemeProvider>
  );
}

export default App;
