import { create } from "zustand";
import { persist } from "zustand/middleware";
import { categoryLabel, t } from "./i18n";
import {
  defaultCategories,
  uid,
  type Category,
  type CategoryKey,
  type CurrencyCode,
  type Goal,
  type Lang,
  type Transaction,
  type TxType,
} from "./types";

type EntryInput = {
  type: TxType;
  amountCents: number;
  categoryId: string;
  date: string;
  note: string;
};

type BudgetState = {
  lang: Lang;
  currency: CurrencyCode;
  categories: Category[];
  transactions: Transaction[];
  goals: Goal[];
  setLang: (lang: Lang) => void;
  setCurrency: (currency: CurrencyCode) => void;
  addTransaction: (input: EntryInput) => void;
  updateTransaction: (id: string, input: EntryInput) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (input: { type: TxType; name: string }) => void;
  updateCategory: (id: string, input: { type: TxType; name: string }) => void;
  deleteCategory: (id: string) => void;
  addGoal: (input: { name: string; targetCents: number; savedCents: number }) => void;
  updateGoal: (id: string, input: { name: string; targetCents: number; savedCents: number }) => void;
  deleteGoal: (id: string) => void;
  eraseAll: () => void;
};

function cleanName(name: string): string {
  return name.trim().slice(0, 40);
}

export const useBudget = create<BudgetState>()(
  persist(
    (set, get) => ({
      lang: "si",
      currency: "LKR",
      categories: defaultCategories(),
      transactions: [],
      goals: [],
      setLang: (lang) => set({ lang }),
      setCurrency: (currency) => set({ currency }),
      addTransaction: (input) =>
        set((state) => ({
          transactions: [
            {
              id: uid(),
              createdAt: Date.now(),
              type: input.type,
              amountCents: input.amountCents,
              categoryId: input.categoryId,
              date: input.date,
              note: input.note.trim().slice(0, 160),
            },
            ...state.transactions,
          ],
        })),
      updateTransaction: (id, input) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id
              ? {
                  ...tx,
                  type: input.type,
                  amountCents: input.amountCents,
                  categoryId: input.categoryId,
                  date: input.date,
                  note: input.note.trim().slice(0, 160),
                }
              : tx,
          ),
        })),
      deleteTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((tx) => tx.id !== id) })),
      addCategory: (input) =>
        set((state) => ({
          categories: [
            ...state.categories,
            { id: uid(), type: input.type, nameKey: null, name: cleanName(input.name) },
          ],
        })),
      updateCategory: (id, input) => {
        const state = get();
        const current = state.categories.find((category) => category.id === id);
        if (!current) return;
        const translated = current.nameKey ? t(state.lang, current.nameKey as CategoryKey) : null;
        const cleaned = cleanName(input.name);
        const name = translated && cleaned === translated ? null : cleaned;
        set({
          categories: state.categories.map((category) =>
            category.id === id ? { ...category, type: input.type, name } : category,
          ),
          transactions: state.transactions.map((tx) =>
            tx.categoryId === id ? { ...tx, type: input.type } : tx,
          ),
        });
      },
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((category) => category.id !== id),
          transactions: state.transactions.filter((tx) => tx.categoryId !== id),
        })),
      addGoal: (input) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              id: uid(),
              name: cleanName(input.name),
              targetCents: input.targetCents,
              savedCents: input.savedCents,
            },
          ],
        })),
      updateGoal: (id, input) =>
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === id
              ? {
                  ...goal,
                  name: cleanName(input.name),
                  targetCents: input.targetCents,
                  savedCents: input.savedCents,
                }
              : goal,
          ),
        })),
      deleteGoal: (id) => set((state) => ({ goals: state.goals.filter((goal) => goal.id !== id) })),
      eraseAll: () => set({ categories: defaultCategories(), transactions: [], goals: [] }),
    }),
    {
      name: "ledger-budget-v1",
      skipHydration: true,
      partialize: (state) => ({
        lang: state.lang,
        currency: state.currency,
        categories: state.categories,
        transactions: state.transactions,
        goals: state.goals,
      }),
    },
  ),
);

export function labelFor(id: string, categories: Category[], lang: Lang): string {
  return categoryLabel(
    categories.find((category) => category.id === id),
    lang,
  );
}
