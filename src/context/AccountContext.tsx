"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ACCOUNTS_KEY, ACTIVE_ACCOUNT_KEY, colorForIndex, initials } from "@/lib/accounts";
import type { Account, AccountType } from "@/lib/accounts";

// ── Context shape ─────────────────────────────────────────────────────────────

type AccountContextValue = {
  accounts: Account[];
  /** IDs of accounts whose items are currently shown */
  visibleIds: string[];
  /** The account new items are created under */
  activeAccountId: string;
  setActiveAccountId: (id: string) => void;
  addAccount: (email: string, name: string, type: AccountType) => void;
  removeAccount: (id: string) => void;
  toggleVisibility: (id: string) => void;
  updateType: (id: string, type: AccountType) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function useAccounts() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccounts must be used inside AccountProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `acct_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function AccountProvider({
  children,
  primaryEmail,
  primaryName,
}: {
  children: React.ReactNode;
  primaryEmail?: string | null;
  primaryName?: string | null;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [activeAccountId, setActiveAccountIdState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage, seed primary account from session
  useEffect(() => {
    const stored: Account[] = (() => {
      try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || "[]"); } catch { return []; }
    })();

    // Ensure primary account exists and is up to date
    const primaryExists = stored.find((a) => a.isPrimary);
    let accounts: Account[];

    if (primaryExists) {
      // Keep existing accounts but refresh primary's email/name from session
      accounts = stored.map((a) =>
        a.isPrimary
          ? { ...a, email: primaryEmail ?? a.email, name: primaryName ?? a.name }
          : a
      );
    } else {
      const primary: Account = {
        id: buildId(),
        email: primaryEmail ?? "",
        name: primaryName ?? primaryEmail?.split("@")[0] ?? "Me",
        type: "professional",
        isPrimary: true,
        isVisible: true,
        color: colorForIndex(0),
      };
      accounts = [primary, ...stored];
    }

    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    setAccounts(accounts);

    const storedActive = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
    const activeExists = accounts.find((a) => a.id === storedActive);
    const defaultActive = accounts.find((a) => a.type === "professional" && a.isVisible) ?? accounts[0];
    setActiveAccountIdState(activeExists ? storedActive! : defaultActive?.id ?? "");

    setHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persist(next: Account[]) {
    setAccounts(next);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  }

  function setActiveAccountId(id: string) {
    setActiveAccountIdState(id);
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
  }

  const addAccount = useCallback((email: string, name: string, type: AccountType) => {
    const newAcct: Account = {
      id: buildId(),
      email,
      name: name || email.split("@")[0],
      type,
      isPrimary: false,
      isVisible: type === "professional", // professional visible by default, personal off
      color: colorForIndex(accounts.length),
    };
    persist([...accounts, newAcct]);
  }, [accounts]);

  const removeAccount = useCallback((id: string) => {
    const next = accounts.filter((a) => a.id !== id || a.isPrimary);
    persist(next);
    if (activeAccountId === id) {
      const fallback = next.find((a) => a.isVisible) ?? next[0];
      if (fallback) setActiveAccountId(fallback.id);
    }
  }, [accounts, activeAccountId]);

  const toggleVisibility = useCallback((id: string) => {
    const next = accounts.map((a) => a.id === id ? { ...a, isVisible: !a.isVisible } : a);
    persist(next);
    // If we just hid the active account, switch active to a still-visible one
    const toggled = next.find((a) => a.id === id);
    if (toggled && !toggled.isVisible && activeAccountId === id) {
      const fallback = next.find((a) => a.isVisible);
      if (fallback) setActiveAccountId(fallback.id);
    }
  }, [accounts, activeAccountId]);

  const updateType = useCallback((id: string, type: AccountType) => {
    persist(accounts.map((a) => a.id === id ? { ...a, type } : a));
  }, [accounts]);

  const visibleIds = useMemo(() => accounts.filter((a) => a.isVisible).map((a) => a.id), [accounts]);

  if (!hydrated) return null;

  return (
    <AccountContext.Provider value={{ accounts, visibleIds, activeAccountId, setActiveAccountId, addAccount, removeAccount, toggleVisibility, updateType }}>
      {children}
    </AccountContext.Provider>
  );
}
