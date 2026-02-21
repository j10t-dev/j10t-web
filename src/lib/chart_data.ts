import { logError, logInfo } from "./logger";
import { z } from "zod";

// Local type definition to avoid pulling in vega-lite's native dependencies (canvas)
// This is a minimal representation - the actual spec is validated by Zod
type TopLevelSpec = Record<string, unknown>;

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

const CHART_API_URL = process.env.CHART_API_URL ?? "http://127.0.0.1:8888/sqlite-charts";
const CACHE_EXPIRY = 3600000; // 1 hour
const chartCache: Record<string, { data: any; timestamp: number }> = {};

// Zod schema for Vega-Lite chart specification
// This validates the basic structure of TopLevelSpec responses
const VegaLiteSpecSchema = z.object({
  $schema: z.string().optional(),
  mark: z.any().optional(),
  encoding: z.any().optional(),
  data: z.any().optional(),
  layer: z.any().optional(),
  vconcat: z.any().optional(),
  hconcat: z.any().optional(),
  facet: z.any().optional(),
  repeat: z.any().optional(),
  spec: z.any().optional(),
}).passthrough();

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

    const rawData = await res.json();

    const parseResult = VegaLiteSpecSchema.safeParse(rawData);

    if (!parseResult.success) {
      logError("Invalid chart data structure from API", {
        endpoint,
        type,
        table_name,
        errors: parseResult.error.issues,
      });
      throw new Error(`Invalid chart data structure: ${parseResult.error.message}`);
    }

    data = parseResult.data as TopLevelSpec;
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

export { getChartJSON, LR_CHARTS, SINGLE_CHARTS, VegaLiteSpecSchema };

export async function getAllChartJSON(): Promise<TopLevelSpec[]> {
  const chartJSON: (TopLevelSpec | null)[] = [];
  const promises: { promise: Promise<TopLevelSpec>; index: number }[] = [];
  for (const [, tableName] of Object.entries(LR_CHARTS)) {
    promises.push({
      promise: getChartJSON("LR", tableName),
      index: chartJSON.length,
    });
    chartJSON.push(null);
  }
  for (const [, tableName] of Object.entries(SINGLE_CHARTS)) {
    promises.push({
      promise: getChartJSON("SINGLE", tableName),
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
