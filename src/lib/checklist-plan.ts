// Shared types for DB-backed checklist learning plans.

export type ItemKind = "learn" | "read" | "do";

export const KIND_META: Record<ItemKind, { label: string; className: string }> = {
  learn: { label: "Learn",    className: "bg-indigo-50 text-indigo-600" },
  read:  { label: "Read",     className: "bg-green-50 text-green-700"   },
  do:    { label: "Practice", className: "bg-orange-50 text-orange-600" },
};

export type ChecklistItem = {
  id: string;
  kind: ItemKind;
  text: string;
  done: boolean;
};

export type ChecklistSection = {
  id: string;
  tag: string;
  title: string;
  why: string;
  items: ChecklistItem[];
};

export type ChecklistPlan = {
  id: string;
  title: string;
  subtitle: string;
  type: "checklist";
  sections: ChecklistSection[];
  createdAt: string;
};

export function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function planProgress(sections: ChecklistSection[]) {
  const all = sections.flatMap((s) => s.items);
  return { done: all.filter((i) => i.done).length, total: all.length };
}
