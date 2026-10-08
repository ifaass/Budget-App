import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { BreakdownChart, withShares } from "@/components/budget/chart";
import { CategoryDialog, ConfirmDialog, EntryDialog, GoalDialog } from "@/components/budget/dialogs";
import { CategoryGlyph } from "@/components/budget/icons";
import { categoryLabel, formatDay, formatMonth, monthKey, shiftMonth, t } from "@/lib/budget/i18n";
import { formatMoney } from "@/lib/budget/money";
import { labelFor, useBudget } from "@/lib/budget/store";
import type { CurrencyCode, Goal, Lang, Transaction, TxType } from "@/lib/budget/types";

const LANGS: { id: Lang; label: string }[] = [
  { id: "si", label: "සිංහල" },
  { id: "ta", label: "தமிழ்" },
  { id: "en", label: "EN" },
];

const CURRENCIES: CurrencyCode[] = ["LKR", "USD", "EUR", "INR", "GBP"];

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-10 shrink-0" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path
        d="M8 11.5h16M8 16h16M8 20.5h10"
        fill="none"
        stroke="var(--color-accent-fg)"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function sumOf(rows: Transaction[], type: TxType): number {
  return rows.reduce((total, tx) => (tx.type === type ? total + tx.amountCents : total), 0);
}

type ConfirmState = {
  title: string;
  body: string;
  confirmLabel: string;
  run: () => void;
};

export function BudgetApp() {
  const lang = useBudget((state) => state.lang);
  const currency = useBudget((state) => state.currency);
  const categories = useBudget((state) => state.categories);
  const transactions = useBudget((state) => state.transactions);
  const goals = useBudget((state) => state.goals);
  const setLang = useBudget((state) => state.setLang);
  const setCurrency = useBudget((state) => state.setCurrency);
  const deleteTransaction = useBudget((state) => state.deleteTransaction);
  const deleteCategory = useBudget((state) => state.deleteCategory);
  const deleteGoal = useBudget((state) => state.deleteGoal);
  const eraseAll = useBudget((state) => state.eraseAll);

  const [month, setMonth] = useState<string | null>(null);
  const [todayMonth, setTodayMonth] = useState<string | null>(null);
  const [scope, setScope] = useState<"month" | "all">("month");
  const [query, setQuery] = useState("");
  const [txFilter, setTxFilter] = useState<"all" | TxType>("all");
  const [breakMode, setBreakMode] = useState<TxType>("expense");
  const [catQuery, setCatQuery] = useState("");
  const [entry, setEntry] = useState<null | { initial: Transaction | null; defaultType: TxType }>(null);
  const [categoryEditor, setCategoryEditor] = useState<
    null | "create" | { id: string; type: TxType; label: string; count: number }
  >(null);
  const [goalEditor, setGoalEditor] = useState<null | "create" | Goal>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  useEffect(() => {
    const now = monthKey(new Date());
    setMonth(now);
    setTodayMonth(now);
    void useBudget.persist.rehydrate();
  }, []);

  useEffect(() => {
    document.title = t(lang, "appName");
    document.documentElement.lang = lang;
  }, [lang]);

  const periodTx = useMemo(() => {
    if (scope === "all") return transactions;
    if (!month) return [];
    return transactions.filter((tx) => tx.date.startsWith(month));
  }, [transactions, scope, month]);

  const income = sumOf(periodTx, "income");
  const expenses = sumOf(periodTx, "expense");
  const remaining = income - expenses;
  const allRemaining = sumOf(transactions, "income") - sumOf(transactions, "expense");

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + 1);
    return map;
  }, [transactions]);

  const slices = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const tx of periodTx) {
      if (tx.type !== breakMode) continue;
      grouped.set(tx.categoryId, (grouped.get(tx.categoryId) ?? 0) + tx.amountCents);
    }
    const rows = [...grouped.entries()]
      .map(([id, cents]) => ({
        id,
        name: labelFor(id, categories, lang),
        cents,
        money: formatMoney(cents, currency, lang),
      }))
      .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name));
    return withShares(rows);
  }, [periodTx, breakMode, categories, lang, currency]);

  const visibleTx = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...periodTx]
      .filter((tx) => txFilter === "all" || tx.type === txFilter)
      .filter((tx) => {
        if (!needle) return true;
        const name = labelFor(tx.categoryId, categories, lang).toLowerCase();
        return name.includes(needle) || tx.note.toLowerCase().includes(needle);
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [periodTx, txFilter, query, categories, lang]);

  const categoryGroups = useMemo(() => {
    const needle = catQuery.trim().toLowerCase();
    const match = (type: TxType) =>
      categories.filter((category) => {
        if (category.type !== type) return false;
        if (!needle) return true;
        return categoryLabel(category, lang).toLowerCase().includes(needle);
      });
    return { expense: match("expense"), income: match("income") };
  }, [categories, catQuery, lang]);

  const monthBusy = scope === "month" && !month;
  const money = (cents: number) => (monthBusy ? "—" : formatMoney(cents, currency, lang));

  function ask(next: ConfirmState) {
    setConfirm(next);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Mark />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t(lang, "appName")}</h1>
            <p className="text-sm text-muted">{t(lang, "tagline")}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="seg sm:min-w-64" role="group" aria-label={t(lang, "language")}>
            {LANGS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={lang === item.id}
                onClick={() => setLang(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="sm:w-32">
            <label>
              <span className="sr-only">{t(lang, "currency")}</span>
              <select
                className="field"
                value={currency}
                aria-label={t(lang, "currency")}
                onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn btn-quiet"
            aria-label={t(lang, "prevMonth")}
            disabled={scope !== "month" || !month}
            onClick={() => month && setMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <p className="text-center text-base font-semibold">
            {scope === "all" ? t(lang, "allTime") : month ? formatMonth(month, lang) : t(lang, "thisMonth")}
          </p>
          <button
            type="button"
            className="btn btn-quiet"
            aria-label={t(lang, "nextMonth")}
            disabled={scope !== "month" || !month}
            onClick={() => month && setMonth(shiftMonth(month, 1))}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="seg" role="group" aria-label={t(lang, "thisMonth")}>
            <button type="button" aria-pressed={scope === "month"} onClick={() => setScope("month")}>
              {t(lang, "thisMonth")}
            </button>
            <button type="button" aria-pressed={scope === "all"} onClick={() => setScope("all")}>
              {t(lang, "allTime")}
            </button>
          </div>
          {scope === "month" && month && todayMonth && month !== todayMonth ? (
            <button type="button" className="btn btn-ghost" onClick={() => setMonth(todayMonth)}>
              {t(lang, "jumpToday")}
            </button>
          ) : null}
        </div>
      </div>

      <section className="panel mb-4" aria-live="polite">
        <h2 className="text-sm font-semibold text-muted">{t(lang, "remaining")}</h2>
        <p className={`money-hero nums mt-1 font-semibold ${remaining < 0 && !monthBusy ? "text-out" : "text-ink"}`}>
          {money(remaining)}
        </p>
        {remaining < 0 && !monthBusy ? <p className="mt-1 text-sm font-semibold text-out">{t(lang, "overspent")}</p> : null}
        <p className="mt-2 text-sm text-muted">{t(lang, "balanceHint")}</p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-3">
          <div className="min-w-0">
            <p className="text-sm text-muted">{t(lang, "income")}</p>
            <p className="nums mt-1 text-base font-semibold text-in">{money(income)}</p>
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted">{t(lang, "expenses")}</p>
            <p className="nums mt-1 text-base font-semibold text-out">{money(expenses)}</p>
          </div>
          <div className="col-span-2 min-w-0 border-t border-line pt-4 sm:col-span-1 sm:border-t-0 sm:pt-0">
            <p className="text-sm text-muted">{scope === "month" ? t(lang, "allTimeBalance") : t(lang, "transactions")}</p>
            <p className="nums mt-1 text-base font-semibold">
              {scope === "month" ? formatMoney(allRemaining, currency, lang) : t(lang, "entries", { n: String(transactions.length) })}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" className="btn btn-primary" onClick={() => setEntry({ initial: null, defaultType: "expense" })}>
          <Plus className="size-4" aria-hidden />
          {t(lang, "addExpense")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setEntry({ initial: null, defaultType: "income" })}>
          <Plus className="size-4" aria-hidden />
          {t(lang, "addIncome")}
        </button>
      </div>

      <section className="panel mb-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {breakMode === "expense" ? t(lang, "spending") : t(lang, "incomeByCat")}
          </h2>
          <div className="seg" role="group" aria-label={t(lang, "category")}>
            <button type="button" aria-pressed={breakMode === "expense"} onClick={() => setBreakMode("expense")}>
              {t(lang, "expenses")}
            </button>
            <button type="button" aria-pressed={breakMode === "income"} onClick={() => setBreakMode("income")}>
              {t(lang, "income")}
            </button>
          </div>
        </div>
        <BreakdownChart
          slices={slices}
          lang={lang}
          emptyKey={breakMode === "expense" ? "noSpending" : "noIncomeBreak"}
          label={breakMode === "expense" ? t(lang, "spending") : t(lang, "incomeByCat")}
        />
      </section>

      <section className="panel mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t(lang, "transactions")}</h2>
          <p className="text-sm text-muted">{t(lang, "entries", { n: String(visibleTx.length) })}</p>
        </div>
        <p className="mb-3 text-sm text-muted">{t(lang, "dataHint")}</p>
        <input
          className="field mb-3"
          type="search"
          value={query}
          placeholder={t(lang, "search")}
          aria-label={t(lang, "search")}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="seg mb-2" role="group" aria-label={t(lang, "transactions")}>
          {(
            [
              ["all", "filterAll"],
              ["expense", "expenses"],
              ["income", "income"],
            ] as const
          ).map(([id, key]) => (
            <button key={id} type="button" aria-pressed={txFilter === id} onClick={() => setTxFilter(id)}>
              {t(lang, key)}
            </button>
          ))}
        </div>
        {visibleTx.length === 0 ? (
          <p className="py-6 text-sm text-muted">{query.trim() ? t(lang, "noResults") : t(lang, "noTransactions")}</p>
        ) : (
          <ul>
            {visibleTx.map((tx) => {
              const category = categories.find((item) => item.id === tx.categoryId);
              return (
                <li key={tx.id} className="flex items-start gap-2 border-t border-line py-3 first:border-t-0">
                  <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-2 text-ink">
                    <CategoryGlyph nameKey={category?.nameKey ?? null} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <p className="min-w-0 font-semibold leading-snug">{labelFor(tx.categoryId, categories, lang)}</p>
                      <p className={`nums font-semibold sm:shrink-0 ${tx.type === "income" ? "text-in" : "text-out"}`}>
                        {tx.type === "income" ? "+" : "−"} {formatMoney(tx.amountCents, currency, lang)}
                      </p>
                    </div>
                    <p className="truncate text-sm text-muted" title={tx.note || undefined}>
                      {formatDay(tx.date, lang)}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col sm:flex-row">
                    <button
                      type="button"
                      className="btn btn-quiet"
                      aria-label={t(lang, "edit")}
                      onClick={() => setEntry({ initial: tx, defaultType: tx.type })}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      aria-label={t(lang, "delete")}
                      onClick={() =>
                        ask({
                          title: t(lang, "deleteAsk"),
                          body: t(lang, "deleteTx"),
                          confirmLabel: t(lang, "delete"),
                          run: () => deleteTransaction(tx.id),
                        })
                      }
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t(lang, "goals")}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setGoalEditor("create")}>
            <Plus className="size-4" aria-hidden />
            {t(lang, "addGoal")}
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">{t(lang, "goalsHint")}</p>
        {goals.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "noGoals")}</p>
        ) : (
          <ul className="grid gap-4">
            {goals.map((goal) => {
              const ratio = goal.targetCents > 0 ? goal.savedCents / goal.targetCents : 0;
              const width = Math.max(0, Math.min(100, ratio * 100));
              const reached = goal.savedCents >= goal.targetCents && goal.targetCents > 0;
              return (
                <li key={goal.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{goal.name}</p>
                      <p className="nums mt-1 text-sm text-muted">
                        {formatMoney(goal.savedCents, currency, lang)} / {formatMoney(goal.targetCents, currency, lang)}
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <button
                        type="button"
                        className="btn btn-quiet"
                        aria-label={t(lang, "edit")}
                        onClick={() => setGoalEditor(goal)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="btn btn-quiet"
                        aria-label={t(lang, "delete")}
                        onClick={() =>
                          ask({
                            title: t(lang, "deleteAsk"),
                            body: t(lang, "deleteGoal"),
                            confirmLabel: t(lang, "delete"),
                            run: () => deleteGoal(goal.id),
                          })
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div className="track mt-3" aria-hidden>
                    <span style={{ width: `${width}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {reached
                      ? t(lang, "reached")
                      : `${t(lang, "stillNeeded")}: ${formatMoney(goal.targetCents - goal.savedCents, currency, lang)}`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t(lang, "categories")}</h2>
          <button type="button" className="btn btn-ghost" onClick={() => setCategoryEditor("create")}>
            <Plus className="size-4" aria-hidden />
            {t(lang, "addCategory")}
          </button>
        </div>
        <input
          className="field mb-4"
          type="search"
          value={catQuery}
          placeholder={t(lang, "searchCategories")}
          aria-label={t(lang, "searchCategories")}
          onChange={(event) => setCatQuery(event.target.value)}
        />
        {categoryGroups.expense.length === 0 && categoryGroups.income.length === 0 ? (
          <p className="text-sm text-muted">{t(lang, "noCategoryMatch")}</p>
        ) : (
          <div className="grid gap-5">
            {(
              [
                ["expense", categoryGroups.expense],
                ["income", categoryGroups.income],
              ] as const
            ).map(([type, rows]) =>
              rows.length === 0 ? null : (
                <div key={type}>
                  <h3 className="mb-1 text-sm font-semibold text-muted">
                    {type === "expense" ? t(lang, "expenses") : t(lang, "income")}
                  </h3>
                  <ul className="max-h-96 overflow-y-auto">
                    {rows.map((category) => {
                      const count = counts.get(category.id) ?? 0;
                      return (
                        <li key={category.id} className="flex items-center gap-2 border-t border-line py-2 first:border-t-0">
                          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-2">
                            <CategoryGlyph nameKey={category.nameKey} className="size-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{categoryLabel(category, lang)}</p>
                            <p className="text-sm text-muted">{t(lang, "entries", { n: String(count) })}</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-quiet"
                            aria-label={t(lang, "edit")}
                            onClick={() =>
                              setCategoryEditor({
                                id: category.id,
                                type: category.type,
                                label: categoryLabel(category, lang),
                                count,
                              })
                            }
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn btn-quiet"
                            aria-label={t(lang, "delete")}
                            onClick={() =>
                              ask({
                                title: t(lang, "deleteAsk"),
                                body:
                                  count > 0
                                    ? t(lang, "deleteCat", { n: String(count) })
                                    : t(lang, "deleteCatEmpty"),
                                confirmLabel: t(lang, "delete"),
                                run: () => deleteCategory(category.id),
                              })
                            }
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <section className="panel">
        <h2 className="text-lg font-semibold">{t(lang, "settings")}</h2>
        <p className="mt-2 text-sm text-muted">{t(lang, "eraseBody")}</p>
        <button
          type="button"
          className="btn btn-danger mt-4"
          onClick={() =>
            ask({
              title: t(lang, "eraseAsk"),
              body: t(lang, "eraseBody"),
              confirmLabel: t(lang, "confirmErase"),
              run: () => eraseAll(),
            })
          }
        >
          {t(lang, "eraseAll")}
        </button>
      </section>

      {entry ? (
        <EntryDialog
          key={entry.initial?.id ?? `new-${entry.defaultType}`}
          initial={entry.initial}
          defaultType={entry.defaultType}
          scope={scope}
          month={month}
          periodRemaining={remaining}
          onClose={() => setEntry(null)}
        />
      ) : null}
      {categoryEditor ? (
        <CategoryDialog
          key={categoryEditor === "create" ? "new-category" : categoryEditor.id}
          initial={categoryEditor === "create" ? null : categoryEditor}
          onClose={() => setCategoryEditor(null)}
        />
      ) : null}
      {goalEditor ? (
        <GoalDialog
          key={goalEditor === "create" ? "new-goal" : goalEditor.id}
          initial={goalEditor === "create" ? null : goalEditor}
          onClose={() => setGoalEditor(null)}
        />
      ) : null}
      {confirm ? (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => {
            confirm.run();
            setConfirm(null);
          }}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </main>
  );
}
