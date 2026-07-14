// Static content for the AI-First PM learning tracker.
// Edit items here -- UI reads this file directly.

export type ItemKind = "learn" | "read" | "do";

export type PlanItem = {
  id: string;
  kind: ItemKind;
  text: string;
};

export type PlanSection = {
  id: string;
  tag: string;
  title: string;
  why: string;
  items: PlanItem[];
};

export type ChecklistPlanData = {
  id: string;
  title: string;
  subtitle: string;
  pricingNote: string;
  sections: PlanSection[];
};

export const AI_PM_PLAN: ChecklistPlanData = {
  id: "ai-pm-v1",
  title: "AI-First PM",
  subtitle: "Skill gaps for AI-first PM interviews & FDE roles",
  pricingNote:
    "Pricing figures move fast -- verify live pricing before quoting numbers in an interview.",
  sections: [
    {
      id: "gap1",
      tag: "Gap 1",
      title: "LLM fundamentals (the real kind)",
      why: 'Not "I used ChatGPT." Be ready to explain tokenisation, context windows, RAG vs fine-tuning, hallucination mitigation, and why you\'d pick one model over another.',
      items: [
        { id: "g1-1", kind: "read", text: "Watch Andrej Karpathy's \"Intro to LLMs\" on YouTube (~1 hour)" },
        { id: "g1-2", kind: "read", text: "Read \"Building LLM-powered applications\" in the Anthropic docs" },
        { id: "g1-3", kind: "do",   text: "Write a one-pager comparing Claude vs GPT vs Gemini on latency, cost, context window, and safety -- for a real use case like compliance classification" },
      ],
    },
    {
      id: "gap2",
      tag: "Gap 2",
      title: "Human-in-the-loop (HITL) system design",
      why: "Knowing when to trust the model and when to escalate. Expect to design one live.",
      items: [
        { id: "g2-1", kind: "learn", text: "Confidence thresholds, precision/recall tradeoffs, false-positive vs false-negative cost" },
        { id: "g2-2", kind: "do",    text: "Design a HITL flow for \"AI flags unsafe product listings, human reviews flagged items\" -- with escalation rules, SLAs, and feedback loops" },
      ],
    },
    {
      id: "gap3",
      tag: "Gap 3",
      title: "AI evaluation frameworks",
      why: "How do you know your LLM is working? You're expected to define this.",
      items: [
        { id: "g3-1", kind: "learn", text: "Know what precision, recall, F1, BLEU, and ROUGE each measure" },
        { id: "g3-2", kind: "learn", text: "Evals -- building test sets, measuring drift, catching regressions" },
        { id: "g3-3", kind: "do",    text: "Build a simple eval set for your voice-ordering product -- 20 test cases, expected outputs, scoring rubric" },
      ],
    },
    {
      id: "gap4",
      tag: "Gap 4",
      title: "Cost / latency tradeoffs",
      why: "Know rough cost per model and that latency matters for real-time (voice) but less for async (compliance batch jobs). Re-verify current prices before quoting.",
      items: [
        { id: "g4-1", kind: "read", text: "Spend ~1 hour on each provider's pricing page, mapping cost per use case" },
        { id: "g4-2", kind: "do",   text: "Build a cost model for a hypothetical 1M compliance checks/month -- which model, and why" },
      ],
    },
    {
      id: "gap5",
      tag: "Gap 5",
      title: "Responsible AI / governance",
      why: "Expect to be asked how you'd govern a model making compliance decisions.",
      items: [
        { id: "g5-1", kind: "learn", text: "Bias-detection basics, fairness metrics, and model cards" },
        { id: "g5-2", kind: "read",  text: "Anthropic's Responsible Scaling Policy and Google's PAIR guidelines" },
        { id: "g5-3", kind: "do",    text: "Write a one-page AI governance framework for the voice-ordering product" },
      ],
    },
    {
      id: "stretch",
      tag: "Stretch",
      title: "The Forward Deployed Engineer connection",
      why: "FDE roles (Palantir, Glean, Harvey, Anthropic) need all of the above PLUS the ability to build working prototypes. You already have: prompt engineering, MCP integrations, n8n automation, product thinking. Realistic timeline to be competitive: 3-4 months of deliberate practice.",
      items: [
        { id: "s1", kind: "do", text: "Python basics -- just enough to call APIs and parse JSON (~2 weeks)" },
        { id: "s2", kind: "do", text: "Build evals (reuse the Gap 3 eval set as a starting point)" },
        { id: "s3", kind: "do", text: "Deploy a simple agent end-to-end" },
      ],
    },
  ],
};
