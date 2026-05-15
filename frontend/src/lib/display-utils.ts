export interface StepIconResult {
  icon: string;
  color: string;
  animated: boolean;
}

/**
 * Truncate a name to a maximum length, appending an ellipsis if exceeded.
 * If the name length is maxLength or fewer characters, return unchanged.
 */
export function truncateName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + "…";
}

/**
 * Map a progress step value to its corresponding icon, color, and animation state.
 * - "complete" → green ✓
 * - "error" | "skip" → amber !
 * - "tool" | "tool_call" | "tool_result" → blue ↻
 * - "start" | "thinking" → spinner (animated)
 * - unknown → default gray ●
 */
export function getStepIcon(step: string): StepIconResult {
  switch (step) {
    case "complete":
      return { icon: "✓", color: "green", animated: false };
    case "error":
    case "skip":
      return { icon: "!", color: "amber", animated: false };
    case "tool":
    case "tool_call":
    case "tool_result":
      return { icon: "↻", color: "blue", animated: false };
    case "start":
    case "thinking":
      return { icon: "⟳", color: "blue", animated: true };
    default:
      return { icon: "●", color: "gray", animated: false };
  }
}
