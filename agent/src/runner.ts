import { chatCompletion, parseJsonFromText } from "./lib/llm";
import type { AgentStep } from "./types";

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  tools: Tool[];
  maxIterations?: number;
  model?: string;
}

/**
 * Generic autonomous agent runner with tool-calling loop.
 *
 * Features:
 * - Multi-turn conversation with LLM
 * - Autonomous tool selection and execution
 * - Reasoning extraction and logging
 * - Error recovery (tool failures don't crash the loop)
 * - Iteration tracking for observability
 */
export async function runAgent(
  config: AgentConfig,
  userMessage: string,
  onStep?: (step: AgentStep) => void
): Promise<{ success: boolean; output: any; iterations: number; reasoning?: string }> {
  const maxIter = config.maxIterations ?? 8;
  const emit = (step: AgentStep) => onStep?.(step);

  const toolsSchema = config.tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const messages: any[] = [
    { role: "system", content: config.systemPrompt },
    { role: "user", content: userMessage },
  ];

  let iterations = 0;
  let lastReasoning: string | undefined;

  while (iterations < maxIter) {
    iterations++;
    emit({
      agent: config.name,
      type: "thinking",
      message: `${config.name} berpikir... (iterasi ${iterations}/${maxIter})`,
      timestamp: new Date(),
    });

    try {
      const response = await chatCompletion(messages, toolsSchema, config.model);

      // Extract reasoning from response content (even when tool_calls are present)
      if (response.content) {
        lastReasoning = response.content;
        emit({
          agent: config.name,
          type: "thinking",
          message: `💭 ${truncate(response.content, 200)}`,
          timestamp: new Date(),
        });
      }

      if (response.tool_calls && response.tool_calls.length > 0) {
        // Process each tool call
        for (const toolCall of response.tool_calls) {
          if (toolCall.type !== "function") continue;
          const fn = (toolCall as any).function;
          const tool = config.tools.find((t) => t.name === fn.name);
          if (!tool) continue;

          let args: any;
          try { args = JSON.parse(fn.arguments); } catch { args = fn.arguments; }

          emit({
            agent: config.name,
            type: "tool_call",
            message: `🔧 Memanggil ${tool.name}(${summarizeArgs(args)})`,
            toolName: tool.name,
            timestamp: new Date(),
          });

          let result: any;
          try {
            result = await tool.execute(args);
          } catch (err: any) {
            result = { error: err.message };
            emit({
              agent: config.name,
              type: "error",
              message: `⚠️ ${tool.name} gagal: ${err.message}`,
              toolName: tool.name,
              timestamp: new Date(),
            });
          }

          emit({
            agent: config.name,
            type: "tool_result",
            message: `✅ ${tool.name} → ${summarizeResult(result)}`,
            toolName: tool.name,
            timestamp: new Date(),
          });

          messages.push(
            { role: "assistant", content: response.content || null, tool_calls: [toolCall] },
            { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) }
          );
        }
        continue;
      }

      // No tool calls — agent is done, return final output
      emit({
        agent: config.name,
        type: "complete",
        message: `✅ ${config.name} selesai (${iterations} iterasi)`,
        timestamp: new Date(),
      });

      return {
        success: true,
        output: parseJsonFromText(response.content || ""),
        iterations,
        reasoning: lastReasoning,
      };
    } catch (err: any) {
      emit({
        agent: config.name,
        type: "error",
        message: `❌ Error: ${err.message}`,
        timestamp: new Date(),
      });

      // Don't immediately fail — try one more iteration if we have budget
      if (iterations >= maxIter) {
        return { success: false, output: null, iterations, reasoning: lastReasoning };
      }

      // Add error context to messages so LLM can self-correct
      messages.push({
        role: "user",
        content: `An error occurred: ${err.message}. Please try a different approach or provide your best answer with the information you have.`,
      });
    }
  }

  // Max iterations reached — try to extract whatever output we have
  emit({
    agent: config.name,
    type: "complete",
    message: `⚠️ ${config.name} mencapai batas iterasi (${maxIter}), menggunakan hasil terakhir`,
    timestamp: new Date(),
  });

  return { success: false, output: null, iterations, reasoning: lastReasoning };
}

/**
 * Truncate string for logging
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

/**
 * Summarize tool arguments for readable logging
 */
function summarizeArgs(args: any): string {
  if (!args || typeof args !== "object") return "";
  const keys = Object.keys(args);
  if (keys.length === 0) return "";
  if (keys.length <= 2) {
    return keys.map((k) => {
      const v = args[k];
      if (typeof v === "string") return `${k}="${truncate(v, 30)}"`;
      if (Array.isArray(v)) return `${k}=[${v.length} items]`;
      return `${k}=${v}`;
    }).join(", ");
  }
  return `${keys.length} params`;
}

/**
 * Summarize tool result for readable logging
 */
function summarizeResult(result: any): string {
  if (!result) return "null";
  if (result.error) return `error: ${result.error}`;
  if (result.overall !== undefined) return `score: ${result.overall}%`;
  if (result.valid !== undefined) return result.valid ? "✓ valid" : `✗ ${result.issues?.length || 0} issues`;
  if (result.main_reason) return truncate(result.main_reason, 60);
  if (result.count !== undefined) return `${result.count} results`;
  if (result.compatible !== undefined) return result.compatible ? "compatible ✓" : "not compatible ✗";
  if (result.recommended) return `${result.recommended.length} styles`;
  return truncate(JSON.stringify(result), 80);
}
