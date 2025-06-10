import type { TopLevelSpec } from "https://esm.sh/vega-lite@5.16.3";

const LR_CHARTS: Record<string, [number, number]> = {
  Calves: [5, 6],
  Thighs: [7, 8],
  Forearms: [12, 13],
  Biceps: [14, 15],
};

const SINGLE_CHARTS: Record<string, number> = {
  Hips: 9,
  Waist: 10,
  Chest: 11,
};

const CHART_API_URL = "http://127.0.0.1:8888/charts";
const CACHE_EXPIRY = 3600000; // 1 hour
const chartCache: Record<string, { data: any; timestamp: number }> = {};

// Overloads for strict typing
async function getChartJSON(type: "SINGLE", index_data: number): Promise<TopLevelSpec>;
async function getChartJSON(type: "LR", index_data: [number, number]): Promise<TopLevelSpec>;
async function getChartJSON(type: "SINGLE" | "LR", index_data: number | [number, number]): Promise<TopLevelSpec> {
  const cacheKey = `${type}_${JSON.stringify(index_data)}`;
  if (chartCache[cacheKey] && Date.now() - chartCache[cacheKey].timestamp < CACHE_EXPIRY) {
    return chartCache[cacheKey].data;
  }
  let res;
  let data;
  try {
    switch (type) {
      case "SINGLE":
        res = await fetch(`${CHART_API_URL}/single`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: index_data, style: "hover" }),
        });
        break;
      case "LR":
        res = await fetch(`${CHART_API_URL}/LR`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index_L: (index_data as [number, number])[0], index_R: (index_data as [number, number])[1], style: "hover" }),
        });
        break;
      default:
        throw new Error("Unknown chart type");
    }
    data = await res.json();
    chartCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  } catch (error) {
    if (chartCache[cacheKey]) {
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
      } catch (_) {}
    })
  );
  return chartJSON.filter((chart): chart is TopLevelSpec => chart !== null);
} 