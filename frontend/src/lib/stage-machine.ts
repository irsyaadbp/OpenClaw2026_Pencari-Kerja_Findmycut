export type Stage = "landing" | "upload" | "scan" | "results" | "payment_success";
export type StageEvent =
  | "start"
  | "face_selected"
  | "scan_complete"
  | "payment_complete"
  | "view_results"
  | "reset";

export function getNextStage(current: Stage, event: StageEvent): Stage {
  if (event === "reset") return "landing";

  switch (current) {
    case "landing":
      if (event === "start") return "upload";
      break;
    case "upload":
      if (event === "face_selected") return "scan";
      break;
    case "scan":
      if (event === "scan_complete") return "results";
      break;
    case "results":
      if (event === "payment_complete") return "payment_success";
      break;
    case "payment_success":
      if (event === "view_results") return "results";
      break;
  }

  return current;
}
