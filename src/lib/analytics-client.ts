"use client";

export type SearchLogPayload = {
  query?: string | null;
  filters?: Record<string, string | number | null | undefined>;
  resultsCount?: number | null;
  page?: number | null;
  path?: string | null;
  source?: string | null;
};

export async function logSearchEvent(payload: SearchLogPayload) {
  if (typeof window === "undefined") return;

  try {
    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/search", blob);
      return;
    }

    await fetch("/api/analytics/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // Intentionally ignore analytics errors.
  }
}
