// Skill-based classification used across lesson creation, student profiles,
// and lesson visibility filtering. Replaces the legacy "Grade 1–12" system.

export const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"] as const;
export type LevelOption = (typeof LEVEL_OPTIONS)[number];

// Lessons can target a specific skill level, the AI Class cohort, or everyone.
export const TARGET_AUDIENCE_OPTIONS = [
  ...LEVEL_OPTIONS,
  "AI Class",
  "All",
] as const;
export type TargetAudience = (typeof TARGET_AUDIENCE_OPTIONS)[number];

// Back-compat alias — some older imports may still reference GRADE_OPTIONS.
export const GRADE_OPTIONS = LEVEL_OPTIONS;
export type GradeOption = LevelOption;

export function audienceLabel(value: string | null | undefined): string {
  if (!value) return "All Students";
  if (value === "All") return "ALL";
  return value;
}

// Tailwind classes for the colored badge used on lesson cards.
export function audienceBadgeClass(value: string | null | undefined): string {
  switch (value) {
    case "Beginner":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800";
    case "Intermediate":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800";
    case "Advanced":
      return "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-800";
    case "AI Class":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800";
    default:
      return "bg-secondary text-secondary-foreground border-border";
  }
}
