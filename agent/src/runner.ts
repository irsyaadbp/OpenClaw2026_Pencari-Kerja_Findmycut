import { chatCompletion, parseJsonFromText, type LlmTool } from "./lib/llm";
import type Anthropic from "@anthropic-ai/sdk";
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
 * Generic autonomous agent runner with Anthropic-style tool-calling loop.
 *
 * Features:
 * - Multi-turn conversation with LLM (Anthropic format)
 * - Autonomous tool selection and execution
 * - Reasoning extraction and logging
 * - Error recovery (tool failures don't crash the loop)
 * - Clean progress logging (no spam)
 */
export async function runAgent(
  config: AgentConfig,
  userMessage: string,
  onStep?: (step: AgentStep) => void
): Promise<{ success: boolean; output: any; iterations: number; reasoning?: string }> {
  const maxIter = config.maxIterations ?? 8;
  const emit = (step: AgentStep) => onStep?.(step);

  // Convert tools to Anthropic format
  const anthropicTools: LlmTool[] = config.tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: t.parameters.properties || {},
      required: t.parameters.required || [],
    },
  }));

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${config.systemPrompt}\n\n---\n\n${userMessage}` },
  ];

  let iterations = 0;
  let lastReasoning: string | undefined;

  // Emit initial thinking
  emit({
    agent: config.name,
    type: "thinking",
    message: `${config.name} berpikir...`,
    timestamp: new Date(),
  });

  while (iterations < maxIter) {
    iterations++;

    try {
      const response = await chatCompletion(messages, anthropicTools, config.model);

      // Extract text content (reasoning)
      const textBlocks = response.content.filter((b) => b.type === "text");
      const reasoning = textBlocks.map((b) => (b as any).text).join("\n");
      if (reasoning) {
        lastReasoning = reasoning;
        if (reasoning.length > 10 && !reasoning.includes("error occurred")) {
          emit({
            agent: config.name,
            type: "thinking",
            message: `💭 ${truncate(reasoning, 200)}`,
            timestamp: new Date(),
          });
        }
      }

      // Check if LLM wants to use tools
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

      if (toolUseBlocks.length > 0) {
        // Push assistant response (with tool_use blocks)
        messages.push({ role: "assistant", content: response.content });

        // Execute tools and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of toolUseBlocks) {
          const toolUse = block as Anthropic.ToolUseBlock;
          const tool = config.tools.find((t) => t.name === toolUse.name);
          if (!tool) {
            toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify({ error: "Tool not found" }) });
            continue;
          }

          const args = toolUse.input as any;

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
          }

          emit({
            agent: config.name,
            type: "tool_result",
            message: `✅ ${tool.name} → ${summarizeResult(result)}`,
            toolName: tool.name,
            timestamp: new Date(),
          });

          // Truncate result if too long
          const resultStr = JSON.stringify(result);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: resultStr.length > 3000 ? resultStr.slice(0, 3000) + "..." : resultStr,
          });
        }

        // Push tool results as user message
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // No tool calls — agent is done
      emit({
        agent: config.name,
        type: "complete",
        message: `✅ ${config.name} selesai (${iterations} iterasi)`,
        timestamp: new Date(),
      });

      return {
        success: true,
        output: parseJsonFromText(reasoning || ""),
        iterations,
        reasoning: lastReasoning,
      };
    } catch (err: any) {
      // Don't emit LLM errors to progress (noisy for FE)
      console.error(`[${config.name}] Iteration ${iterations} error:`, err.message);

      if (iterations >= maxIter) {
        return { success: false, output: null, iterations, reasoning: lastReasoning };
      }

      // Add error context for self-correction
      messages.push({
        role: "user",
        content: `An error occurred. Please provide your best answer with the information you have so far. Return JSON output.`,
      });
    }
  }

  // Max iterations reached
  emit({
    agent: config.name,
    type: "complete",
    message: `⚠️ ${config.name} selesai (batas iterasi)`,
    timestamp: new Date(),
  });

  return { success: false, output: null, iterations, reasoning: lastReasoning };
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + "...";
}

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
