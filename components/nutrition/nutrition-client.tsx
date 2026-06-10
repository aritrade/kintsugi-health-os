"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Apple,
  BookOpen,
  CalendarDays,
  ClipboardList,
  History as HistoryIcon,
  LineChart,
  MessageCircle,
  Save,
  Search,
  Utensils,
} from "lucide-react";
import type {
  AssessmentResult,
  DietType,
  EvidenceSource,
  FoodRecommendation,
  MealPlan,
  NutritionProfile,
  OutcomeResult,
} from "@/types/nutrition";
import { RecommendationCard } from "@/components/nutrition/recommendation-card";

interface MedRow {
  id?: string;
  name: string;
  drug_class: string | null;
}

const LAB_FIELDS: { slug: string; label: string; unit: string }[] = [
  { slug: "vitamin_d", label: "Vitamin D", unit: "ng/mL" },
  { slug: "ferritin", label: "Ferritin", unit: "ng/mL" },
  { slug: "vitamin_b12", label: "Vitamin B12", unit: "pg/mL" },
  { slug: "folate", label: "Folate", unit: "ng/mL" },
  { slug: "calcium", label: "Calcium", unit: "mg/dL" },
  { slug: "magnesium", label: "Magnesium", unit: "mg/dL" },
  { slug: "potassium", label: "Potassium", unit: "mmol/L" },
];

const TABS = [
  { id: "assess", label: "Assessment", icon: ClipboardList },
  { id: "gaps", label: "Nutrient Gaps", icon: Search },
  { id: "recommend", label: "Recommendations", icon: Apple },
  { id: "mealplan", label: "Meal Plan", icon: Utensils },
  { id: "progress", label: "Progress", icon: LineChart },
  { id: "evidence", label: "Evidence", icon: BookOpen },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "copilot", label: "Copilot", icon: MessageCircle },
] as const;

type TabId = (typeof TABS)[number]["id"];

const splitCsv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const joinCsv = (xs: string[]) => xs.join(", ");

export function NutritionClient({
  initialProfile,
  initialMedications,
}: {
  initialProfile: NutritionProfile;
  initialMedications: MedRow[];
}) {
  const [tab, setTab] = useState<TabId>("assess");

  // Profile form state.
  const [dietType, setDietType] = useState<DietType>(initialProfile.dietType);
  const [region, setRegion] = useState(initialProfile.region ?? "");
  const [allergies, setAllergies] = useState(joinCsv(initialProfile.allergies));
  const [conditions, setConditions] = useState(joinCsv(initialProfile.conditions));
  const [goals, setGoals] = useState(joinCsv(initialProfile.goals));
  const [disliked, setDisliked] = useState(joinCsv(initialProfile.dislikedFoods));
  const [culturalPrefs, setCulturalPrefs] = useState(joinCsv(initialProfile.culturalPrefs));
  const [meds, setMeds] = useState(joinCsv(initialMedications.map((m) => m.name)));

  // Intake state.
  const [symptoms, setSymptoms] = useState("");
  const [labs, setLabs] = useState<Record<string, string>>({});

  // Results.
  const [assessment, setAssessment] = useState<(AssessmentResult & { assessmentId?: string }) | null>(null);
  const [recommendations, setRecommendations] = useState<FoodRecommendation[] | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeResult | null>(null);
  const [evidence, setEvidence] = useState<EvidenceSource[] | null>(null);
  const [history, setHistory] = useState<Record<string, unknown[]> | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  async function call<T>(url: string, body?: unknown, method = "POST"): Promise<T | null> {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j?.error?.message ?? "Something went wrong.");
      return null;
    }
    return j.data as T;
  }

  async function saveProfile() {
    setBusy("save");
    setError(null);
    setSavedNote(null);
    const data = await call("/api/v1/nutrition/profile", {
      dietType,
      region: region || null,
      allergies: splitCsv(allergies),
      conditions: splitCsv(conditions),
      goals: splitCsv(goals),
      dislikedFoods: splitCsv(disliked),
      culturalPrefs: splitCsv(culturalPrefs),
      medications: splitCsv(meds).map((name) => ({ name })),
    }, "PUT");
    if (data) setSavedNote("Profile saved.");
    setBusy(null);
  }

  async function analyze() {
    setBusy("analyze");
    setError(null);
    const labNums: Record<string, number> = {};
    for (const [k, v] of Object.entries(labs)) {
      const n = Number(v);
      if (v !== "" && !Number.isNaN(n)) labNums[k] = n;
    }
    const data = await call<AssessmentResult & { assessmentId?: string }>("/api/v1/nutrition/analyze", {
      symptoms: splitCsv(symptoms),
      conditions: splitCsv(conditions),
      goals: splitCsv(goals),
      labs: labNums,
    });
    if (data) {
      setAssessment(data);
      setRecommendations(null);
      setMealPlan(null);
      setOutcomes(null);
      setTab("gaps");
    }
    setBusy(null);
  }

  async function recommend() {
    if (!assessment?.assessmentId) return;
    setBusy("recommend");
    setError(null);
    const data = await call<{ recommendations: FoodRecommendation[] }>("/api/v1/nutrition/recommend", {
      assessmentId: assessment.assessmentId,
    });
    if (data) {
      setRecommendations(data.recommendations);
      setTab("recommend");
    }
    setBusy(null);
  }

  async function makeMealPlan() {
    if (!assessment?.assessmentId) return;
    setBusy("mealplan");
    setError(null);
    const data = await call<MealPlan>("/api/v1/nutrition/mealplan", { assessmentId: assessment.assessmentId });
    if (data) {
      setMealPlan(data);
      setTab("mealplan");
    }
    setBusy(null);
  }

  async function track() {
    if (!assessment?.assessmentId) return;
    setBusy("track");
    setError(null);
    const data = await call<OutcomeResult>("/api/v1/nutrition/track", { assessmentId: assessment.assessmentId });
    if (data) setOutcomes(data);
    setBusy(null);
  }

  async function loadEvidence() {
    if (evidence) return;
    const data = await call<{ sources: EvidenceSource[] }>("/api/v1/nutrition/evidence", undefined, "GET");
    if (data) setEvidence(data.sources);
  }

  async function loadHistory() {
    const data = await call<Record<string, unknown[]>>("/api/v1/nutrition/history", undefined, "GET");
    if (data) setHistory(data);
  }

  function openTab(id: TabId) {
    setTab(id);
    setError(null);
    if (id === "evidence") void loadEvidence();
    if (id === "history") void loadHistory();
  }

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Apple className="h-6 w-6 text-primary" /> Nutrition Intelligence
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          A deterministic, evidence-first engine. It reasons over your symptoms, labs, and goals using a curated
          knowledge graph - and shows you exactly why behind every suggestion. This is education, not medical or
          dietary prescription.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2 border-b pb-3">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => openTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40">{error}</p>}

      {tab === "assess" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your nutrition profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Diet type</label>
                <select
                  value={dietType}
                  onChange={(e) => setDietType(e.target.value as DietType)}
                  className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="omnivore">Omnivore</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="pescatarian">Pescatarian</option>
                </select>
              </div>
              <Field label="Region (e.g. West Bengal)" value={region} onChange={setRegion} placeholder="West Bengal" />
              <Field label="Cultural preferences" value={culturalPrefs} onChange={setCulturalPrefs} placeholder="bengali, indian" />
              <Field label="Allergies" value={allergies} onChange={setAllergies} placeholder="dairy, tree_nut" />
              <Field label="Conditions" value={conditions} onChange={setConditions} placeholder="ckd, diabetes" />
              <Field label="Medications" value={meds} onChange={setMeds} placeholder="warfarin, levothyroxine" />
              <Field label="Disliked foods" value={disliked} onChange={setDisliked} placeholder="paneer" />
              <Field label="Goals" value={goals} onChange={setGoals} placeholder="improve bone health, more energy" />
              <div className="flex items-center gap-3">
                <Button onClick={saveProfile} disabled={busy === "save"} variant="outline">
                  <Save className="h-4 w-4" /> {busy === "save" ? "Saving..." : "Save profile"}
                </Button>
                {savedNote && <span className="text-sm text-emerald-600">{savedNote}</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">What&rsquo;s going on right now?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field
                label="Symptoms"
                value={symptoms}
                onChange={setSymptoms}
                placeholder="fatigue, muscle cramps, hair loss"
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Recent lab values (optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {LAB_FIELDS.map((f) => (
                    <div key={f.slug}>
                      <label className="text-xs text-muted-foreground">
                        {f.label} ({f.unit})
                      </label>
                      <Input
                        inputMode="decimal"
                        value={labs[f.slug] ?? ""}
                        onChange={(e) => setLabs((prev) => ({ ...prev, [f.slug]: e.target.value }))}
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={analyze} disabled={busy === "analyze"}>
                <Activity className="h-4 w-4" /> {busy === "analyze" ? "Analyzing..." : "Run assessment"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Stored labs are merged automatically. Nothing here is a diagnosis.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "gaps" && (
        <section className="space-y-4">
          {!assessment ? (
            <Empty text="Run an assessment to see suspected nutrient factors." />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button onClick={recommend} disabled={busy === "recommend"}>
                  <Apple className="h-4 w-4" /> {busy === "recommend" ? "Finding foods..." : "Get food recommendations"}
                </Button>
                <Button variant="outline" onClick={makeMealPlan} disabled={busy === "mealplan"}>
                  <Utensils className="h-4 w-4" /> Build meal plan
                </Button>
              </div>
              {assessment.suspectedFactors.length === 0 ? (
                <Empty text="No specific nutrient gaps stood out from what you shared." />
              ) : (
                <div className="space-y-3">
                  {assessment.suspectedFactors.map((f) => (
                    <Card key={f.nutrientSlug}>
                      <CardContent className="space-y-2 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{f.factor}</p>
                          <span className="text-xs text-muted-foreground">{Math.round(f.confidence * 100)}% confidence</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.round(f.confidence * 100)}%` }}
                          />
                        </div>
                        <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                          {f.reasoning.map((r, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="rounded bg-muted px-1.5 text-[10px] uppercase tracking-wide">{r.source}</span>
                              <span>{r.detail}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {assessment.disclaimers.map((d, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {d}
                </p>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "recommend" && (
        <section className="space-y-3">
          {!recommendations ? (
            <Empty text="Generate recommendations from your nutrient gaps." />
          ) : recommendations.length === 0 ? (
            <Empty text="No foods matched your filters. Try widening your diet or preferences." />
          ) : (
            recommendations.map((r, i) => <RecommendationCard key={`${r.nutrientSlug}:${r.foodSlug}:${i}`} rec={r} />)
          )}
        </section>
      )}

      {tab === "mealplan" && (
        <section className="space-y-4">
          {!mealPlan ? (
            <Empty text="Build a meal plan from your assessment." />
          ) : (
            <>
              {(["breakfast", "lunch", "dinner", "snacks"] as const).map((slot) => (
                <Card key={slot}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base capitalize">
                      <CalendarDays className="h-4 w-4 text-primary" /> {slot}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {mealPlan[slot].length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items.</p>
                    ) : (
                      <ul className="space-y-2">
                        {mealPlan[slot].map((item) => (
                          <li key={item.foodSlug} className="text-sm">
                            <span className="font-medium">{item.foodName}</span>
                            {item.servingDesc ? <span className="text-muted-foreground"> · {item.servingDesc}</span> : null}
                            <span className="block text-xs text-muted-foreground">
                              Provides {item.providesNutrients.join(", ")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              ))}
              <p className="text-sm text-muted-foreground">{mealPlan.hydration}</p>
              {mealPlan.notes.map((n, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  {n}
                </p>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "progress" && (
        <section className="space-y-4">
          <Button onClick={track} disabled={busy === "track" || !assessment?.assessmentId}>
            <LineChart className="h-4 w-4" /> {busy === "track" ? "Checking..." : "Check my progress"}
          </Button>
          {!assessment?.assessmentId && <Empty text="Run an assessment first to track outcomes." />}
          {outcomes && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {outcomes.deltas.map((d) => (
                  <Card key={d.metric}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{d.label}</p>
                        <span
                          className={`text-xs font-semibold ${
                            d.improved === true
                              ? "text-emerald-600"
                              : d.improved === false
                                ? "text-amber-600"
                                : "text-muted-foreground"
                          }`}
                        >
                          {d.delta == null ? "—" : `${d.delta > 0 ? "+" : ""}${d.delta}`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {d.baseline ?? "—"} → {d.followUp ?? "—"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {outcomes.narrative.map((n, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {n}
                </p>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "evidence" && (
        <section className="space-y-3">
          {!evidence ? (
            <Empty text="Loading the evidence catalog..." />
          ) : (
            evidence.map((s) => (
              <Card key={s.slug}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm">{s.citation}</p>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {s.sourceType.replace(/_/g, " ")} · {s.grade}
                    </span>
                  </div>
                  {s.note && <p className="mt-1 text-xs text-muted-foreground">{s.note}</p>}
                </CardContent>
              </Card>
            ))
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="space-y-4">
          {!history ? (
            <Empty text="Loading your nutrition history..." />
          ) : (
            <HistoryView history={history} />
          )}
        </section>
      )}

      {tab === "copilot" && <CopilotChat />}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function HistoryView({ history }: { history: Record<string, unknown[]> }) {
  const assessments = (history.assessments ?? []) as { id: string; created_at: string; suspected_factors: { factor: string }[] }[];
  const outcomes = (history.outcomes ?? []) as { id: string; metric: string; baseline: number | null; follow_up: number | null; created_at: string }[];

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Assessments</h2>
        {assessments.length === 0 ? (
          <Empty text="No assessments yet." />
        ) : (
          assessments.map((a) => (
            <Card key={a.id}>
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <p className="text-sm">
                  {(a.suspected_factors ?? []).slice(0, 4).map((f) => f.factor).join(" · ") || "No factors"}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      <div className="space-y-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Tracked outcomes</h2>
        {outcomes.length === 0 ? (
          <Empty text="No tracked outcomes yet." />
        ) : (
          outcomes.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex items-center justify-between py-3 text-sm">
                <span className="capitalize">{o.metric.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">
                  {o.baseline ?? "—"} → {o.follow_up ?? "—"}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

function CopilotChat() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [recs, setRecs] = useState<FoodRecommendation[]>([]);

  async function send() {
    const msg = input.trim();
    if (!msg) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setBusy(true);
    setRecs([]);
    try {
      const res = await fetch("/api/v1/nutrition/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const j = await res.json();
      if (res.ok) {
        const data = j.data as { paragraphs: string[]; disclaimers: string[]; recommendations: FoodRecommendation[] };
        const text = [...data.paragraphs, "", ...data.disclaimers].join("\n");
        setMessages((m) => [...m, { role: "assistant", text }]);
        setRecs(data.recommendations ?? []);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: j?.error?.message ?? "Something went wrong." }]);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask in plain language, e.g. &ldquo;I&rsquo;ve been tired with muscle cramps and my vitamin D came back
                18&rdquo;. The Copilot is fully deterministic and guardrailed.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`whitespace-pre-line rounded-lg p-3 text-sm ${
                  m.role === "user" ? "ml-8 bg-primary/10" : "mr-8 bg-muted"
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Tell me what's going on..."
            />
            <Button onClick={send} disabled={busy}>
              {busy ? "..." : "Send"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {recs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Suggested foods</h2>
          {recs.map((r, i) => (
            <RecommendationCard key={`${r.foodSlug}:${i}`} rec={r} />
          ))}
        </div>
      )}
    </section>
  );
}
