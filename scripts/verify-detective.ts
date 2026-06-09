import {
  applyGuardrails,
  detectEmergency,
  scanStatement,
  NON_DIAGNOSTIC_DISCLAIMER,
} from "@/ai/guardrails";
import { pearson, confidenceLevel } from "@/server/detective/stats";
import type { AiResponse } from "@/types";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  cond ? pass++ : fail++;
}

// --- Guardrail enforcement checklist (docs/19 section 11) ---
check("diagnosis blocked: 'you may have sleep apnea'", scanStatement("You may have sleep apnea.").blocked);
check("diagnosis blocked: 'diagnosis of depression'", scanStatement("This suggests a diagnosis of depression.").blocked);
check("prescription blocked: 'increase your dose'", scanStatement("You should increase your medication dose.").blocked);
check("prescription blocked: 'take 50mg'", scanStatement("Take 50 mg of zinc daily.").blocked);

const causal = scanStatement("Poor sleep causes your low libido.");
check("causation reframed (not blocked)", !causal.blocked && causal.flags.some((f) => f.rule === "causation"));
check("causation: no 'causes' remains", !/\bcauses\b/i.test(causal.text));

check("emergency detected: chest pain", detectEmergency("I have crushing chest pain"));
check("emergency detected: suicidal", detectEmergency("I have been feeling suicidal"));
check("non-emergency NOT flagged", !detectEmergency("anything new in my sleep?"));

const resp: AiResponse = {
  system: "detective",
  observations: [
    "Dry mouth was reported on 24 of the last 30 mornings.",
    "You have sleep apnea.", // must be dropped
  ],
  questions: ["Would you like to investigate sleep quality?"],
  hypotheses: [
    { statement: "Poor sleep quality may be associated with lower libido.", confidence: 0.42, supportingSignals: ["sleep_quality", "libido"] },
    { statement: "Your fatigue is caused by anemia.", confidence: 0.5, supportingSignals: ["fatigue"] }, // diagnosis -> dropped
  ],
  disclaimers: [],
  guardrailFlags: [],
};
const guarded = applyGuardrails(resp);
check("diagnostic observation dropped", guarded.observations.length === 1);
check("good observation kept", guarded.observations[0].includes("Dry mouth"));
check("diagnostic hypothesis dropped", guarded.hypotheses.length === 1);
check("possibility hypothesis kept", guarded.hypotheses[0].statement.includes("may be associated"));
check("disclaimer auto-attached", guarded.disclaimers.includes(NON_DIAGNOSTIC_DISCLAIMER));
check("guardrail flags recorded", guarded.guardrailFlags.length >= 2);

// --- Correlation math (docs/19 sections 4-5) ---
check("pearson perfect positive = 1", pearson([1, 2, 3, 4], [2, 4, 6, 8]) === 1);
check("pearson perfect negative = -1", pearson([1, 2, 3, 4], [8, 6, 4, 2]) === -1);
const r = pearson([10, 8, 13, 9, 11], [8, 6, 13, 7, 11])!;
check("pearson known ~0.98", Math.abs(r - 0.98) < 0.02);
check("pearson zero-variance -> null", pearson([5, 5, 5], [1, 2, 3]) === null);

check("confidence <0.20 -> null", confidenceLevel(0.1) === null);
check("confidence 0.47 -> Moderate", confidenceLevel(0.47) === "Moderate");
check("confidence 0.85 -> Very High", confidenceLevel(-0.85) === "Very High");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
