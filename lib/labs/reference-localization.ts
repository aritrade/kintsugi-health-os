// Lab reference-range localization (docs/14 §2.5). Different regions report some
// biomarkers in different units / conventional ranges. This maps a canonical
// (US conventional) biomarker range into a region's preferred unit + range.

export type Region = "US" | "EU" | "UK" | "IN";

interface UnitConversion {
  toUnit: string;
  factor: number; // multiply the conventional value by this to get the region's unit
}

// Region-specific unit conversions per biomarker slug. Absence => use default.
const CONVERSIONS: Record<string, Partial<Record<Region, UnitConversion>>> = {
  // Glucose / HbA1c stays % everywhere; cholesterol & glucose differ by region.
  ldl: { EU: { toUnit: "mmol/L", factor: 1 / 38.67 }, UK: { toUnit: "mmol/L", factor: 1 / 38.67 } },
  hdl: { EU: { toUnit: "mmol/L", factor: 1 / 38.67 }, UK: { toUnit: "mmol/L", factor: 1 / 38.67 } },
  triglycerides: { EU: { toUnit: "mmol/L", factor: 1 / 88.57 }, UK: { toUnit: "mmol/L", factor: 1 / 88.57 } },
  testosterone_total: {
    EU: { toUnit: "nmol/L", factor: 0.0347 },
    UK: { toUnit: "nmol/L", factor: 0.0347 },
  },
};

export interface LocalizedRange {
  unit: string;
  low: number | null;
  high: number | null;
  region: Region;
  converted: boolean;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function localizeReferenceRange(
  slug: string,
  defaultUnit: string,
  low: number | null,
  high: number | null,
  region: Region,
): LocalizedRange {
  const conv = CONVERSIONS[slug]?.[region];
  if (!conv) {
    return { unit: defaultUnit, low, high, region, converted: false };
  }
  return {
    unit: conv.toUnit,
    low: low == null ? null : round(low * conv.factor),
    high: high == null ? null : round(high * conv.factor),
    region,
    converted: true,
  };
}

export function isRegion(r: string): r is Region {
  return r === "US" || r === "EU" || r === "UK" || r === "IN";
}
