import React, { createContext, useContext, useState, useEffect } from "react";
import * as ClerkReal from "@clerk/react";
import { useLocation } from "wouter";

const bypassClerk =
  import.meta.env.VITE_BYPASS_CLERK === "true" ||
  !import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY.includes("dummy");

// If not bypassing, re-export everything from real Clerk
export const ClerkProvider = (bypassClerk
  ? MockClerkProvider
  : ClerkReal.ClerkProvider) as React.ComponentType<any>;

export const useClerk = (bypassClerk
  ? useMockClerk
  : ClerkReal.useClerk) as any;

export const useUser = (bypassClerk
  ? useMockUser
  : ClerkReal.useUser) as any;

export const Show = (bypassClerk
  ? MockShow
  : ClerkReal.Show) as React.ComponentType<any>;

export const SignIn = (bypassClerk
  ? MockSignIn
  : ClerkReal.SignIn) as React.ComponentType<any>;

export const SignUp = (bypassClerk
  ? MockSignUp
  : ClerkReal.SignUp) as React.ComponentType<any>;

// Mock implementations
const MockAuthContext = createContext<{
  isSignedIn: boolean;
  setIsSignedIn: (val: boolean) => void;
}>({
  isSignedIn: false,
  setIsSignedIn: () => {},
});

function MockClerkProvider({ children, ...props }: any) {
  const [isSignedIn, setIsSignedIn] = useState(() => {
    return localStorage.getItem("mock_user_signed_in") === "true";
  });

  useEffect(() => {
    localStorage.setItem("mock_user_signed_in", isSignedIn ? "true" : "false");
  }, [isSignedIn]);

  return (
    <MockAuthContext.Provider value={{ isSignedIn, setIsSignedIn }}>
      {children}
    </MockAuthContext.Provider>
  );
}

function useMockClerk() {
  const { setIsSignedIn } = useContext(MockAuthContext);
  return {
    signOut: async () => {
      setIsSignedIn(false);
      window.location.href = "/";
    },
    addListener: () => () => {},
  };
}

function useMockUser() {
  const { isSignedIn } = useContext(MockAuthContext);
  return {
    isLoaded: true,
    isSignedIn,
    user: isSignedIn
      ? {
          firstName: "Mock",
          lastName: "User",
          fullName: "Mock User",
          emailAddresses: [{ emailAddress: "mock@example.com" }],
          imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=mockuser`,
        }
      : null,
  };
}

function MockShow({ when, children, fallback }: { when: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { isSignedIn } = useContext(MockAuthContext);
  const show = (when === "signed-in" && isSignedIn) || (when === "signed-out" && !isSignedIn);
  return show ? <>{children}</> : <>{fallback || null}</>;
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Sparkles } from "lucide-react";

function MockSignIn() {
  const { setIsSignedIn } = useContext(MockAuthContext);
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    // Save details to localStorage
    const nameFromEmail = email.split("@")[0];
    const capitalized = nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1);
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_firstname", capitalized);

    setIsSignedIn(true);
    setLocation("/dashboard");
  };

  const handleOAuth = (provider: string) => {
    localStorage.setItem("mock_user_email", `${provider.toLowerCase()}user@example.com`);
    localStorage.setItem("mock_user_firstname", provider);
    setIsSignedIn(true);
    setLocation("/dashboard");
  };

  return (
    <div className="w-[440px] max-w-full shadow-2xl border border-primary/20 bg-card/70 backdrop-blur-md rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-8 -mb-8" />

      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3 text-primary animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Welcome to Aurora</h2>
        <p className="text-sm text-muted-foreground">Sign in to your health companion dashboard</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg font-medium text-left">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="pl-10"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all duration-200">
          Sign In
        </Button>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-muted-foreground text-xs font-medium uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => handleOAuth("Google")} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.97 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.35 8.85 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.49z"/>
            <path fill="#FBBC05" d="M5.24 14.56c-.23-.69-.37-1.43-.37-2.2s.14-1.51.37-2.2L1.39 7.17C.5 8.94 0 10.91 0 13s.5 4.06 1.39 5.83l3.85-3.27z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.02.68-2.32 1.09-3.96 1.09-3.15 0-5.82-2.31-6.77-5.41L1.72 16.03C3.72 20.03 7.65 23 12 23z"/>
          </svg>
          Google
        </Button>
        <Button variant="outline" onClick={() => handleOAuth("Apple")} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.2 3.1 9.92 6.55 6.47c1.7-1.7 3.64-1.63 4.93-.84 1.15.7 1.95.66 3.1 0 1.02-.6 3.06-.92 4.45.54-2.8 3.27-2.12 8.35.78 11.53-.78 1.9-1.66 3.68-2.76 2.58zM12.03 5.48c-.22-2.76 2.05-5.16 4.67-5.48.33 2.92-2.58 5.4-4.67 5.48z"/>
          </svg>
          Apple
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Don't have an account?{" "}
        <a href="/sign-up" className="text-primary font-semibold hover:underline">Sign up</a>
      </p>
    </div>
  );
}

function MockSignUp() {
  const { setIsSignedIn } = useContext(MockAuthContext);
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Save details to localStorage
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_firstname", name);

    setIsSignedIn(true);
    setLocation("/onboarding");
  };

  const handleOAuth = (provider: string) => {
    localStorage.setItem("mock_user_email", `${provider.toLowerCase()}user@example.com`);
    localStorage.setItem("mock_user_firstname", provider);
    setIsSignedIn(true);
    setLocation("/onboarding");
  };

  return (
    <div className="w-[440px] max-w-full shadow-2xl border border-primary/20 bg-card/70 backdrop-blur-md rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-8 -mb-8" />

      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3 text-primary animate-pulse">
          <Sparkles className="w-5 h-5" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Create Account</h2>
        <p className="text-sm text-muted-foreground">Start your health journey with Aurora</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg font-medium text-left">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="pl-10"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-10"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
            />
          </div>
        </div>

        <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all duration-200">
          Sign Up
        </Button>
      </form>

      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-muted-foreground text-xs font-medium uppercase tracking-wider">Or continue with</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={() => handleOAuth("Google")} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.97 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.35 8.85 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.49z"/>
            <path fill="#FBBC05" d="M5.24 14.56c-.23-.69-.37-1.43-.37-2.2s.14-1.51.37-2.2L1.39 7.17C.5 8.94 0 10.91 0 13s.5 4.06 1.39 5.83l3.85-3.27z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.02.68-2.32 1.09-3.96 1.09-3.15 0-5.82-2.31-6.77-5.41L1.72 16.03C3.72 20.03 7.65 23 12 23z"/>
          </svg>
          Google
        </Button>
        <Button variant="outline" onClick={() => handleOAuth("Apple")} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.2 3.1 9.92 6.55 6.47c1.7-1.7 3.64-1.63 4.93-.84 1.15.7 1.95.66 3.1 0 1.02-.6 3.06-.92 4.45.54-2.8 3.27-2.12 8.35.78 11.53-.78 1.9-1.66 3.68-2.76 2.58zM12.03 5.48c-.22-2.76 2.05-5.16 4.67-5.48.33 2.92-2.58 5.4-4.67 5.48z"/>
          </svg>
          Apple
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <a href="/sign-in" className="text-primary font-semibold hover:underline">Sign in</a>
      </p>
    </div>
  );
}
