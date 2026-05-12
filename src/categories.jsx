import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

export const BASE_CATS = ["food", "housing", "utilities", "transport", "entertainment", "salary", "other"];

export const BASE_CAT_COLORS = {
  food:          "#F5C451",
  housing:       "#4B82F1",
  utilities:     "#FB923C",
  transport:     "#38BDF8",
  entertainment: "#E04F4F",
  salary:        "#37C978",
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

  const addCat = useCallback((label) => {
    const id = label.trim();
    if (!id) return false;
    const lower = id.toLowerCase();
    if (BASE_CATS.includes(lower)) return false;

    setCustomCats(prev => {
      if (prev.find(c => c.id.toLowerCase() === lower)) return prev;
      const color = PALETTE[prev.length % PALETTE.length];
      const next = [...prev, { id, color }];
      onSave?.(next);
      return next;
    });
    return true;
  }, [onSave]);

  const removeCat = useCallback((id) => {
    setCustomCats(prev => {
      const next = prev.filter(c => c.id !== id);
      onSave?.(next);
      return next;
    });
  }, [onSave]);

  const getCatColor = useCallback((cat) => {
    if (BASE_CAT_COLORS[cat]) return BASE_CAT_COLORS[cat];
    return customCats.find(c => c.id === cat)?.color ?? "#94A3B8";
  }, [customCats]);

  const allCats = [...BASE_CATS, ...customCats.map(c => c.id)];
  const expenseCats = allCats.filter(c => c !== "salary");

  return (
    <CatsContext.Provider value={{ customCats, allCats, expenseCats, addCat, removeCat, getCatColor }}>
      {children}
    </CatsContext.Provider>
  );
}

export const useCategories = () => useContext(CatsContext);
