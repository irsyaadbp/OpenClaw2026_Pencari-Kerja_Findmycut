import * as analysisRepo from "../repositories/analysis.repo";
import * as agentLogRepo from "../repositories/agent-log.repo";

export async function createAnalysis(userId: string, imageUrl: string) {
  return analysisRepo.create({ userId, imageUrl });
}

export async function getStatus(analysisId: string) {
  const analysis = await analysisRepo.findById(analysisId);
  if (!analysis) throw new Error("Analysis not found");

  const logs = await agentLogRepo.findByAnalysisId(analysisId);

  return {
    analysis_id: analysis.id,
    status: analysis.status,
    current_agent: analysis.currentAgent,
    progress: logs.map((l) => ({
      agent: l.agentName,
      step: l.step,
      message: l.message,
      tool_call: l.toolCall,
      timestamp: l.createdAt,
    })),
  };
}

export async function updateStatus(analysisId: string, status: string, currentAgent?: string) {
  return analysisRepo.updateStatus(analysisId, status, currentAgent);
}

export async function logAgentStep(analysisId: string, data: {
  agentName: string;
  step: string;
  message: string;
  toolCall?: string;
  toolInput?: any;
  toolOutput?: any;
  reasoning?: string;
}) {
  return agentLogRepo.create({ analysisId, ...data });
}
