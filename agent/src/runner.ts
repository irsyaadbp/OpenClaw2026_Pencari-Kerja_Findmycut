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

export async function runAgent(
  config: AgentConfig,
  userMessage: string,
  onStep?: (step: AgentStep) => void
): Promise<{ success: boolean; output: any; iterations: number }> {
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

  while (iterations < maxIter) {
    iterations++;
    emit({ agent: config.name, type: "thinking", message: `${config.name} berpikir... (${iterations})`, timestamp: new Date() });

    try {
      const response = await chatCompletion(messages, toolsSchema, config.model);

      if (response.tool_calls && response.tool_calls.length > 0) {
        for (const toolCall of response.tool_calls) {
          if (toolCall.type !== "function") continue;
          const fn = (toolCall as any).function;
          const tool = config.tools.find((t) => t.name === fn.name);
          if (!tool) continue;

          let args: any;
          try { args = JSON.parse(fn.arguments); } catch { args = fn.arguments; }

          emit({ agent: config.name, type: "tool_call", message: `Memanggil ${tool.name}`, toolName: tool.name, timestamp: new Date() });

          let result: any;
          try { result = await tool.execute(args); } catch (err: any) { result = { error: err.message }; }

          emit({ agent: config.name, type: "tool_result", message: `${tool.name} selesai`, toolName: tool.name, timestamp: new Date() });

          messages.push(
            { role: "assistant", content: null, tool_calls: [toolCall] },
            { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(result) }
          );
        }
        continue;
      }

      emit({ agent: config.name, type: "complete", message: `${config.name} selesai`, timestamp: new Date() });
      return { success: true, output: parseJsonFromText(response.content || ""), iterations };
    } catch (err: any) {
      emit({ agent: config.name, type: "error", message: err.message, timestamp: new Date() });
      return { success: false, output: null, iterations };
    }
  }

  return { success: false, output: null, iterations };
}
