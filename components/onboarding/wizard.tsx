"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BiologicalSex, PrivacyMode } from "@/types";

type Step = "welcome" | "consent" | "privacy" | "profile";

const STEPS: Step[] = ["welcome", "consent", "privacy", "profile"];

const SEX_OPTIONS: { value: BiologicalSex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const PRIVACY_OPTIONS: { value: PrivacyMode; title: string; desc: string }[] = [
  { value: "standard", title: "Standard", desc: "Encrypted in the cloud, synced across devices." },
  {
    value: "extra_protected",
    title: "Extra protected",
    desc: "Sensitive data requires an extra unlock before it is shown.",
  },
  {
    value: "local_only",
    title: "Local only",
    desc: "Sensitive data never leaves this device.",
  },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [consent, setConsent] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("standard");
  const [displayName, setDisplayName] = useState("");
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function finish() {
    if (!biologicalSex) {
      setError("Please select a biological sex (used to tailor metrics).");
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: displayName || undefined,
        biologicalSex,
        dateOfBirth: dateOfBirth || undefined,
        privacyMode,
        consent: true,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error?.message ?? "Something went wrong.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="mb-3 flex gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i <= stepIndex ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
        {step === "welcome" && (
          <>
            <CardTitle>Welcome to Kintsugi</CardTitle>
            <CardDescription>
              A private space to investigate your own health. We help you observe, organize, and
              prepare - we never diagnose or prescribe.
            </CardDescription>
          </>
        )}
        {step === "consent" && (
          <>
            <CardTitle>How Kintsugi works</CardTitle>
            <CardDescription>Please read and agree before continuing.</CardDescription>
          </>
        )}
        {step === "privacy" && (
          <>
            <CardTitle>Choose your privacy mode</CardTitle>
            <CardDescription>You can change this later in your profile.</CardDescription>
          </>
        )}
        {step === "profile" && (
          <>
            <CardTitle>A little about you</CardTitle>
            <CardDescription>
              This tailors which metrics and Investigation Packs are relevant.
            </CardDescription>
          </>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {step === "welcome" && (
          <Button size="lg" className="w-full" onClick={next}>
            Begin
          </Button>
        )}

        {step === "consent" && (
          <>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>- Kintsugi is not a medical device and does not provide diagnoses.</li>
              <li>- Insights are observations to discuss with a healthcare professional.</li>
              <li>- Your data belongs to you; you can export or delete it anytime.</li>
              <li>- In an emergency, contact local emergency services.</li>
            </ul>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I understand Kintsugi supports investigation, not diagnosis, and does not replace
                my doctor.
              </span>
            </label>
            <div className="flex gap-3">
              <Button variant="outline" onClick={back} className="flex-1">
                Back
              </Button>
              <Button onClick={next} className="flex-1" disabled={!consent}>
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "privacy" && (
          <>
            <div className="space-y-3">
              {PRIVACY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPrivacyMode(opt.value)}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-colors",
                    privacyMode === opt.value ? "border-primary bg-muted" : "border-input",
                  )}
                >
                  <div className="font-medium">{opt.title}</div>
                  <div className="text-sm text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={back} className="flex-1">
                Back
              </Button>
              <Button onClick={next} className="flex-1">
                Continue
              </Button>
            </div>
          </>
        )}

        {step === "profile" && (
          <>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Preferred name (optional)
              </label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Biological sex</span>
              <div className="grid grid-cols-2 gap-2">
                {SEX_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBiologicalSex(opt.value)}
                    className={cn(
                      "rounded-md border p-3 text-sm transition-colors",
                      biologicalSex === opt.value ? "border-primary bg-muted" : "border-input",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Used only to show physiologically relevant metrics. You control gender identity
                separately.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="dob" className="text-sm font-medium">
                Date of birth (optional)
              </label>
              <Input
                id="dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" onClick={back} className="flex-1">
                Back
              </Button>
              <Button onClick={finish} className="flex-1" disabled={submitting}>
                {submitting ? "Setting up..." : "Finish"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
