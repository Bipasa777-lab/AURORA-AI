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
      localStorage.setItem("mock_user_signed_in", "false");
      localStorage.removeItem("mock_user_email");
      localStorage.removeItem("mock_user_firstname");
      setIsSignedIn(false);
      window.location.href = "/";
    },
    addListener: () => () => {},
  };
}

function useMockUser() {
  const { isSignedIn } = useContext(MockAuthContext);
  const email = localStorage.getItem("mock_user_email") || "mock@example.com";
  const firstName = localStorage.getItem("mock_user_firstname") || "Mock";
  return {
    isLoaded: true,
    isSignedIn,
    user: isSignedIn
      ? {
          firstName: firstName,
          lastName: "User",
          fullName: `${firstName} User`,
          emailAddresses: [{ emailAddress: email }],
          imageUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName}`,
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
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowLeft, KeyRound } from "lucide-react";

// Mock User Database Helpers
interface MockUserRecord {
  email: string;
  name: string;
  password: string;
}

const getMockUsers = (): MockUserRecord[] => {
  const data = localStorage.getItem("mock_users_list");
  if (!data) {
    const defaultUser = [{ email: "mock@example.com", name: "Mock User", password: "password123" }];
    localStorage.setItem("mock_users_list", JSON.stringify(defaultUser));
    return defaultUser;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

const saveMockUser = (user: MockUserRecord) => {
  const users = getMockUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem("mock_users_list", JSON.stringify(users));
};

const MOCK_GOOGLE_ACCOUNTS = [
  { name: "Alex Mercer", email: "alex.mercer@gmail.com" },
  { name: "Jane Doe", email: "jane.doe@gmail.com" }
];

const MOCK_APPLE_ACCOUNTS = [
  { name: "Alex Mercer", email: "alex.mercer@icloud.com" },
  { name: "Jane Doe", email: "jane.doe@icloud.com" }
];

function MockSignIn() {
  const { setIsSignedIn } = useContext(MockAuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Forgotten Password States
  const [mode, setMode] = useState<"signin" | "forgot" | "reset">("signin");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // OAuth States
  const [activeOAuth, setActiveOAuth] = useState<"Google" | "Apple" | null>(null);
  const [oauthStep, setOauthStep] = useState<"select" | "custom">("select");
  const [customOauthEmail, setCustomOauthEmail] = useState("");
  const [customOauthName, setCustomOauthName] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    const users = getMockUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!found) {
      setError("Account not found. Please sign up first.");
      return;
    }

    if (found.password !== password) {
      setError("Incorrect password. Please try again.");
      return;
    }
    
    localStorage.setItem("mock_user_signed_in", "true");
    localStorage.setItem("mock_user_email", found.email);
    localStorage.setItem("mock_user_firstname", found.name.split(" ")[0]);
    setIsSignedIn(true);
    window.location.href = "/dashboard";
  };

  const handleSendResetCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetEmail) {
      setError("Please enter your email.");
      return;
    }
    if (!resetEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    const users = getMockUsers();
    const found = users.find(u => u.email.toLowerCase() === resetEmail.toLowerCase());
    if (!found) {
      setError("No account found with this email address.");
      return;
    }

    // Generate a 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setSentCode(code);
    setMode("reset");
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (resetCode !== sentCode) {
      setError("Invalid verification code. Please check the code displayed in the green box.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const users = getMockUsers();
    const userIndex = users.findIndex(u => u.email.toLowerCase() === resetEmail.toLowerCase());
    if (userIndex >= 0) {
      users[userIndex].password = newPassword;
      localStorage.setItem("mock_users_list", JSON.stringify(users));
      setSuccess("Password reset successfully! You can now sign in.");
      setMode("signin");
      setEmail(resetEmail);
      setPassword("");
    } else {
      setError("An error occurred. Please try again.");
    }
  };

  const handleSelectOAuth = (email: string, name: string) => {
    const users = getMockUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!existing) {
      saveMockUser({
        email,
        name,
        password: "oauth_bypass_password"
      });
    }
    localStorage.setItem("mock_user_signed_in", "true");
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_firstname", name.split(" ")[0]);
    setIsSignedIn(true);
    window.location.href = "/dashboard";
  };

  if (mode === "forgot") {
    return (
      <div className="w-[440px] max-w-full shadow-2xl border border-primary/20 bg-card/70 backdrop-blur-md rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-8 -mb-8" />

        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3 text-primary">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Reset Password</h2>
          <p className="text-sm text-muted-foreground">Enter your email to receive a recovery code</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg font-medium text-left">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSendResetCode} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder="name@example.com"
                className="pl-10"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setError(""); }}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all duration-200">
            Send Reset Code
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setMode("signin"); setError(""); }}
          className="flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="w-[440px] max-w-full shadow-2xl border border-primary/20 bg-card/70 backdrop-blur-md rounded-2xl p-8 flex flex-col gap-6 relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-8 -mt-8" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -ml-8 -mb-8" />

        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3 text-primary">
            <KeyRound className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">Enter Recovery Code</h2>
          <p className="text-sm text-muted-foreground">Create your new secure password</p>
        </div>

        {/* Mock Code Alert Display */}
        <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 text-xs p-3.5 rounded-xl text-center font-semibold animate-pulse">
          🔑 Mock Code Generated: <span className="text-sm font-bold tracking-widest text-emerald-700 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded ml-1">{sentCode}</span>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-lg font-medium text-left">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="reset-code">Verification Code</Label>
            <Input
              id="reset-code"
              type="text"
              maxLength={6}
              placeholder="123456"
              className="text-center tracking-widest font-mono text-lg"
              value={resetCode}
              onChange={(e) => { setResetCode(e.target.value); setError(""); }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-medium shadow-sm transition-all duration-200">
            Reset Password
          </Button>
        </form>

        <button
          type="button"
          onClick={() => { setMode("signin"); setError(""); }}
          className="flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </button>
      </div>
    );
  }

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

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs p-3 rounded-lg font-medium text-left">
          ✅ {success}
        </div>
      )}

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
              onChange={(e) => { setEmail(e.target.value); setError(""); setSuccess(""); }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <button
              type="button"
              onClick={() => { setMode("forgot"); setError(""); setSuccess(""); }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); setSuccess(""); }}
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
        <Button variant="outline" onClick={() => { setActiveOAuth("Google"); setOauthStep("select"); }} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.97 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.35 8.85 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.49z"/>
            <path fill="#FBBC05" d="M5.24 14.56c-.23-.69-.37-1.43-.37-2.2s.14-1.51.37-2.2L1.39 7.17C.5 8.94 0 10.91 0 13s.5 4.06 1.39 5.83l3.85-3.27z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.02.68-2.32 1.09-3.96 1.09-3.15 0-5.82-2.31-6.77-5.41L1.72 16.03C3.72 20.03 7.65 23 12 23z"/>
          </svg>
          Google
        </Button>
        <Button variant="outline" onClick={() => { setActiveOAuth("Apple"); setOauthStep("select"); }} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.2 3.1 9.92 6.55 6.47c1.7-1.7 3.64-1.63 4.93-.84 1.15.7 1.95.66 3.1 0 1.02-.6 3.06-.92 4.45.54-2.8 3.27-2.12 8.35.78 11.53-.78 1.9-1.66 3.68-2.76 2.58zM12.03 5.48c-.22-2.76 2.05-5.16 4.67-5.48.33 2.92-2.58 5.4-4.67 5.48z"/>
          </svg>
          Apple
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={() => window.location.href = "/sign-up"}
          className="text-primary font-semibold hover:underline"
        >
          Sign up
        </button>
      </p>

      {/* Mock OAuth Popup/Overlay */}
      {activeOAuth && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-5 flex-grow overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-1">
                {activeOAuth === "Google" ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.97 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.35 8.85 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.49z"/>
                    <path fill="#FBBC05" d="M5.24 14.56c-.23-.69-.37-1.43-.37-2.2s.14-1.51.37-2.2L1.39 7.17C.5 8.94 0 10.91 0 13s.5 4.06 1.39 5.83l3.85-3.27z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.02.68-2.32 1.09-3.96 1.09-3.15 0-5.82-2.31-6.77-5.41L1.72 16.03C3.72 20.03 7.65 23 12 23z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current text-foreground" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.2 3.1 9.92 6.55 6.47c1.7-1.7 3.64-1.63 4.93-.84 1.15.7 1.95.66 3.1 0 1.02-.6 3.06-.92 4.45.54-2.8 3.27-2.12 8.35.78 11.53-.78 1.9-1.66 3.68-2.76 2.58zM12.03 5.48c-.22-2.76 2.05-5.16 4.67-5.48.33 2.92-2.58 5.4-4.67 5.48z"/>
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold tracking-tight">
                {activeOAuth === "Google" ? "Sign in with Google" : "Sign in with Apple"}
              </h3>
              <p className="text-xs text-muted-foreground">
                to continue to <span className="font-semibold text-primary">Aurora Health</span>
              </p>
            </div>

            {oauthStep === "select" ? (
              <div className="space-y-2.5 flex-grow flex flex-col justify-center">
                <p className="text-xs font-semibold text-muted-foreground text-left px-1">Choose a mock account:</p>
                <div className="space-y-2">
                  {(activeOAuth === "Google" ? MOCK_GOOGLE_ACCOUNTS : MOCK_APPLE_ACCOUNTS).map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectOAuth(acc.email, acc.name)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/80 hover:bg-muted/50 hover:border-primary/40 text-left transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                        {acc.name[0]}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">{acc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setOauthStep("custom");
                      setCustomOauthEmail("");
                      setCustomOauthName("");
                    }}
                    className="w-full flex items-center justify-center p-3 rounded-xl border border-dashed border-border hover:bg-muted/30 hover:border-primary/40 transition-all duration-200 text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    Use another account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-grow flex flex-col justify-center">
                <div className="space-y-3 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-custom-email">Email Address</Label>
                    <Input
                      id="oauth-custom-email"
                      type="email"
                      placeholder={activeOAuth === "Google" ? "you@gmail.com" : "you@icloud.com"}
                      value={customOauthEmail}
                      onChange={(e) => setCustomOauthEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-custom-name">Full Name</Label>
                    <Input
                      id="oauth-custom-name"
                      type="text"
                      placeholder="Jane Doe"
                      value={customOauthName}
                      onChange={(e) => setCustomOauthName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!customOauthEmail || !customOauthEmail.includes("@")) {
                        alert("Please enter a valid email address.");
                        return;
                      }
                      if (!customOauthName) {
                        alert("Please enter your name.");
                        return;
                      }
                      handleSelectOAuth(customOauthEmail, customOauthName);
                    }}
                    className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm transition-all duration-200 mt-2"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 pt-4 flex gap-2">
            {oauthStep === "custom" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOauthStep("select")}
                className="flex-1 text-xs"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveOAuth(null);
                setOauthStep("select");
              }}
              className="flex-1 text-xs hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MockSignUp() {
  const { setIsSignedIn } = useContext(MockAuthContext);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // OAuth States
  const [activeOAuth, setActiveOAuth] = useState<"Google" | "Apple" | null>(null);
  const [oauthStep, setOauthStep] = useState<"select" | "custom">("select");
  const [customOauthEmail, setCustomOauthEmail] = useState("");
  const [customOauthName, setCustomOauthName] = useState("");

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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

    const users = getMockUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setError("An account with this email already exists.");
      return;
    }

    // Save user to mock database
    saveMockUser({ email, name, password });

    localStorage.setItem("mock_user_signed_in", "true");
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_firstname", name.split(" ")[0]);

    setIsSignedIn(true);
    window.location.href = "/onboarding";
  };

  const handleSelectOAuth = (email: string, name: string) => {
    const users = getMockUsers();
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!existing) {
      saveMockUser({
        email,
        name,
        password: "oauth_bypass_password"
      });
    }
    localStorage.setItem("mock_user_signed_in", "true");
    localStorage.setItem("mock_user_email", email);
    localStorage.setItem("mock_user_firstname", name.split(" ")[0]);
    setIsSignedIn(true);
    window.location.href = "/onboarding";
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
        <Button variant="outline" onClick={() => { setActiveOAuth("Google"); setOauthStep("select"); }} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.97 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.35 8.85 5.04 12 5.04z"/>
            <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.49z"/>
            <path fill="#FBBC05" d="M5.24 14.56c-.23-.69-.37-1.43-.37-2.2s.14-1.51.37-2.2L1.39 7.17C.5 8.94 0 10.91 0 13s.5 4.06 1.39 5.83l3.85-3.27z"/>
            <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.02.68-2.32 1.09-3.96 1.09-3.15 0-5.82-2.31-6.77-5.41L1.72 16.03C3.72 20.03 7.65 23 12 23z"/>
          </svg>
          Google
        </Button>
        <Button variant="outline" onClick={() => { setActiveOAuth("Apple"); setOauthStep("select"); }} className="gap-2 font-medium hover:bg-muted/50 border-border/80">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.2 3.1 9.92 6.55 6.47c1.7-1.7 3.64-1.63 4.93-.84 1.15.7 1.95.66 3.1 0 1.02-.6 3.06-.92 4.45.54-2.8 3.27-2.12 8.35.78 11.53-.78 1.9-1.66 3.68-2.76 2.58zM12.03 5.48c-.22-2.76 2.05-5.16 4.67-5.48.33 2.92-2.58 5.4-4.67 5.48z"/>
          </svg>
          Apple
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => window.location.href = "/sign-in"}
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </button>
      </p>

      {/* Mock OAuth Popup/Overlay */}
      {activeOAuth && (
        <div className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col gap-5 flex-grow overflow-y-auto">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-1">
                {activeOAuth === "Google" ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.61 14.97 1 12 1 7.35 1 3.39 3.67 1.39 7.56l3.85 2.99C6.18 7.35 8.85 5.04 12 5.04z"/>
                    <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.45h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.98 3.39-4.89 3.39-8.49z"/>
                    <path fill="#FBBC05" d="M5.24 14.56c-.23-.69-.37-1.43-.37-2.2s.14-1.51.37-2.2L1.39 7.17C.5 8.94 0 10.91 0 13s.5 4.06 1.39 5.83l3.85-3.27z"/>
                    <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.02.68-2.32 1.09-3.96 1.09-3.15 0-5.82-2.31-6.77-5.41L1.72 16.03C3.72 20.03 7.65 23 12 23z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current text-foreground" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C3.79 16.2 3.1 9.92 6.55 6.47c1.7-1.7 3.64-1.63 4.93-.84 1.15.7 1.95.66 3.1 0 1.02-.6 3.06-.92 4.45.54-2.8 3.27-2.12 8.35.78 11.53-.78 1.9-1.66 3.68-2.76 2.58zM12.03 5.48c-.22-2.76 2.05-5.16 4.67-5.48.33 2.92-2.58 5.4-4.67 5.48z"/>
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold tracking-tight">
                {activeOAuth === "Google" ? "Sign in with Google" : "Sign in with Apple"}
              </h3>
              <p className="text-xs text-muted-foreground">
                to continue to <span className="font-semibold text-primary">Aurora Health</span>
              </p>
            </div>

            {oauthStep === "select" ? (
              <div className="space-y-2.5 flex-grow flex flex-col justify-center">
                <p className="text-xs font-semibold text-muted-foreground text-left px-1">Choose a mock account:</p>
                <div className="space-y-2">
                  {(activeOAuth === "Google" ? MOCK_GOOGLE_ACCOUNTS : MOCK_APPLE_ACCOUNTS).map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectOAuth(acc.email, acc.name)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/80 hover:bg-muted/50 hover:border-primary/40 text-left transition-all duration-200 group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                        {acc.name[0]}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-semibold truncate text-foreground">{acc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setOauthStep("custom");
                      setCustomOauthEmail("");
                      setCustomOauthName("");
                    }}
                    className="w-full flex items-center justify-center p-3 rounded-xl border border-dashed border-border hover:bg-muted/30 hover:border-primary/40 transition-all duration-200 text-sm font-medium text-muted-foreground hover:text-primary"
                  >
                    Use another account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 flex-grow flex flex-col justify-center">
                <div className="space-y-3 text-left">
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-custom-email">Email Address</Label>
                    <Input
                      id="oauth-custom-email"
                      type="email"
                      placeholder={activeOAuth === "Google" ? "you@gmail.com" : "you@icloud.com"}
                      value={customOauthEmail}
                      onChange={(e) => setCustomOauthEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oauth-custom-name">Full Name</Label>
                    <Input
                      id="oauth-custom-name"
                      type="text"
                      placeholder="Jane Doe"
                      value={customOauthName}
                      onChange={(e) => setCustomOauthName(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!customOauthEmail || !customOauthEmail.includes("@")) {
                        alert("Please enter a valid email address.");
                        return;
                      }
                      if (!customOauthName) {
                        alert("Please enter your name.");
                        return;
                      }
                      handleSelectOAuth(customOauthEmail, customOauthName);
                    }}
                    className="w-full h-10 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-sm transition-all duration-200 mt-2"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/40 pt-4 flex gap-2">
            {oauthStep === "custom" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOauthStep("select")}
                className="flex-1 text-xs"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setActiveOAuth(null);
                setOauthStep("select");
              }}
              className="flex-1 text-xs hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
