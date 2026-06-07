export type ChainName = "Ethereum" | "Base" | "Arbitrum" | "Optimism" | "Polygon" | "BNB Chain" | "Avalanche";
export type TokenSymbol = "ETH" | "USDC" | "USDT" | "WBTC" | "DAI" | "BNB" | "AVAX";
export type Priority = "fastest" | "balanced" | "lowest_cost";
export type RiskPreference = "low" | "medium" | "high";
export type PlanMode = "Realtime" | "SmartSwap";
export type RiskScore = "Low" | "Medium" | "High";
export type StrategyType = "WAIT_FOR_LOW_FEE" | "SPLIT_EXECUTION" | "WAIT_AND_SPLIT";
export type DelegatedTaskStatus = "ReadyToDelegate" | "Monitoring" | "ConditionMet" | "Executed" | "Expired" | "Cancelled";

export type SwapIntent = {
  fromChain: ChainName;
  fromToken: TokenSymbol;
  amount: string;
  toChain: ChainName;
  toToken: TokenSymbol;
  maxWaitHours: number;
  priority: Priority;
  riskPreference: RiskPreference;
};

export type TradeTask = {
  id: string;
  fromChain: ChainName;
  fromToken: TokenSymbol;
  amount: string;
  toChain: ChainName;
  toToken: TokenSymbol;
  maxWaitHours: number;
  summary: string;
};

export type RouteStep = {
  action: "swap" | "bridge" | "approve" | "transfer";
  fromChain: ChainName;
  toChain: ChainName;
  fromToken: TokenSymbol;
  toToken: TokenSymbol;
  provider: string;
  description: string;
};

export type RouteQuote = {
  id: string;
  provider: string;
  source: "lifi" | "mock";
  steps: RouteStep[];
  estimatedGasUsd: number;
  bridgeFeeUsd: number;
  dexFeeUsd: number;
  slippageUsd: number;
  priceImpactUsd: number;
  expectedReceiveAmount: string;
  expectedReceiveUsd: number;
  estimatedTimeMinutes: number;
  needsApproval: boolean;
  rawCostUsd: number;
};

export type CostBreakdown = {
  gas: number;
  bridge: number;
  dex: number;
  slippage: number;
  priceImpact: number;
  volatilityReserve: number;
};

export type BaselinePlan = {
  type: "REALTIME";
  routeId: string;
  provider: string;
  totalCostUsd: number;
  expectedReceiveAmount: string;
  expectedReceiveUsd: number;
  estimatedTimeMinutes: number;
  routeSteps: RouteStep[];
  costBreakdown: CostBreakdown;
  slippagePct: number;
  priceImpactPct: number;
};

export type ExecutionBoundary = {
  maxTotalCostUsd: number;
  minReceiveAmount: string;
  maxSlippagePct: number;
  maxPriceImpactPct: number;
  expiresInHours: number;
};

export type SplitLeg = {
  index: number;
  amount: string;
  targetCondition: string;
  estimatedCostUsd: number;
  estimatedReceiveAmount: string;
};

export type OptimizedPlan = {
  type: "SMARTSWAP";
  strategy: StrategyType;
  mode: PlanMode;
  routeId: string;
  provider: string;
  totalCostUsd: number;
  expectedSavingUsd: number;
  expectedSavingPct: number;
  expectedReceiveAmount: string;
  expectedReceiveUsd: number;
  estimatedTimeMinutes: number;
  waitCondition: string;
  splitCount: number;
  splitLegs: SplitLeg[];
  routeSteps: RouteStep[];
  riskScore: RiskScore;
  riskNotes: string[];
  costBreakdown: CostBreakdown;
  rationale: string;
  boundary: ExecutionBoundary;
};

export type PlanComparison = {
  task: TradeTask;
  baselinePlan: BaselinePlan;
  optimizedPlan: OptimizedPlan;
};

export type AlertSimulation = {
  status: "monitoring" | "triggered";
  currentCondition: string;
  targetCondition: string;
  message: string;
  reviewSteps: string[];
};

export type DelegatedTask = {
  id: string;
  task: TradeTask;
  baselinePlan: BaselinePlan;
  optimizedPlan: OptimizedPlan;
  status: DelegatedTaskStatus;
  createdAt: string;
};

export type ExecutionReport = {
  delegatedTaskId: string;
  status: "Executed";
  executedAt: string;
  strategy: StrategyType;
  actualReceiveAmount: string;
  actualTotalCostUsd: number;
  savingVsBaselineUsd: number;
  splitRecords: SplitLeg[];
  summary: string;
};

export type ExecutionPlan = OptimizedPlan;

export type ApiError = {
  error: string;
  detail?: string;
};
