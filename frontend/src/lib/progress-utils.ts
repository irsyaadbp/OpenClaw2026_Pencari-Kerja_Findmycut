export interface ProgressEntry {
  agent: string;
  step: string;
  message: string;
  tool_call: string | null;
  timestamp: string;
}

/**
 * Deduplicate progress entries by (timestamp, agent) pair.
 * Keeps the first occurrence of each unique pair.
 */
export function deduplicateEntries(entries: ProgressEntry[]): ProgressEntry[] {
  const seen = new Set<string>();
  const result: ProgressEntry[] = [];

  for (const entry of entries) {
    const key = `${entry.timestamp}|${entry.agent}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(entry);
    }
  }

  return result;
}

/**
 * Sort progress entries by timestamp ascending (oldest first, newest last).
 */
export function sortEntriesChronologically(entries: ProgressEntry[]): ProgressEntry[] {
  return [...entries].sort((a, b) => {
    if (a.timestamp < b.timestamp) return -1;
    if (a.timestamp > b.timestamp) return 1;
    return 0;
  });
}

/**
 * Sanitize a progress message for user display.
 * Removes technical details like URLs, status codes, JSON payloads,
 * and replaces them with user-friendly messages.
 */
export function sanitizeMessage(entry: ProgressEntry): string {
  const { message, step } = entry;

  // If the message contains URLs or HTTP status codes, replace with friendly text
  const hasUrl = /https?:\/\/\S+/.test(message);
  const hasStatusCode = /status \d{3}/.test(message);
  const hasJson = /\{.*".*":.*\}/.test(message);

  // If it's a tool_call/tool_result step with technical content, simplify
  if (hasUrl || hasStatusCode || hasJson) {
    // Extract the tool/function name if present
    const toolMatch = message.match(/(\w+)\s*(gagal|failed|error)/i);
    const toolName = toolMatch ? toolMatch[1] : null;

    if (step === "error" || step === "skip" || message.toLowerCase().includes("gagal") || message.toLowerCase().includes("failed") || message.toLowerCase().includes("error")) {
      if (toolName) {
        return `${toolName} mengalami kendala, mencoba ulang...`;
      }
      return "Terjadi kendala, mencoba ulang...";
    }

    // For tool calls with URLs, just show the action
    if (step === "tool" || step === "tool_call") {
      const actionMatch = message.match(/(?:Memanggil|Calling)\s+(\w+)/i);
      if (actionMatch) {
        return `Menjalankan ${actionMatch[1]}...`;
      }
      return "Memproses...";
    }

    // For tool results with technical content
    if (step === "tool_result") {
      if (message.toLowerCase().includes("error") || message.toLowerCase().includes("gagal")) {
        return "Langkah selesai dengan peringatan";
      }
      return "Langkah selesai";
    }

    // Generic fallback for any message with technical content
    return "Memproses...";
  }

  // Clean up messages that start with emoji + technical function signatures
  const funcCallMatch = message.match(/^[^\w]*(?:Memanggil|Calling)\s+\w+\(.*\)/);
  if (funcCallMatch) {
    const funcName = message.match(/(?:Memanggil|Calling)\s+(\w+)/);
    if (funcName) {
      return `Menjalankan ${funcName[1]}...`;
    }
  }

  // Return original message if it's already user-friendly
  return message;
}
