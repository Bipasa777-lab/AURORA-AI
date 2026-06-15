import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Droplets, Moon, Sun, Target, UtensilsCrossed, Sparkles, Flame, BarChart3, Brain, ArrowLeft, ArrowRight, Play, Pause } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";

const features = [
  { icon: Droplets, title: "Hydration Tracking", desc: "Log water intake and hit daily goals with smart reminders.", color: "text-blue-500" },
  { icon: Moon, title: "Sleep Analytics", desc: "Track sleep quality and duration with actionable insights.", color: "text-purple-500" },
  { icon: Target, title: "Habit Building", desc: "Build and track daily habits with streak-based motivation.", color: "text-green-500" },
  { icon: UtensilsCrossed, title: "Nutrition Logging", desc: "Log meals and track macros effortlessly.", color: "text-orange-500" },
  { icon: Brain, title: "AI Voice Companion", desc: "Get personalized coaching from your AI health companion.", color: "text-primary" },
  { icon: Flame, title: "Streaks & Achievements", desc: "Stay motivated with streaks, milestones, and rewards.", color: "text-red-500" },
  { icon: BarChart3, title: "Weekly Reports", desc: "Understand your trends with beautiful weekly and monthly reports.", color: "text-indigo-500" },
  { icon: Sparkles, title: "Health Memories", desc: "Aurora remembers your health journey for smarter coaching.", color: "text-accent" },
];

const slides = [
  {
    title: "Meet your personal health companion.",
    desc: "Aurora is here to listen, understand, and coach you. Speak naturally to update your logs or get personalized support.",
    icon: Brain,
    color: "text-primary",
    bg: "from-primary/10 via-primary/5 to-transparent",
  },
  {
    title: "Track hydration, sleep, habits, and nutrition.",
    desc: "Log daily stats seamlessly. Visualize hydration with an interactive virtual bottle, record sleep metrics, and log meal nutrients.",
    icon: Droplets,
    color: "text-blue-500",
    bg: "from-blue-500/10 via-blue-500/5 to-transparent",
  },
  {
    title: "Receive personalized daily insights.",
    desc: "Aurora analyzes your logs to find behavioral patterns, warning you when you lack sleep or reminding you to balance hydration.",
    icon: Sparkles,
    color: "text-purple-500",
    bg: "from-purple-500/10 via-purple-500/5 to-transparent",
  },
  {
    title: "Build healthier routines through consistency.",
    desc: "Form lasting habits with streaks, reward badges, and active daily checklists designed to keep you motivated and structured.",
    icon: Flame,
    color: "text-orange-500",
    bg: "from-orange-500/10 via-orange-500/5 to-transparent",
  },
  {
    title: "Learn more about yourself every day.",
    desc: "Aurora builds a secure health memory system, compiling weekly and monthly reports with clarity and actionable takeaways.",
    icon: BarChart3,
    color: "text-green-500",
    bg: "from-green-500/10 via-green-500/5 to-transparent",
  },
];

export default function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }, 5000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const activeSlide = slides[currentSlide];
  const ActiveIcon = activeSlide.icon;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">Aurora</span>
          </Link>
          <div className="flex items-center gap-3">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-foreground rounded-full hover:bg-muted"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
              </Button>
            )}
            <Link href="/sign-in" asChild>
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/sign-up" asChild>
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 md:px-6 text-center max-w-4xl mx-auto flex flex-col items-center">
        {/* Intro Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-2xl md:text-3xl font-semibold text-muted-foreground mb-4 tracking-tight max-w-lg mx-auto"
        >
          Understand yourself better every day.
        </motion.div>

        {/* Interactive Premium Slideshow Deck */}
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden mb-10 relative">
          <div className={`absolute inset-0 bg-gradient-to-b ${activeSlide.bg} opacity-20 pointer-events-none transition-all duration-700`} />

          <div className="p-8 md:p-12 min-h-[320px] flex flex-col justify-between relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center space-y-6"
              >
                <div className={`w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center shadow-inner`}>
                  <ActiveIcon className={`w-8 h-8 ${activeSlide.color} animate-pulse`} />
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{activeSlide.title}</h2>
                  <p className="text-muted-foreground text-sm md:text-base leading-relaxed max-w-lg mx-auto">
                    {activeSlide.desc}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slider Controls */}
            <div className="flex items-center justify-between mt-8 border-t border-border/40 pt-6">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-9 w-9 rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>

              {/* Progress Indicators */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentSlide(idx);
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        idx === currentSlide ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </Button>
              </div>

              <Button variant="ghost" size="icon" onClick={handleNext} className="h-9 w-9 rounded-full">
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Start CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md">
          <Link href="/sign-up" asChild>
            <Button size="lg" className="w-full sm:w-auto px-8 font-semibold shadow-lg shadow-primary/20">
              Start for free →
            </Button>
          </Link>
          <Link href="/sign-in" asChild>
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8 font-semibold bg-background/50 backdrop-blur">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-24 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold mb-3">Everything you need to thrive</h2>
          <p className="text-muted-foreground text-lg">Simple, powerful, and beautifully designed.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20 px-4 md:px-6">
        <div className="max-w-2xl mx-auto bg-primary rounded-2xl p-8 md:p-12 text-center relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-foreground/10 to-transparent pointer-events-none" />
          <Sparkles className="w-10 h-10 text-primary-foreground mx-auto mb-4 opacity-80 animate-pulse" />
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3 relative z-10">
            Start your health journey today
          </h2>
          <p className="text-primary-foreground/80 mb-6 relative z-10">
            Join thousands building better health habits with Aurora.
          </p>
          <Link href="/sign-up" asChild>
            <Button size="lg" variant="secondary" className="px-8 font-semibold shadow-lg">
              Get started free →
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-4 text-center text-sm text-muted-foreground">
        © 2026 Aurora Health. All rights reserved.
      </footer>
    </div>
  );
}
