import type { TopLevelSpec } from "vega-lite";
import { logError, logInfo } from "./logger.ts";

const LR_CHARTS: Record<string, string> = {
  Calves: "calves",
  Thighs: "thighs",
  Forearms: "forearms",
  Biceps: "biceps",
};

const SINGLE_CHARTS: Record<string, string> = {
  Weight: "weight",
  Hips: "hips",
  Waist: "waist",
  Chest: "chest",
};

const CHART_API_URL = "http://127.0.0.1:8888/sqlite-charts";
const CACHE_EXPIRY = 3600000; // 1 hour
const chartCache: Record<string, { data: any; timestamp: number }> = {};

// Overloads for strict typing
async function getChartJSON(
  type: "SINGLE",
  table_name: string,
): Promise<TopLevelSpec>;
async function getChartJSON(
  type: "LR",
  table_name: string,
): Promise<TopLevelSpec>;
async function getChartJSON(
  type: "SINGLE" | "LR",
  table_name: string,
): Promise<TopLevelSpec> {
  const cacheKey = `${type}_${table_name}`;
  if (
    chartCache[cacheKey] &&
    Date.now() - chartCache[cacheKey].timestamp < CACHE_EXPIRY
  ) {
    logInfo("Chart data served from cache", { type, table_name });
    return chartCache[cacheKey].data;
  }

  const startTime = performance.now();
  let res;
  let data;
  let endpoint = "";
  let requestBody: any;

  try {
    switch (type) {
      case "SINGLE":
        endpoint = `${CHART_API_URL}/single`;
        requestBody = { table_name, style: "hover", with_impute: true };
        break;
      case "LR":
        endpoint = `${CHART_API_URL}/LR`;
        requestBody = { table_name, style: "hover" };
        break;
      default:
        throw new Error("Unknown chart type");
    }

    logInfo("Making chart request to lifts-be", {
      endpoint,
      type,
      table_name,
      requestBody,
    });

    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    data = await res.json();
    chartCache[cacheKey] = { data, timestamp: Date.now() };

    logInfo("Chart request completed successfully", {
      endpoint,
      type,
      table_name,
      duration_ms: duration,
      status: res.status,
    });

    return data;
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    logError("Chart request failed", {
      endpoint,
      type,
      table_name,
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });

    if (chartCache[cacheKey]) {
      logInfo("Falling back to cached data after error", { type, table_name });
      return chartCache[cacheKey].data;
    }
    throw error;
  }
}

export async function getAllChartJSON(): Promise<TopLevelSpec[]> {
  const chartJSON: (TopLevelSpec | null)[] = [];
  const promises: { promise: Promise<TopLevelSpec>; index: number }[] = [];
  for (const exe in LR_CHARTS) {
    promises.push({
      promise: getChartJSON("LR", LR_CHARTS[exe]),
      index: chartJSON.length,
    });
    chartJSON.push(null);
  }
  for (const exe in SINGLE_CHARTS) {
    promises.push({
      promise: getChartJSON("SINGLE", SINGLE_CHARTS[exe]),
      index: chartJSON.length,
    });
    chartJSON.push(null);
  }
  await Promise.allSettled(
    promises.map(async (item) => {
      try {
        const result = await item.promise;
        chartJSON[item.index] = result;
      } catch (_) { }
    }),
  );
  return chartJSON.filter((chart): chart is TopLevelSpec => chart !== null);
}
