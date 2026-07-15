import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  id: string; // variant id when available, otherwise perfume id
  perfumeId: string;
  variantId?: string;
  sizeLabel?: string;
  name: string;
  price: number; // resolved final (discounted) unit price
  originalPrice?: number;
  promotionName?: string;
  img: string;
  qty: number;
};

export type FlyEvent = { id: number; img: string; fromX: number; fromY: number };

type CartCtx = {
  items: CartItem[];
  add: (item: Omit<CartItem, "qty">, fromRect?: DOMRect | null) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  fly: FlyEvent | null;
  clearFly: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "tps_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [fly, setFly] = useState<FlyEvent | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, "qty">) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const value = useMemo<CartCtx>(() => {
    const count = items.reduce((s, i) => s + i.qty, 0);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    return {
      items,
      count,
      total,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
      add: (item, fromRect) => {
        if (fromRect) {
          setFly({
            id: Date.now(),
            img: item.img,
            fromX: fromRect.left + fromRect.width / 2,
            fromY: fromRect.top + fromRect.height / 2,
          });
          // Defer add to land roughly when flight ends so the cart count "lands" with it
          setTimeout(() => {
            addItem(item);
            setOpen(true);
          }, 900);
        } else {
          addItem(item);
          setOpen(true);
        }
      },
      remove: (id) => setItems((prev) => prev.filter((p) => p.id !== id)),
      setQty: (id, qty) =>
        setItems((prev) =>
          qty <= 0
            ? prev.filter((p) => p.id !== id)
            : prev.map((p) => (p.id === id ? { ...p, qty } : p)),
        ),
      clear: () => setItems([]),
      fly,
      clearFly: () => setFly(null),
    };
  }, [items, isOpen, fly, addItem]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
