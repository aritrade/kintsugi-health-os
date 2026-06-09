import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { DemoLoginButton } from "@/components/demo-login-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/demo";
import {
  Moon,
  HeartPulse,
  ShieldQuestion,
  Flower2,
  Activity,
  Search,
  FlaskConical,
  FileText,
} from "lucide-react";

const PERSONAS = [
  {
    icon: HeartPulse,
    name: "The Founder Investigator",
    line: "Sexual-health & sleep are first-class. See libido, erections, and recovery tracked without shame - and a urologist-ready case.",
  },
  {
    icon: ShieldQuestion,
    name: "The Unexplained-Symptoms Seeker",
    line: "Reconstruct years of symptoms with the Health Historian and let the Detective surface what correlates with fatigue.",
  },
  {
    icon: Moon,
    name: "The Anxious Health Tracker",
    line: "A calm, non-alarmist read on your data. Findings come as questions to investigate - never scary verdicts.",
  },
  {
    icon: Flower2,
    name: "The Women's Health Investigator",
    line: "PCOS, fertility, and menopause packs connect cycle, labs, and symptoms - with extra protection for reproductive data.",
  },
  {
    icon: Activity,
    name: "The Longevity Optimizer",
    line: "Run rigorous N-of-1 experiments across wearables, labs, and lifestyle to prove what actually moves your numbers.",
  },
];

const FEATURES = [
  { icon: Search, label: "Health Detective finds patterns & correlations" },
  { icon: FlaskConical, label: "Experiments to test your own theories" },
  { icon: FileText, label: "Doctor-ready reports & case summaries" },
];

export default function SignupPage() {
  return (
    <main className="relative mx-auto min-h-screen max-w-5xl px-6 py-10">
      <ThemeToggle className="absolute right-4 top-4 bg-card" />

      <div className="grid items-start gap-8 md:grid-cols-2 md:gap-12">
        {/* Left: value proposition + demo */}
        <section className="space-y-6 md:py-6">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">Kintsugi Health OS</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              See it working with real, lived-in data.
            </h1>
            <p className="text-muted-foreground">
              Not sure yet? Step into a fully populated demo account - 12 weeks of check-ins, indices,
              detected correlations, experiments, reports, and a doctor-ready case - to feel exactly how
              Kintsugi turns scattered health data into understanding.
            </p>
          </div>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-3 py-5">
              <DemoLoginButton />
              <p className="text-center text-xs text-muted-foreground">
                No sign-up needed. Or log in manually with{" "}
                <span className="font-medium text-foreground">{DEMO_EMAIL}</span> /{" "}
                <span className="font-medium text-foreground">{DEMO_PASSWORD}</span>
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3 text-sm">
                <f.icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t pt-5">
            <p className="text-sm font-medium">Built for people like you</p>
            <ul className="space-y-3">
              {PERSONAS.map((p) => (
                <li key={p.name} className="flex gap-3">
                  <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.line}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Investigation, not diagnosis. Kintsugi never diagnoses, prescribes, or replaces your clinician.
          </p>
        </section>

        {/* Right: sign-up form */}
        <section className="md:sticky md:top-10">
          <Card>
            <CardHeader>
              <CardTitle>Create your account</CardTitle>
              <CardDescription>Your private health investigation space. Your data is yours.</CardDescription>
            </CardHeader>
            <CardContent>
              <AuthForm mode="signup" />
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary">
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
