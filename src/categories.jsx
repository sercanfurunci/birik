import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export const BASE_CATS = ["food", "housing", "utilities", "transport", "entertainment", "salary", "freelance", "investment", "rental", "bonus", "other"];

export const CAT_EMOJI = {
  food:          "🍔",
  housing:       "🏠",
  utilities:     "💡",
  transport:     "🚗",
  entertainment: "🎬",
  salary:        "💼",
  freelance:     "💻",
  investment:    "📈",
  rental:        "🏘️",
  bonus:         "🎁",
  other:         "📦",
};

export const INCOME_ONLY_CATS = ["salary", "freelance", "investment", "rental", "bonus"];

export const BASE_CAT_COLORS = {
  food:          "#F5C451",
  housing:       "#4B82F1",
  utilities:     "#FB923C",
  transport:     "#38BDF8",
  entertainment: "#E04F4F",
  salary:        "#37C978",
  freelance:     "#8B5CF6",
  investment:    "#14B8A6",
  rental:        "#F59E0B",
  bonus:         "#D946EF",
  other:         "#94A3B8",
};

const PALETTE = [
  "#8B5CF6", "#F59E0B", "#14B8A6", "#84CC16", "#D946EF",
  "#EF4444", "#0EA5E9", "#FB923C", "#A16207", "#22C55E",
];

const CatsContext = createContext(null);

// initialCats: [{id, color}] from currentUser.custom_categories
// onSave: async (cats) => void — calls PUT /auth/profile
export function CategoriesProvider({ initialCats = [], onSave, children }) {
  const [customCats, setCustomCats] = useState(
    () => (Array.isArray(initialCats) ? initialCats : [])
  );

  // Sync when initialCats loads from backend (e.g. after page refresh)
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current && Array.isArray(initialCats) && initialCats.length > 0) {
      seeded.current = true;
      setCustomCats(initialCats);
    }
  }, [initialCats]);

  // Returns "ok" on success, or an error code: "empty" | "reserved" | "exists"
  // Same label is allowed across kinds — uniqueness is per (label, kind).
  const addCat = useCallback((label, kind = "expense") => {
    const id = label.trim();
    if (!id) return "empty";
    const lower = id.toLowerCase();
    const normalizedKind = kind === "income" ? "income" : "expense";
    // Reserve built-in expense names from being added as expense, and built-in income names from being added as income
    const isReservedExpense = BASE_CATS.includes(lower) && !INCOME_ONLY_CATS.includes(lower);
    const isReservedIncome  = INCOME_ONLY_CATS.includes(lower) || lower === "other";
    if (normalizedKind === "expense" && isReservedExpense) return "reserved";
    if (normalizedKind === "income"  && isReservedIncome)  return "reserved";
    if (customCats.find(c => c.id.toLowerCase() === lower && (c.kind || "expense") === normalizedKind)) return "exists";

    setCustomCats(prev => {
      if (prev.find(c => c.id.toLowerCase() === lower && (c.kind || "expense") === normalizedKind)) return prev;
      const color = PALETTE[prev.length % PALETTE.length];
      const next = [...prev, { id, color, kind: normalizedKind }];
      onSave?.(next);
      return next;
    });
    return "ok";
  }, [customCats, onSave]);

  const removeCat = useCallback((id) => {
    setCustomCats(prev => {
      const next = prev.filter(c => c.id !== id);
      onSave?.(next);
      return next;
    });
  }, [onSave]);

  // kind is optional: pass it when known (per-tx context) so income-"Bonus" and expense-"Bonus" can each have their own color.
  // When omitted, returns the first match by id (acceptable for aggregate views that don't track type).
  const getCatColor = useCallback((cat, kind) => {
    if (BASE_CAT_COLORS[cat]) return BASE_CAT_COLORS[cat];
    if (kind) {
      const normalized = kind === "income" ? "income" : "expense";
      const exact = customCats.find(c => c.id === cat && (c.kind || "expense") === normalized);
      if (exact) return exact.color;
    }
    return customCats.find(c => c.id === cat)?.color ?? "#94A3B8";
  }, [customCats]);

  // Custom cats default to "expense" kind when not specified (backwards-compat for rows saved before this field existed)
  const customIncome  = customCats.filter(c => c.kind === "income").map(c => c.id);
  const customExpense = customCats.filter(c => c.kind !== "income").map(c => c.id);

  const allCats     = [...BASE_CATS, ...customCats.map(c => c.id)];
  const expenseCats = [...BASE_CATS.filter(c => !INCOME_ONLY_CATS.includes(c)), ...customExpense];
  const incomeCats  = [...INCOME_ONLY_CATS, "other", ...customIncome];

  return (
    <CatsContext.Provider value={{ customCats, allCats, expenseCats, incomeCats, addCat, removeCat, getCatColor }}>
      {children}
    </CatsContext.Provider>
  );
}

export const useCategories = () => useContext(CatsContext);
