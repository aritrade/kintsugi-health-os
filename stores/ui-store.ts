"use client";

import { create } from "zustand";

// Ephemeral UI state. Server data is fetched via server components / route handlers.
interface UiState {
  sensitiveUnlocked: boolean;
  setSensitiveUnlocked: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sensitiveUnlocked: false,
  setSensitiveUnlocked: (v) => set({ sensitiveUnlocked: v }),
}));
