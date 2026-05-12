export type AccountType = "personal" | "professional";

export type Account = {
  id: string;
  email: string;
  name: string;
  type: AccountType;
  isPrimary: boolean;   // derived from NextAuth session
  isVisible: boolean;   // whether this account's items are shown
  color: string;        // avatar background
};

export const ACCOUNTS_KEY = "suru-accounts-v1";
export const ACTIVE_ACCOUNT_KEY = "suru-active-account-v1"; // accountId for new items

export const TYPE_META: Record<AccountType, { label: string; pill: string; dot: string }> = {
  professional: { label: "Professional", pill: "bg-coral/10 text-coral",           dot: "bg-coral"         },
  personal:     { label: "Personal",     pill: "bg-surface-card text-ink-muted",   dot: "bg-ink-soft"      },
};

const AVATAR_COLORS = ["#b8694e", "#6b7280", "#7c6d9e", "#4a7c6f", "#9e6b4a"];

export function colorForIndex(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

export function initials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "??";
}
