import type { LifecycleCalculation, PlanningHorizon } from "@/lib/types";

export function averageLifespan(sourceLabel: string | undefined, fallback?: number) {
  const range = sourceLabel?.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return Math.round((Number(range[1]) + Number(range[2])) / 2);
  return fallback;
}

export function planningHorizonFor(remainingLife: number): PlanningHorizon {
  if (remainingLife < 0) return "Overdue";
  if (remainingLife <= 10) return "1-10 years";
  if (remainingLife <= 20) return "11-20 years";
  if (remainingLife <= 30) return "21-30 years";
  return "Beyond 30 years";
}

export function calculateLifecycle(
  installationYear?: number,
  typicalLifeYears?: number,
  currentYear = new Date().getFullYear(),
  suppliedReplacementYear?: number
): LifecycleCalculation {
  if (suppliedReplacementYear !== undefined && Number.isFinite(suppliedReplacementYear)) {
    const remainingLife = suppliedReplacementYear - currentYear;
    return {
      age: installationYear ? currentYear - installationYear : typicalLifeYears ? typicalLifeYears - remainingLife : null,
      remainingLife,
      replacementYear: suppliedReplacementYear,
      suggestedHorizon: planningHorizonFor(remainingLife),
    };
  }
  if (!installationYear || !typicalLifeYears) {
    return { age: null, remainingLife: null, replacementYear: null, suggestedHorizon: "" };
  }
  const age = currentYear - installationYear;
  const replacementYear = installationYear + typicalLifeYears;
  const remainingLife = replacementYear - currentYear;
  return { age, remainingLife, replacementYear, suggestedHorizon: planningHorizonFor(remainingLife) };
}
