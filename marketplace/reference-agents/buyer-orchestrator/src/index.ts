export interface BuyerOrchestratorAgentInfo {
  name: string;
  version: string;
  description: string;
}

export function describe(): BuyerOrchestratorAgentInfo {
  return {
    name: 'buyer-orchestrator',
    version: '0.0.0',
    description: 'Reference buyer agent that orchestrates multi-seller workflows (P2 stub)',
  };
}
