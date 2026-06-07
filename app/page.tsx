"use client";

import {
  ArrowRightLeft,
  CheckCircle2,
  Clock3,
  Languages,
  Loader2,
  Moon,
  Play,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  SunMedium,
  WalletCards
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CHAINS, TOKEN_SYMBOLS } from "@/lib/constants";
import type {
  BaselinePlan,
  ChainName,
  DelegatedTask,
  DelegatedTaskStatus,
  ExecutionReport,
  OptimizedPlan,
  PlanComparison,
  RouteQuote,
  SwapIntent,
  TokenSymbol
} from "@/lib/types";
import { formatPct, formatUsd } from "@/lib/utils";
import {
  completeIntent,
  mergeAgentDraft,
  nextAgentPrompt,
  parseAgentInput,
  type AgentDraft
} from "@/lib/agent-guide";

type Language = "zh" | "en";
type Theme = "light" | "dark";
type BusyState = "parse" | "plan" | "delegate" | "execute" | null;
type ChatMessage = { role: "agent" | "user"; content: string };
type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: "accountsChanged" | "chainChanged", handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: "accountsChanged" | "chainChanged", handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type QuoteResponse = {
  quotes: RouteQuote[];
  source: "lifi" | "mock";
  warning?: string;
};

type PlanResponse = PlanComparison & {
  intent: SwapIntent;
  quotes: RouteQuote[];
};

const defaultIntent: SwapIntent = {
  fromChain: "Ethereum",
  fromToken: "ETH",
  amount: "1.4",
  toChain: "Base",
  toToken: "USDT",
  maxWaitHours: 24,
  priority: "lowest_cost",
  riskPreference: "medium"
};

const chainOptions = Object.keys(CHAINS) as ChainName[];
const tokenOptions = TOKEN_SYMBOLS;

const copy = {
  zh: {
    eyebrow: "SmartSwap Agent",
    hero: "让时间为兑换成本让路",
    subHero: "通过实时基准、低费窗口和大额拆分策略，降低 Swap 与跨链兑换的综合执行成本。",
    light: "淡色",
    dark: "暗色",
    language: "语言",
    theme: "主题",
    task: "交易任务",
    agentGuide: "Agent 引导",
    pending: "待完善",
    ready: "可生成",
    confirmed: "已确认",
    inputPlaceholder: "例如：我要把我的 ETH 换成 USDT",
    send: "发送",
    form: "控件选择",
    amount: "数量",
    fromChain: "源网络",
    fromToken: "源币种",
    toChain: "目标网络",
    toToken: "目标币种",
    maxWait: "等待时间",
    generatePlan: "生成方案",
    baseline: "实时交易基准",
    optimized: "SmartSwap 优化方案",
    noPlan: "完成交易参数后，直接生成实时交易基准与 SmartSwap 优化方案。",
    totalCost: "综合成本",
    receive: "预计到账",
    eta: "预计耗时",
    saving: "预计节省",
    strategy: "策略",
    waitCondition: "执行条件",
    boundary: "可执行成本边界",
    split: "拆分执行",
    noSplit: "无需拆分",
    delegate: "托管执行",
    delegated: "托管监控中",
    simulate: "模拟条件满足",
    report: "执行结果报告",
    actualCost: "实际成本",
    actualReceive: "实际到账",
    source: "数据来源",
    quoteCount: "报价数量",
    mock: "演示数据",
    maxCost: "最高成本",
    minReceive: "最低到账",
    maxSlippage: "最大滑点",
    expires: "有效期",
    statusMonitoring: "监控中",
    statusExecuted: "已执行",
    gas: "Gas 成本",
    bridge: "跨链费用",
    dex: "DEX 费用",
    slippageCost: "滑点成本",
    priceImpact: "价格影响",
    volatilityReserve: "波动预留",
    connectWallet: "连接钱包",
    disconnectWallet: "断开",
    walletConnected: "已连接",
    walletNetwork: "钱包网络",
    walletMissing: "未检测到浏览器钱包，请先安装 MetaMask 或兼容钱包。"
  },
  en: {
    eyebrow: "SmartSwap Agent",
    hero: "Let time make room for lower execution cost",
    subHero: "Reduce total swap and cross-chain execution cost with realtime baselines, lower-fee windows, and split execution.",
    light: "Light",
    dark: "Dark",
    language: "Language",
    theme: "Theme",
    task: "Trade task",
    agentGuide: "Agent guide",
    pending: "Incomplete",
    ready: "Ready",
    confirmed: "Confirmed",
    inputPlaceholder: "e.g. swap my ETH to USDT",
    send: "Send",
    form: "Controls",
    amount: "Amount",
    fromChain: "From network",
    fromToken: "From token",
    toChain: "Target network",
    toToken: "Target token",
    maxWait: "Wait time",
    generatePlan: "Generate plan",
    baseline: "Realtime baseline",
    optimized: "SmartSwap optimized plan",
    noPlan: "Complete the trade parameters, then generate the realtime baseline and SmartSwap optimized plan.",
    totalCost: "Total cost",
    receive: "Estimated receive",
    eta: "ETA",
    saving: "Estimated saving",
    strategy: "Strategy",
    waitCondition: "Execution condition",
    boundary: "Execution boundary",
    split: "Split execution",
    noSplit: "No split needed",
    delegate: "Delegate execution",
    delegated: "Monitoring delegated task",
    simulate: "Simulate condition met",
    report: "Execution report",
    actualCost: "Actual cost",
    actualReceive: "Actual receive",
    source: "Source",
    quoteCount: "Quotes",
    mock: "Demo data",
    maxCost: "Max cost",
    minReceive: "Min receive",
    maxSlippage: "Max slippage",
    expires: "Expires",
    statusMonitoring: "Monitoring",
    statusExecuted: "Executed",
    gas: "Gas",
    bridge: "Bridge fee",
    dex: "DEX fee",
    slippageCost: "Slippage",
    priceImpact: "Price impact",
    volatilityReserve: "Volatility reserve",
    connectWallet: "Connect wallet",
    disconnectWallet: "Disconnect",
    walletConnected: "Connected",
    walletNetwork: "Wallet network",
    walletMissing: "No browser wallet detected. Install MetaMask or a compatible wallet first."
  }
} satisfies Record<Language, Record<string, string>>;

const strategyLabel = {
  zh: {
    WAIT_FOR_LOW_FEE: "等待低费用窗口",
    SPLIT_EXECUTION: "大额拆分执行",
    WAIT_AND_SPLIT: "等待 + 拆分执行"
  },
  en: {
    WAIT_FOR_LOW_FEE: "Wait for lower fees",
    SPLIT_EXECUTION: "Split execution",
    WAIT_AND_SPLIT: "Wait + split"
  }
} as const;

async function postJson<T>(url: string, body: object): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data as T;
}

function taskSummary(intent: SwapIntent, language: Language) {
  if (language === "zh") return `${intent.amount} ${intent.fromToken} 从 ${intent.fromChain} 兑换为 ${intent.toChain} 的 ${intent.toToken}，最长等待 ${intent.maxWaitHours} 小时`;
  return `${intent.amount} ${intent.fromToken} from ${intent.fromChain} to ${intent.toToken} on ${intent.toChain}, wait up to ${intent.maxWaitHours}h`;
}

function isIntentReady(intent: SwapIntent) {
  const amount = Number(intent.amount);
  return Number.isFinite(amount) && amount > 0 && intent.maxWaitHours > 0;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function walletChainName(chainId: string | null) {
  if (chainId === "0x1") return "Ethereum";
  if (chainId === "0x2105") return "Base";
  if (chainId === "0xa4b1") return "Arbitrum";
  if (chainId === "0xa") return "Optimism";
  if (chainId === "0x89") return "Polygon";
  if (chainId === "0x38") return "BNB Chain";
  if (chainId === "0xa86a") return "Avalanche";
  if (!chainId) return "--";
  const numeric = Number.parseInt(chainId, 16);
  return Number.isFinite(numeric) ? `Chain ${numeric}` : chainId;
}

function supportedChainFromId(chainId: string | null): ChainName | null {
  if (chainId === "0x1") return "Ethereum";
  if (chainId === "0x2105") return "Base";
  if (chainId === "0xa4b1") return "Arbitrum";
  if (chainId === "0xa") return "Optimism";
  if (chainId === "0x89") return "Polygon";
  if (chainId === "0x38") return "BNB Chain";
  if (chainId === "0xa86a") return "Avalanche";
  return null;
}

function costLabel(key: string, language: Language) {
  const labels = copy[language];
  const map: Record<string, string> = {
    gas: labels.gas,
    bridge: labels.bridge,
    dex: labels.dex,
    slippage: labels.slippageCost,
    priceImpact: labels.priceImpact,
    volatilityReserve: labels.volatilityReserve
  };
  return map[key] ?? key;
}

function statusLabel(status: DelegatedTaskStatus, language: Language) {
  if (status === "Monitoring") return copy[language].statusMonitoring;
  if (status === "Executed") return copy[language].statusExecuted;
  return status;
}

function planNarrative(plan: OptimizedPlan, language: Language) {
  if (language === "en") {
    return { waitCondition: plan.waitCondition, rationale: plan.rationale };
  }

  if (plan.strategy === "WAIT_AND_SPLIT") {
    return {
      waitCondition: `等待 ${plan.routeSteps[0]?.fromChain ?? "源网络"} 费用进入低成本窗口后，拆分为 ${plan.splitCount} 笔执行。`,
      rationale: "当前实时交易的费用与价格影响都值得优化，SmartSwap 会同时监控低费窗口并拆分大额成交。"
    };
  }

  if (plan.strategy === "SPLIT_EXECUTION") {
    return {
      waitCondition: `拆分为 ${plan.splitCount} 笔执行，并控制单笔价格影响不超过 0.5%。`,
      rationale: "这笔交易规模较大，直接成交可能推高 DEX 价格影响，拆分执行可以降低综合成本。"
    };
  }

  return {
    waitCondition: `等待 ${plan.routeSteps[0]?.fromChain ?? "源网络"} Gas 或路由综合成本进入更低费用窗口。`,
    rationale: "当前交易规模不需要拆分，SmartSwap 主要通过监控低费用窗口来降低执行成本。"
  };
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--surface)] p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 font-display text-2xl text-[var(--ink)]">{value}</div>
    </div>
  );
}

function CostRows({ breakdown, language }: { breakdown: BaselinePlan["costBreakdown"]; language: Language }) {
  return (
    <div className="mt-4 grid gap-2 text-sm">
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between border-b border-[var(--line)] py-2">
          <span className="text-[var(--muted)]">{costLabel(key, language)}</span>
          <span className="font-semibold">{formatUsd(value)}</span>
        </div>
      ))}
    </div>
  );
}

function BaselineCard({ plan, language }: { plan: BaselinePlan; language: Language }) {
  const t = copy[language];
  return (
    <article className="ledger-border panel-depth bg-[var(--panel)] p-5">
      <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        <Clock3 className="h-4 w-4" />
        {t.baseline}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <PlanMetric label={t.totalCost} value={formatUsd(plan.totalCostUsd)} />
        <PlanMetric label={t.receive} value={plan.expectedReceiveAmount} />
        <PlanMetric label={t.eta} value={`${plan.estimatedTimeMinutes}m`} />
      </div>
      <CostRows breakdown={plan.costBreakdown} language={language} />
    </article>
  );
}

function OptimizedCard({
  plan,
  language,
  onDelegate,
  busy
}: {
  plan: OptimizedPlan;
  language: Language;
  onDelegate: () => void;
  busy: BusyState;
}) {
  const t = copy[language];
  const narrative = planNarrative(plan, language);
  return (
    <article className="ledger-border panel-depth bg-[var(--panel)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
            <ShieldCheck className="h-4 w-4" />
            {t.optimized}
          </div>
          <h2 className="mt-2 font-display text-4xl">{strategyLabel[language][plan.strategy]}</h2>
        </div>
        <button
          onClick={onDelegate}
          disabled={busy !== null}
          className="flex h-11 items-center justify-center gap-2 bg-[var(--ink)] px-4 font-semibold text-[var(--paper)] transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {busy === "delegate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
          {t.delegate}
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <PlanMetric label={t.totalCost} value={formatUsd(plan.totalCostUsd)} />
        <PlanMetric label={t.receive} value={plan.expectedReceiveAmount} />
        <PlanMetric label={t.saving} value={`${formatUsd(plan.expectedSavingUsd)} / ${formatPct(plan.expectedSavingPct)}`} />
        <PlanMetric label={t.split} value={plan.splitCount > 1 ? `${plan.splitCount}` : t.noSplit} />
      </div>

      <div className="mt-4 border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="font-semibold">{t.waitCondition}</div>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{narrative.waitCondition}</p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="font-semibold">{t.boundary}</div>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex justify-between"><span>{t.maxCost}</span><strong>{formatUsd(plan.boundary.maxTotalCostUsd)}</strong></div>
            <div className="flex justify-between"><span>{t.minReceive}</span><strong>{plan.boundary.minReceiveAmount}</strong></div>
            <div className="flex justify-between"><span>{t.maxSlippage}</span><strong>{plan.boundary.maxSlippagePct}%</strong></div>
            <div className="flex justify-between"><span>{t.expires}</span><strong>{plan.boundary.expiresInHours}h</strong></div>
          </div>
        </div>
        <div className="border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="font-semibold">{t.strategy}</div>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{narrative.rationale}</p>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh");
  const [theme, setTheme] = useState<Theme>("light");
  const [intent, setIntent] = useState<SwapIntent>(defaultIntent);
  const [agentDraft, setAgentDraft] = useState<AgentDraft>({});
  const [agentInput, setAgentInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "agent", content: "告诉我想交换的币种、数量和网络；你也可以直接使用控件选择。" }
  ]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const [taskConfirmed, setTaskConfirmed] = useState(false);
  const [comparison, setComparison] = useState<PlanComparison | null>(null);
  const [quotes, setQuotes] = useState<RouteQuote[]>([]);
  const [source, setSource] = useState<"lifi" | "mock" | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [delegatedTask, setDelegatedTask] = useState<DelegatedTask | null>(null);
  const [executionReport, setExecutionReport] = useState<ExecutionReport | null>(null);
  const [walletAccount, setWalletAccount] = useState<string | null>(null);
  const [walletChainId, setWalletChainId] = useState<string | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>(null);
  const [error, setError] = useState<string | null>(null);
  const t = copy[language];
  const readyToGenerate = isIntentReady(intent);
  const taskStatus = !readyToGenerate ? t.pending : taskConfirmed ? t.confirmed : t.ready;

  useEffect(() => {
    const chat = chatScrollRef.current;
    if (!chat) return;
    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider?.on) return;

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = Array.isArray(args[0]) ? (args[0] as string[]) : [];
      setWalletAccount(accounts[0] ?? null);
      if (!accounts[0]) setWalletError(null);
    };
    const handleChainChanged = (...args: unknown[]) => {
      const nextChainId = typeof args[0] === "string" ? args[0] : null;
      setWalletChainId(nextChainId);
      const supported = supportedChainFromId(nextChainId);
      if (supported) updateIntent("fromChain", supported);
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  function updateIntent<K extends keyof SwapIntent>(key: K, value: SwapIntent[K]) {
    setIntent((current) => ({ ...current, [key]: value }));
    setTaskConfirmed(false);
    setComparison(null);
    setDelegatedTask(null);
    setExecutionReport(null);
  }

  async function connectWallet() {
    setWalletError(null);
    const provider = window.ethereum;
    if (!provider) {
      setWalletError(t.walletMissing);
      return;
    }

    setWalletBusy(true);
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      setWalletAccount(accounts[0] ?? null);
      setWalletChainId(chainId);
      const supported = supportedChainFromId(chainId);
      if (supported) updateIntent("fromChain", supported);
    } catch (err) {
      setWalletError(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setWalletBusy(false);
    }
  }

  function disconnectWallet() {
    setWalletAccount(null);
    setWalletChainId(null);
    setWalletError(null);
  }

  async function sendAgentMessage() {
    const text = agentInput.trim();
    if (!text || busy) return;
    const parsed = parseAgentInput(text);
    const nextDraft = mergeAgentDraft(agentDraft, parsed, text);
    const complete = completeIntent(nextDraft);
    setAgentInput("");
    setAgentDraft(nextDraft);
    if (complete) {
      setIntent(complete);
      setTaskConfirmed(parsed.confirmed ?? false);
      setComparison(null);
      setDelegatedTask(null);
      setExecutionReport(null);
    }
    const agentReply = complete && parsed.confirmed
      ? language === "zh"
        ? `任务已确认：${taskSummary(complete, language)}。可以点击生成方案。`
        : `Task confirmed: ${taskSummary(complete, language)}. You can generate a plan now.`
      : complete
      ? language === "zh"
        ? `已更新：${taskSummary(complete, language)}。参数已完整，可以输入“确认”完成任务确认，也可以直接点击生成方案。`
        : `Updated: ${taskSummary(complete, language)}. Type "confirm" to confirm it, or generate a plan directly.`
      : nextAgentPrompt(nextDraft, language);
    setChatMessages((messages) => [
      ...messages,
      { role: "user", content: text },
      { role: "agent", content: agentReply }
    ]);
  }

  async function generatePlan(targetIntent = intent) {
    if (!isIntentReady(targetIntent)) return;
    setBusy("plan");
    setError(null);
    setWarning(null);
    setDelegatedTask(null);
    setExecutionReport(null);
    try {
      const quoteData = await postJson<QuoteResponse>("/api/routes/quote", { intent: targetIntent });
      const planData = await postJson<PlanResponse>("/api/plans/generate", { intent: targetIntent, quotes: quoteData.quotes });
      setQuotes(quoteData.quotes);
      setSource(quoteData.source);
      setWarning(quoteData.warning ?? null);
      setComparison({ task: planData.task, baselinePlan: planData.baselinePlan, optimizedPlan: planData.optimizedPlan });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setBusy(null);
    }
  }

  async function delegateExecution() {
    if (!comparison) return;
    setBusy("delegate");
    setError(null);
    try {
      const data = await postJson<{ delegatedTask: DelegatedTask }>("/api/execution/delegate", comparison);
      setDelegatedTask(data.delegatedTask);
      setExecutionReport(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delegate execution");
    } finally {
      setBusy(null);
    }
  }

  async function simulateExecution() {
    if (!delegatedTask) return;
    setBusy("execute");
    setError(null);
    try {
      const data = await postJson<{ report: ExecutionReport }>("/api/execution/simulate", { delegatedTask });
      setExecutionReport(data.report);
      setDelegatedTask({ ...delegatedTask, status: "Executed" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to simulate execution");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main data-theme={theme === "dark" ? "dark" : undefined} className="theme-shell min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <div className="fixed right-4 top-4 z-30 flex flex-wrap justify-end gap-2">
        <div className="ledger-border glass-control flex items-center gap-1 p-1">
          <Languages className="mx-2 h-4 w-4 text-[var(--muted)]" />
          {(["zh", "en"] as Language[]).map((option) => (
            <button key={option} onClick={() => setLanguage(option)} className={`h-8 px-3 text-sm font-semibold ${language === option ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--muted)]"}`}>
              {option === "zh" ? "中文" : "EN"}
            </button>
          ))}
        </div>
        <div className="ledger-border glass-control flex items-center gap-1 p-1">
          {theme === "dark" ? <Moon className="mx-2 h-4 w-4 text-[var(--muted)]" /> : <SunMedium className="mx-2 h-4 w-4 text-[var(--muted)]" />}
          {(["light", "dark"] as Theme[]).map((option) => (
            <button key={option} onClick={() => setTheme(option)} className={`h-8 px-3 text-sm font-semibold ${theme === option ? "bg-[var(--ink)] text-[var(--paper)]" : "text-[var(--muted)]"}`}>
              {option === "light" ? t.light : t.dark}
            </button>
          ))}
        </div>
      </div>
      {walletError && (
        <div className="fixed right-4 top-16 z-30 max-w-xs border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--danger)] shadow-sm">
          {walletError}
        </div>
      )}

      <header className="hairline-accent mx-auto w-full max-w-7xl pb-5 pt-16">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            <Route className="h-4 w-4" />
            {t.eyebrow}
          </div>
          <h1 className="max-w-3xl font-display text-5xl leading-[0.9] sm:text-6xl lg:text-7xl">{t.hero}</h1>
          <div className="mt-4 flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">{t.subHero}</p>
            <div className="ledger-border glass-control flex min-h-11 w-fit items-center gap-2 p-1 lg:ml-auto">
              {walletAccount ? (
                <>
                  <div className="flex items-center gap-2 px-2 text-sm">
                    <span className="h-2 w-2 bg-[var(--accent)]" />
                    <span className="font-semibold text-[var(--ink)]">{shortAddress(walletAccount)}</span>
                    <span className="hidden text-[var(--muted)] sm:inline">{walletChainName(walletChainId)}</span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="h-9 border-l border-[var(--line)] px-3 text-sm font-semibold text-[var(--muted)] transition hover:text-[var(--ink)]"
                  >
                    {t.disconnectWallet}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => void connectWallet()}
                  disabled={walletBusy}
                  className="flex h-9 items-center gap-2 px-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface)] disabled:opacity-50"
                >
                  {walletBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
                  {t.connectWallet}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[390px_1fr]">
        <aside className="ledger-border panel-depth h-fit bg-[var(--panel)] p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">{t.task}</h2>
            <span className={`border px-2 py-1 text-xs font-semibold ${readyToGenerate ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--line)] text-[var(--muted)]"}`}>
              {taskStatus}
            </span>
          </div>

          <div className="border border-[var(--line)] bg-[var(--surface)] p-3">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{t.agentGuide}</div>
            <div ref={chatScrollRef} className="grid max-h-44 scroll-pb-3 gap-2 overflow-y-auto pr-1">
              {chatMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`max-w-[92%] border px-3 py-2 text-sm leading-6 ${message.role === "agent" ? "justify-self-start border-[var(--line)] bg-[var(--panel)]" : "justify-self-end border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"}`}>
                  {message.content}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input
                value={agentInput}
                onChange={(event) => setAgentInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void sendAgentMessage();
                  }
                }}
                placeholder={t.inputPlaceholder}
                className="h-11 border border-[var(--line)] bg-[var(--panel)] px-3 text-sm outline-none focus:border-[var(--accent)]"
              />
              <button onClick={() => void sendAgentMessage()} disabled={!agentInput.trim() || busy !== null} className="flex h-11 w-11 items-center justify-center bg-[var(--ink)] text-[var(--paper)] disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{t.form}</div>
            <label className="grid gap-1 text-sm font-semibold">
              {t.amount}
              <input value={intent.amount} onChange={(event) => updateIntent("amount", event.target.value)} className="h-11 border border-[var(--line)] bg-[var(--surface)] px-3 outline-none focus:border-[var(--accent)]" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                {t.fromChain}
                <select value={intent.fromChain} onChange={(event) => updateIntent("fromChain", event.target.value as ChainName)} className="h-11 border border-[var(--line)] bg-[var(--surface)] px-3">
                  {chainOptions.map((chain) => <option key={chain}>{chain}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {t.fromToken}
                <select value={intent.fromToken} onChange={(event) => updateIntent("fromToken", event.target.value as TokenSymbol)} className="h-11 border border-[var(--line)] bg-[var(--surface)] px-3">
                  {tokenOptions.map((token) => <option key={token}>{token}</option>)}
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm font-semibold">
                {t.toChain}
                <select value={intent.toChain} onChange={(event) => updateIntent("toChain", event.target.value as ChainName)} className="h-11 border border-[var(--line)] bg-[var(--surface)] px-3">
                  {chainOptions.map((chain) => <option key={chain}>{chain}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">
                {t.toToken}
                <select value={intent.toToken} onChange={(event) => updateIntent("toToken", event.target.value as TokenSymbol)} className="h-11 border border-[var(--line)] bg-[var(--surface)] px-3">
                  {tokenOptions.map((token) => <option key={token}>{token}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              {t.maxWait}: {intent.maxWaitHours}h
              <input type="range" min="1" max="168" value={intent.maxWaitHours} onChange={(event) => updateIntent("maxWaitHours", Number(event.target.value))} className="accent-[var(--accent)]" />
            </label>
          </div>

          <div className="mt-4">
            <button onClick={() => void generatePlan()} disabled={!readyToGenerate || busy !== null} className="flex h-12 w-full items-center justify-center gap-2 bg-[var(--ink)] px-3 font-semibold text-[var(--paper)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50">
              {busy === "plan" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {t.generatePlan}
            </button>
          </div>
          {error && <div className="mt-4 border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--danger)]">{error}</div>}
        </aside>

        <div className="grid gap-5">
          {!comparison ? (
            <div className="ledger-border panel-depth grid min-h-80 place-items-center bg-[var(--panel)] p-8 text-center">
              <div>
                <ArrowRightLeft className="mx-auto mb-4 h-10 w-10 text-[var(--accent)]" />
                <div className="font-display text-3xl">{t.noPlan}</div>
                <div className="mt-3 text-sm text-[var(--muted)]">{taskSummary(intent, language)}</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1 font-semibold">{t.source}: {source === "lifi" ? "LI.FI" : t.mock}</span>
                <span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1 font-semibold">{t.quoteCount}: {quotes.length}</span>
                {warning && <span className="border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-[var(--warning)]">{warning}</span>}
              </div>
              <BaselineCard plan={comparison.baselinePlan} language={language} />
              <OptimizedCard plan={comparison.optimizedPlan} language={language} onDelegate={() => void delegateExecution()} busy={busy} />
            </>
          )}

          {delegatedTask && (
            <section className="ledger-border panel-depth bg-[var(--panel)] p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{t.delegated}</div>
                  <div className="mt-1 font-display text-3xl">{statusLabel(delegatedTask.status, language)}</div>
                </div>
                <button onClick={() => void simulateExecution()} disabled={busy !== null || delegatedTask.status === "Executed"} className="flex h-11 items-center justify-center gap-2 bg-[var(--ink)] px-4 font-semibold text-[var(--paper)] disabled:opacity-50">
                  {busy === "execute" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {t.simulate}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{comparison ? planNarrative(comparison.optimizedPlan, language).waitCondition : ""}</p>
            </section>
          )}

          {executionReport && (
            <section className="ledger-border panel-depth bg-[var(--panel)] p-5">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                <CheckCircle2 className="h-4 w-4" />
                {t.report}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <PlanMetric label={t.actualCost} value={formatUsd(executionReport.actualTotalCostUsd)} />
                <PlanMetric label={t.actualReceive} value={executionReport.actualReceiveAmount} />
                <PlanMetric label={t.saving} value={formatUsd(executionReport.savingVsBaselineUsd)} />
              </div>
              <div className="mt-4 grid gap-2">
                {executionReport.splitRecords.map((record) => (
                  <div key={record.index} className="grid gap-2 border border-[var(--line)] bg-[var(--surface)] p-3 text-sm sm:grid-cols-[60px_1fr_1fr_1fr]">
                    <strong>#{record.index}</strong>
                    <span>{record.amount} {intent.fromToken}</span>
                    <span>{formatUsd(record.estimatedCostUsd)}</span>
                    <span>{record.estimatedReceiveAmount} {intent.toToken}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
