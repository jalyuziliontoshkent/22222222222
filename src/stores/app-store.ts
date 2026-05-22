"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrencyMode, ThemeMode } from "@/types/app";

type AppState = {
  theme: ThemeMode;
  currency: CurrencyMode;
  exchangeRate: number;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleCurrency: () => void;
  setExchangeRate: (rate: number) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      currency: "USD",
      exchangeRate: 12800,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "dark" ? "light" : "dark" }),
      toggleCurrency: () =>
        set({ currency: get().currency === "USD" ? "UZS" : "USD" }),
      setExchangeRate: (exchangeRate) => set({ exchangeRate }),
    }),
    {
      name: "curtain-app-settings",
      partialize: (state) => ({
        theme: state.theme,
        currency: state.currency,
        exchangeRate: state.exchangeRate,
      }),
    },
  ),
);
