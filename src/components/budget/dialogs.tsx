import { useState, type FormEvent, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { categoryLabel, t, todayISO } from "@/lib/budget/i18n";
import { centsToInput, currencySymbol, effect, formatMoney, parseMoney } from "@/lib/budget/money";
import { useBudget } from "@/lib/budget/store";
import type { Goal, Transaction, TxType } from "@/lib/budget/types";

function Modal({
  title,
  description,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content className="modal-panel fade-in">
          <div className="mb-4 flex items-start justify-between gap-3">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Close className="btn btn-quiet" aria-label={closeLabel}>
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          {description ? (
            <Dialog.Description className="mb-4 text-sm text-muted">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-sm font-semibold">{children}</span>;
}

export function EntryDialog({
  initial,
  defaultType,
  scope,
  month,
  periodRemaining,
  onClose,
}: {
  initial: Transaction | null;
  defaultType: TxType;
  scope: "month" | "all";
  month: string | null;
  periodRemaining: number;
  onClose: () => void;
}) {
  const lang = useBudget((state) => state.lang);
  const currency = useBudget((state) => state.currency);
  const categories = useBudget((state) => state.categories);
  const addTransaction = useBudget((state) => state.addTransaction);
  const updateTransaction = useBudget((state) => state.updateTransaction);

  const [type, setType] = useState<TxType>(initial?.type ?? defaultType);
  const [amount, setAmount] = useState(initial ? centsToInput(initial.amountCents) : "");
  const [categoryId, setCategoryId] = useState(() => {
    if (initial) return initial.categoryId;
    return categories.find((category) => category.type === defaultType)?.id ?? "";
  });
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  const options = categories.filter((category) => category.type === type);
  const cents = parseMoney(amount);
  const symbol = currencySymbol(currency, lang);

  function chooseType(next: TxType) {
    setType(next);
    setCategoryId((current) => {
      const still = categories.some((category) => category.id === current && category.type === next);
      if (still) return current;
      return categories.find((category) => category.type === next)?.id ?? "";
    });
  }

  function inView(value: string) {
    if (scope === "all") return true;
    return Boolean(month && value.startsWith(month));
  }

  let preview: string | null = null;
  if (cents) {
    let next = periodRemaining;
    if (initial && inView(initial.date)) next -= effect(initial.type, initial.amountCents);
    if (inView(date)) next += effect(type, cents);
    preview = t(lang, "preview", { amount: formatMoney(next, currency, lang) });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseMoney(amount);
    if (!parsed) {
      setError(t(lang, "invalidAmount"));
      return;
    }
    if (!categoryId || !options.some((category) => category.id === categoryId)) {
      setError(t(lang, "needCategory"));
      return;
    }
    const input = { type, amountCents: parsed, categoryId, date, note };
    if (initial) updateTransaction(initial.id, input);
    else addTransaction(input);
    onClose();
  }

  const title = initial ? t(lang, "editEntry") : type === "income" ? t(lang, "newIncome") : t(lang, "newExpense");

  return (
    <Modal title={title} closeLabel={t(lang, "close")} onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <div>
          <FieldLabel>{t(lang, "type")}</FieldLabel>
          <div className="seg" role="group" aria-label={t(lang, "type")}>
            <button type="button" aria-pressed={type === "expense"} onClick={() => chooseType("expense")}>
              {t(lang, "expense")}
            </button>
            <button type="button" aria-pressed={type === "income"} onClick={() => chooseType("income")}>
              {t(lang, "income")}
            </button>
          </div>
        </div>
        <label>
          <FieldLabel>{t(lang, "amount")}</FieldLabel>
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
              {symbol}
            </span>
            <input
              className="field nums pl-14"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              aria-invalid={Boolean(error)}
              required
            />
          </span>
        </label>
        <label>
          <FieldLabel>{t(lang, "category")}</FieldLabel>
          {options.length === 0 ? (
            <p className="text-sm text-muted">{t(lang, "needCategory")}</p>
          ) : (
            <select
              className="field"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {options.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryLabel(category, lang)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          <FieldLabel>{t(lang, "date")}</FieldLabel>
          <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label>
          <FieldLabel>{t(lang, "note")}</FieldLabel>
          <input
            className="field"
            value={note}
            maxLength={160}
            placeholder={t(lang, "notePlaceholder")}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        {error ? <p className="text-sm text-out">{error}</p> : null}
        {preview ? <p className="nums text-sm text-muted">{preview}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t(lang, "cancel")}
          </button>
          <button type="submit" className="btn btn-primary" disabled={options.length === 0}>
            {t(lang, "save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function CategoryDialog({
  initial,
  onClose,
}: {
  initial: { id: string; type: TxType; label: string; count: number } | null;
  onClose: () => void;
}) {
  const lang = useBudget((state) => state.lang);
  const addCategory = useBudget((state) => state.addCategory);
  const updateCategory = useBudget((state) => state.updateCategory);
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [name, setName] = useState(initial?.label ?? "");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t(lang, "invalidName"));
      return;
    }
    if (initial) updateCategory(initial.id, { type, name });
    else addCategory({ type, name });
    onClose();
  }

  return (
    <Modal
      title={initial ? t(lang, "editCategory") : t(lang, "newCategory")}
      description={initial ? t(lang, "renameHint") : undefined}
      closeLabel={t(lang, "close")}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <label>
          <FieldLabel>{t(lang, "categoryName")}</FieldLabel>
          <input
            className="field"
            value={name}
            maxLength={40}
            placeholder={t(lang, "categoryNamePlaceholder")}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            required
          />
        </label>
        <div>
          <FieldLabel>{t(lang, "type")}</FieldLabel>
          <div className="seg" role="group" aria-label={t(lang, "type")}>
            <button type="button" aria-pressed={type === "expense"} onClick={() => setType("expense")}>
              {t(lang, "expense")}
            </button>
            <button type="button" aria-pressed={type === "income"} onClick={() => setType("income")}>
              {t(lang, "income")}
            </button>
          </div>
          {initial && initial.count > 0 ? <p className="mt-2 text-sm text-muted">{t(lang, "switchTypeHint")}</p> : null}
        </div>
        {error ? <p className="text-sm text-out">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t(lang, "cancel")}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(lang, "save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function GoalDialog({ initial, onClose }: { initial: Goal | null; onClose: () => void }) {
  const lang = useBudget((state) => state.lang);
  const currency = useBudget((state) => state.currency);
  const addGoal = useBudget((state) => state.addGoal);
  const updateGoal = useBudget((state) => state.updateGoal);
  const symbol = currencySymbol(currency, lang);
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(initial ? centsToInput(initial.targetCents) : "");
  const [saved, setSaved] = useState(initial ? centsToInput(initial.savedCents) : "0");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError(t(lang, "invalidName"));
      return;
    }
    const targetCents = parseMoney(target);
    const savedCents = parseMoney(saved, true);
    if (!targetCents) {
      setError(t(lang, "invalidTarget"));
      return;
    }
    if (savedCents === null) {
      setError(t(lang, "invalidSaved"));
      return;
    }
    const input = { name, targetCents, savedCents };
    if (initial) updateGoal(initial.id, input);
    else addGoal(input);
    onClose();
  }

  return (
    <Modal
      title={initial ? t(lang, "editGoal") : t(lang, "newGoal")}
      closeLabel={t(lang, "close")}
      onClose={onClose}
    >
      <form className="grid gap-4" onSubmit={submit}>
        <label>
          <FieldLabel>{t(lang, "goalName")}</FieldLabel>
          <input
            className="field"
            value={name}
            maxLength={40}
            placeholder={t(lang, "goalNamePlaceholder")}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label>
          <FieldLabel>{t(lang, "target")}</FieldLabel>
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
              {symbol}
            </span>
            <input
              className="field nums pl-14"
              inputMode="decimal"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              required
            />
          </span>
        </label>
        <label>
          <FieldLabel>{t(lang, "saved")}</FieldLabel>
          <span className="relative block">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
              {symbol}
            </span>
            <input
              className="field nums pl-14"
              inputMode="decimal"
              value={saved}
              onChange={(event) => setSaved(event.target.value)}
              required
            />
          </span>
        </label>
        {error ? <p className="text-sm text-out">{error}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t(lang, "cancel")}
          </button>
          <button type="submit" className="btn btn-primary">
            {t(lang, "save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const lang = useBudget((state) => state.lang);
  return (
    <AlertDialog.Root open onOpenChange={(open) => !open && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fade-in fixed inset-0 z-40 bg-ink/40" />
        <AlertDialog.Content className="modal-panel fade-in">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted">{body}</AlertDialog.Description>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <AlertDialog.Cancel className="btn btn-ghost">{t(lang, "cancel")}</AlertDialog.Cancel>
            <AlertDialog.Action className="btn btn-danger" onClick={onConfirm}>
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
