import type { IntegrationProvider } from "@/types/canonical";

// Realistic sample daily-summary payloads per provider, shaped to match each
// adapter in server/integrations/adapters.ts. Lets users test the integration
// pipeline (sync -> canonical -> indices) without owning a wearable.

function lastDays(n: number): string[] {
  const out: string[] = [];
  for (let i = n; i >= 1; i--) {
    out.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

// Small deterministic wobble so trends look real, not flat.
function wobble(base: number, day: number, amp: number): number {
  return Math.round((base + Math.sin(day) * amp) * 100) / 100;
}

export function sampleFor(provider: IntegrationProvider, days = 7): Record<string, unknown>[] {
  const dates = lastDays(days);
  return dates.map((date, i) => {
    switch (provider) {
      case "oura":
        return {
          day: date,
          total_sleep_duration: Math.round(wobble(27000, i, 1800)), // seconds (~7.5h)
          efficiency: wobble(88, i, 4),
          score: Math.round(wobble(82, i, 6)),
          awake_count: Math.max(0, Math.round(wobble(2, i, 1.5))),
          readiness_score: Math.round(wobble(79, i, 7)),
          lowest_heart_rate: Math.round(wobble(52, i, 3)),
          average_hrv: Math.round(wobble(65, i, 8)),
          respiratory_rate: wobble(14.5, i, 0.6),
          steps: Math.round(wobble(8200, i, 1500)),
          active_calories: Math.round(wobble(430, i, 80)),
        };
      case "whoop":
        return {
          date,
          total_sleep_time_milli: Math.round(wobble(27000, i, 1800)) * 1000,
          sleep_efficiency: wobble(86, i, 4),
          recovery_score: Math.round(wobble(68, i, 10)),
          resting_heart_rate: Math.round(wobble(54, i, 3)),
          hrv_rmssd_milli: Math.round(wobble(62, i, 9)),
          respiratory_rate: wobble(15, i, 0.5),
          strain: wobble(12.5, i, 3),
          kilojoule: Math.round(wobble(9000, i, 1200)),
        };
      case "garmin":
        return {
          calendarDate: date,
          sleepTimeSeconds: Math.round(wobble(26400, i, 1800)),
          restingHeartRateInBeatsPerMinute: Math.round(wobble(53, i, 3)),
          avgOvernightHrv: Math.round(wobble(60, i, 8)),
          respirationRate: wobble(14, i, 0.6),
          steps: Math.round(wobble(9500, i, 1800)),
          distanceInMeters: Math.round(wobble(7000, i, 1500)),
          activeKilocalories: Math.round(wobble(520, i, 90)),
          moderateIntensityDurationInSeconds: Math.round(wobble(1800, i, 600)),
        };
      case "fitbit":
        return {
          dateOfSleep: date,
          minutesAsleep: Math.round(wobble(440, i, 30)),
          efficiency: Math.round(wobble(90, i, 4)),
          awakeCount: Math.max(0, Math.round(wobble(3, i, 1.5))),
          restingHeartRate: Math.round(wobble(58, i, 3)),
          steps: Math.round(wobble(10200, i, 2000)),
          distance: wobble(7.4, i, 1.2),
          caloriesOut: Math.round(wobble(2400, i, 200)),
        };
      case "ultrahuman":
        return {
          day: date,
          sleep_duration_minutes: Math.round(wobble(450, i, 30)),
          sleep_index: Math.round(wobble(80, i, 7)),
          recovery_index: Math.round(wobble(72, i, 9)),
          resting_heart_rate: Math.round(wobble(55, i, 3)),
          hrv: Math.round(wobble(58, i, 8)),
          steps: Math.round(wobble(8800, i, 1600)),
          movement_index: Math.round(wobble(65, i, 10)),
        };
      case "apple_health":
        return {
          date,
          sleepAnalysisMinutes: Math.round(wobble(445, i, 30)),
          restingHeartRate: Math.round(wobble(56, i, 3)),
          hrv: Math.round(wobble(61, i, 8)),
          respiratoryRate: wobble(14.8, i, 0.6),
          steps: Math.round(wobble(9100, i, 1700)),
          activeEnergyBurned: Math.round(wobble(480, i, 90)),
          bodyMass: wobble(78, i, 0.4),
          bodyFatPercentage: wobble(0.19, i, 0.01),
        };
      case "google_fit":
        return {
          day: date,
          steps: Math.round(wobble(9300, i, 1800)),
          distance: Math.round(wobble(7200, i, 1400)), // meters
          calories: Math.round(wobble(500, i, 90)),
          activeMinutes: Math.round(wobble(35, i, 12)),
          weight: wobble(78, i, 0.4),
        };
      default:
        return { date };
    }
  });
}
