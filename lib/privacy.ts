import type { PrivacyMode, Sensitivity } from "@/types";

// Sensitive-data gating helpers. See docs/10-security-design.md.
// Reads of highly_sensitive rows require a recent unlock in extra_protected mode.

export function requiresUnlock(mode: PrivacyMode, sensitivity: Sensitivity): boolean {
  return mode === "extra_protected" && sensitivity === "highly_sensitive";
}

// In local_only mode, sensitive rows are never written to the server.
export function blockedFromServer(mode: PrivacyMode, sensitivity: Sensitivity): boolean {
  return mode === "local_only" && sensitivity !== "normal";
}

export const SENSITIVE_PROFILE_FIELDS = [
  "reproductiveGoals",
  "genderIdentity",
  "sexualOrientation",
] as const;
