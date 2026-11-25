import { createContext, useContext } from "react";

export type QuickAction =
  | null
  | "income"
  | "expense"
  | "transfer"
  | "snapshot"
  | "buyin"
  | "prop";

export const QuickCtx = createContext<(a: QuickAction) => void>(() => undefined);
export const useQuick = () => useContext(QuickCtx);
