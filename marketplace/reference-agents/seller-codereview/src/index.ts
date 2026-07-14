export interface SellerCodereviewAgentInfo {
  name: string;
  version: string;
  description: string;
}

export function describe(): SellerCodereviewAgentInfo {
  return {
    name: 'seller-codereview',
    version: '0.0.0',
    description: 'Reference seller agent that reviews code listings (P2 stub)',
  };
}
