import type { CaseContent } from "@/server/cases/build";

const STATUS_STYLES: Record<string, string> = {
  low: "text-amber-600",
  high: "text-red-600",
  in_range: "text-emerald-600",
  unknown: "text-muted-foreground",
};

// Presentational case renderer (server-compatible; used by detail + print views).
export function CaseView({ title, content }: { title: string; content: CaseContent }) {
  const c = content;
  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {c.specialist ? `Prepared for ${c.specialist} · ` : ""}
          Generated {c.generatedAt.slice(0, 10)}
        </p>
      </header>

      <section className="space-y-1 text-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Patient</h2>
        <p>Name: {c.patient.displayName ?? "—"}</p>
        <p>Biological sex: {c.patient.biologicalSex ?? "—"}</p>
        <p>Age: {c.patient.ageYears ?? "—"}</p>
        <p>Check-ins (last 30 days): {c.summary.checkinDays30}</p>
      </section>

      {c.labs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent lab results</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-2">Biomarker</th>
                <th className="py-1 pr-2">Value</th>
                <th className="py-1 pr-2">Reference</th>
                <th className="py-1 pr-2">Status</th>
                <th className="py-1">Date</th>
              </tr>
            </thead>
            <tbody>
              {c.labs.map((l, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 pr-2">{l.name}</td>
                  <td className="py-1 pr-2">{l.value}{l.unit ? ` ${l.unit}` : ""}</td>
                  <td className="py-1 pr-2">
                    {l.refLow != null || l.refHigh != null ? `${l.refLow ?? ""}–${l.refHigh ?? ""}` : "—"}
                  </td>
                  <td className={`py-1 pr-2 ${STATUS_STYLES[l.status]}`}>{l.status.replace("_", " ")}</td>
                  <td className="py-1">{l.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {c.indices.length > 0 && (
        <section className="space-y-1 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Self-tracked indices (0–100)
          </h2>
          {c.indices.map((i) => (
            <p key={i.kind}>
              {i.label}: <span className="font-medium">{i.value}</span> <span className="text-muted-foreground">(as of {i.date})</span>
            </p>
          ))}
        </section>
      )}

      {c.findings.length > 0 && (
        <Section title="Observations to discuss" items={c.findings} />
      )}
      {c.positives.length > 0 && <Section title="Positive trends" items={c.positives} />}
      {c.openQuestions.length > 0 && <Section title="Open questions" items={c.openQuestions} />}

      {c.experiments.length > 0 && (
        <section className="space-y-1 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Experiments</h2>
          {c.experiments.map((e, i) => (
            <p key={i}>
              <span className="font-medium">{e.question}</span> ({e.status})
              {e.conclusion ? ` — ${e.conclusion}` : ""}
            </p>
          ))}
        </section>
      )}

      {c.momentumScore != null && (
        <section className="text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health Momentum</h2>
          <p className="text-lg font-semibold">{c.momentumScore}/100</p>
        </section>
      )}

      <p className="border-t pt-3 text-xs text-muted-foreground">{c.disclaimer}</p>
    </article>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="space-y-1 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <ul className="list-disc space-y-1 pl-5">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </section>
  );
}
