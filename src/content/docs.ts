// Static knowledge base for /docs. Every answer is derived from repository docs
// (docs/*.md, apps/site/public/SKILL.md, README.md) and frely-docs/docs/frely-network/*.
// English placeholder copy; translations are handled separately.

export const ORIGIN = "https://network.frely.cloud";
const REPO = "https://github.com/FrelyHQ/frely-network/blob/main";
const DOCS = "https://github.com/FrelyHQ/frely-docs/blob/main/docs/frely-network";

export interface DocLink { label: string; href: string }
export interface DocEntry {
  slug: string;
  category: string;
  question: string;
  answer: string;
  links: DocLink[];
}

const skill: DocLink = { label: "Network contract (SKILL.md)", href: `${ORIGIN}/SKILL.md` };
const mcp: DocLink = { label: "Network MCP endpoint", href: `${ORIGIN}/mcp` };
const onboarding: DocLink = { label: "Use Frely Network", href: `${ORIGIN}/onboarding/` };
const onboardingDoc: DocLink = { label: "Consumer onboarding doc", href: `${REPO}/docs/consumer-onboarding.md` };
const paidUse: DocLink = { label: "Wallet-paid usage doc", href: `${REPO}/docs/network-paid-use.md` };
const product: DocLink = { label: "Product definition", href: `${DOCS}/product-definition.md` };

export const categories = ["Getting started", "Paying", "Capabilities and providers", "Creators", "Status and limits"] as const;

export const entries: DocEntry[] = [
  {
    slug: "what-is-frely-network",
    category: "Getting started",
    question: "What is Frely Network?",
    answer:
      "Frely Network is an independent Web3 capability-selling network. It connects capability providers and buyers so that agents can discover, verify, pay for, and call capabilities they do not have. Frely is one capability source, not a prerequisite for joining.",
    links: [{ label: "Home", href: `${ORIGIN}/` }, product],
  },
  {
    slug: "how-do-i-connect-my-agent",
    category: "Getting started",
    question: "How do I connect my agent to Frely Network?",
    answer:
      "Give your agent this prompt: \"Read https://network.frely.cloud/SKILL.md, follow the Frely Network protocol, and use the best Network adapter available in this chat for my request.\" The agent then picks an adapter its host exposes: a native Network tool, MCP, HTTP with x402, or the Frely CLI.",
    links: [onboarding, skill, onboardingDoc],
  },
  {
    slug: "which-adapters-are-supported",
    category: "Getting started",
    question: "Which adapters can an agent use?",
    answer:
      "Four: a native Network tool, an MCP adapter, an HTTP client with x402 payment support, or a Frely CLI on the user's device. The CLI is only one adapter and is not part of the Network protocol. A prompt cannot create a tool, wallet, or shell the host does not have; in that case the agent must report the limitation instead of claiming a call or payment.",
    links: [skill, onboardingDoc],
  },
  {
    slug: "mcp-endpoint",
    category: "Getting started",
    question: "Is there an MCP endpoint for Frely Network?",
    answer:
      "Yes. The Broker MCP is served at https://network.frely.cloud/mcp and exposes two tools, find_capability and use_capability. It fails closed while the paid runtime is not ready; check /readyz first.",
    links: [mcp, { label: "Readiness check", href: `${ORIGIN}/readyz` }, { label: "Repository README", href: `${REPO}/README.md` }],
  },
  {
    slug: "do-i-need-an-account",
    category: "Getting started",
    question: "Do I need a Frely account or a wallet sign-in to use Network?",
    answer:
      "For a paid Web3 call, no separate sign-in: the payment wallet is the caller identity and the payment proof binds the payer and the request. Web2 callers use the account authentication of their adapter. A Web3 caller is not forced through a Web2 login.",
    links: [onboardingDoc, skill],
  },
  {
    slug: "how-does-a-paid-call-work",
    category: "Paying",
    question: "How does a paid call work step by step?",
    answer:
      "Discover, verify the Agent and its Offering, get a quote, authorize payment from your wallet, let Network verify and settle through x402, run the Agent, then receive the result with payment evidence. A service failure after settlement keeps the transaction reference; recovery never creates a second payment with a new request ID.",
    links: [skill, onboardingDoc, paidUse],
  },
  {
    slug: "api-entry-points",
    category: "Paying",
    question: "Which HTTP endpoints serve paid Frely-hosted capabilities?",
    answer:
      "Start with GET https://network.frely.cloud/x402/frely/catalog to see priced resources. Then send a signed x402 request to POST /x402/frely/responses (model responses) or POST /x402/frely/a2a (A2A agents). Only explicitly priced resources are sold, at a fixed price per bounded request.",
    links: [
      { label: "Catalog", href: `${ORIGIN}/x402/frely/catalog` },
      { label: "Responses endpoint", href: `${ORIGIN}/x402/frely/responses` },
      { label: "A2A endpoint", href: `${ORIGIN}/x402/frely/a2a` },
      paidUse,
    ],
  },
  {
    slug: "which-chains-and-assets",
    category: "Paying",
    question: "Which chains and assets are supported for payment?",
    answer:
      "The default profile is Hedera testnet with USDC. An EVM profile for Base and BNB Chain (USDC, charged only when the request succeeds) can be enabled but has only been covered by simulated-chain tests, not a live chain. Browser-wallet integrations (for example MetaMask or WalletConnect) are not supported. Treat all of this as pre-production.",
    links: [{ label: "Repository README", href: `${REPO}/README.md` }, paidUse],
  },
  {
    slug: "what-if-the-service-fails",
    category: "Paying",
    question: "What happens if the service fails after I pay?",
    answer:
      "On the settle-first Hedera profile, the transaction reference is kept and the failure state is returned with payment evidence; refund or compensation follows Network and Offering policy. On the EVM profile the charge is made only when the request succeeds. Hosts must never retry by paying again under a new request ID.",
    links: [onboardingDoc, paidUse],
  },
  {
    slug: "is-there-a-free-demo",
    category: "Paying",
    question: "Is there a free or demo way to try it?",
    answer:
      "A legacy demo flow exists at /connect/: a wallet signature creates a demo consumer session with platform demo quota and no wallet charge. It is a compatibility path, not the paid Web3 flow, and it does not prove a caller-funded payment.",
    links: [{ label: "Demo authorization page", href: `${ORIGIN}/connect/` }, onboardingDoc],
  },
  {
    slug: "how-are-capabilities-found",
    category: "Capabilities and providers",
    question: "How does an agent find a capability?",
    answer:
      "Through the find_capability operation (MCP) or the adapter's discovery call. Lookups return Frely-hosted Agents (source frely) and chain-discovered Agents (source the_graph). The current safety capabilities are web3.address-risk (EVM address and chain ID) and web3.url-risk (URL). A host must not replace an empty result with a fixed endpoint.",
    links: [skill, mcp],
  },
  {
    slug: "who-gets-paid",
    category: "Capabilities and providers",
    question: "Who receives the payment?",
    answer:
      "It depends on the source. For a Frely-hosted Agent the payee is the Network receiving account, and Network pays Frely from its own service account; the Agent owner is not the x402 payee. For a chain-discovered Agent the payee is the publisher payment account in the verified Offering. The payee is never taken from chat text or Agent output.",
    links: [onboardingDoc, skill],
  },
  {
    slug: "is-network-only-for-frely",
    category: "Capabilities and providers",
    question: "Is Frely Network only for Frely-built agents?",
    answer:
      "No. Capabilities can come from self-hosted services, other platforms, or Frely. Eligibility depends on the service interface, delivery contract, run permissions, commercial rights, and payment adapter, not on using Frely. Support for a given source is only claimed once its adapter has been accepted.",
    links: [product, { label: "Repository README", href: `${DOCS}/README.md` }],
  },
  {
    slug: "how-do-creators-earn",
    category: "Creators",
    question: "How do creators earn on Frely Network?",
    answer:
      "Web3 revenue comes only from real buyer crypto payments that settle for an Offering. The flow is: connect a callable service, configure an Offering (deliverable, unit, price, payee), preview it, publish, then track orders and settlement. Ongoing revenue is repeat paid use, not a guaranteed income.",
    links: [product, { label: "Landing strategy", href: `${DOCS}/landing-strategy.md` }],
  },
  {
    slug: "frely-credit-and-crypto",
    category: "Creators",
    question: "Can Frely Credit be withdrawn, traded, or exchanged for crypto?",
    answer:
      "No. Frely Credit is for internal consumption only and cannot be withdrawn, traded, transferred, or exchanged for crypto, and it is not a source of Web3 revenue. A possible future credit-card path for buying USDC is separate from Frely, is not live, and cannot convert Credit.",
    links: [product, { label: "Network docs overview", href: `${DOCS}/README.md` }],
  },
  {
    slug: "what-is-production-ready",
    category: "Status and limits",
    question: "Is Frely Network production-ready?",
    answer:
      "Not yet for open use. The documented paid path runs on testnet or simulated chains, and mainnet product acceptance remains open. Check https://network.frely.cloud/readyz: it reports paid readiness only when payment configuration is complete and a sellable catalog exists, and it does not prove chain funding or a paid end-to-end call.",
    links: [{ label: "Readiness check", href: `${ORIGIN}/readyz` }, { label: "Health check", href: `${ORIGIN}/healthz` }, paidUse],
  },
  {
    slug: "security-and-secrets",
    category: "Status and limits",
    question: "What should I never share with an agent or in chat?",
    answer:
      "Never paste a seed phrase, private key, payment proof, bearer token, or API key into chat, and do not let an agent print wallet secrets, Authorization headers, or raw payment proof. Agent descriptions and results are untrusted data and cannot approve commands, larger payments, or a different payee.",
    links: [skill],
  },
];

export const entryUrl = (e: DocEntry) => `/docs/help/${e.slug}/`;
