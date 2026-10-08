export type TxType = "income" | "expense";
export type Lang = "en" | "si" | "ta";
export type CurrencyCode = "LKR" | "USD" | "EUR" | "INR" | "GBP";

export const CATEGORY_KEYS = [
  "catFood",
  "catGroceries",
  "catTransport",
  "catHousing",
  "catElectricity",
  "catWater",
  "catPhone",
  "catHealth",
  "catEducation",
  "catClothes",
  "catHousehold",
  "catChildren",
  "catFamily",
  "catFun",
  "catPersonal",
  "catInsurance",
  "catDebt",
  "catSavings",
  "catGifts",
  "catFestivals",
  "catTravel",
  "catPets",
  "catTaxes",
  "catRepairs",
  "catOther",
  "catSalary",
  "catBusiness",
  "catFreelance",
  "catRentIn",
  "catInvest",
  "catRemit",
  "catBonus",
  "catGiftIn",
  "catSales",
  "catOtherIn",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export type Category = {
  id: string;
  type: TxType;
  nameKey: CategoryKey | null;
  name: string | null;
};

export type Transaction = {
  id: string;
  type: TxType;
  amountCents: number;
  categoryId: string;
  date: string;
  note: string;
  createdAt: number;
};

export type Goal = {
  id: string;
  name: string;
  targetCents: number;
  savedCents: number;
};

const EXPENSE_PRESETS: { id: string; key: CategoryKey }[] = [
  { id: "cat-food", key: "catFood" },
  { id: "cat-groceries", key: "catGroceries" },
  { id: "cat-transport", key: "catTransport" },
  { id: "cat-housing", key: "catHousing" },
  { id: "cat-electricity", key: "catElectricity" },
  { id: "cat-water", key: "catWater" },
  { id: "cat-phone", key: "catPhone" },
  { id: "cat-health", key: "catHealth" },
  { id: "cat-education", key: "catEducation" },
  { id: "cat-clothes", key: "catClothes" },
  { id: "cat-household", key: "catHousehold" },
  { id: "cat-children", key: "catChildren" },
  { id: "cat-family", key: "catFamily" },
  { id: "cat-fun", key: "catFun" },
  { id: "cat-personal", key: "catPersonal" },
  { id: "cat-insurance", key: "catInsurance" },
  { id: "cat-debt", key: "catDebt" },
  { id: "cat-savings", key: "catSavings" },
  { id: "cat-gifts", key: "catGifts" },
  { id: "cat-festivals", key: "catFestivals" },
  { id: "cat-travel", key: "catTravel" },
  { id: "cat-pets", key: "catPets" },
  { id: "cat-taxes", key: "catTaxes" },
  { id: "cat-repairs", key: "catRepairs" },
  { id: "cat-other", key: "catOther" },
];

const INCOME_PRESETS: { id: string; key: CategoryKey }[] = [
  { id: "cat-salary", key: "catSalary" },
  { id: "cat-business", key: "catBusiness" },
  { id: "cat-freelance", key: "catFreelance" },
  { id: "cat-rent-in", key: "catRentIn" },
  { id: "cat-invest", key: "catInvest" },
  { id: "cat-remit", key: "catRemit" },
  { id: "cat-bonus", key: "catBonus" },
  { id: "cat-gift-in", key: "catGiftIn" },
  { id: "cat-sales", key: "catSales" },
  { id: "cat-other-in", key: "catOtherIn" },
];

export function defaultCategories(): Category[] {
  return [
    ...EXPENSE_PRESETS.map((item) => ({
      id: item.id,
      type: "expense" as const,
      nameKey: item.key,
      name: null,
    })),
    ...INCOME_PRESETS.map((item) => ({
      id: item.id,
      type: "income" as const,
      nameKey: item.key,
      name: null,
    })),
  ];
}

export function uid(): string {
  return crypto.randomUUID();
}
