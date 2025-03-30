import { LR_CHARTS, SINGLE_CHARTS, CHART_API_URL } from "./constants";
import axios from "axios";

const SINGLE = "SINGLE"
const LR = "LR"

// Simple in-memory cache
const chartCache = {};
const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

async function getChartJSON(type, index_data) {
    // Create a cache key
    const cacheKey = `${type}_${JSON.stringify(index_data)}`;

    // Check if we have a valid cached response
    if (chartCache[cacheKey] && (Date.now() - chartCache[cacheKey].timestamp < CACHE_EXPIRY)) {
        return chartCache[cacheKey].data;
    }

    // Original code unchanged
    let res;
    let data;
    switch (type) {
        case SINGLE:
            res = await axios.post(CHART_API_URL + "/single", {"index": index_data, "style": "hover"});
            break;
        case LR:
            res = await axios.post(CHART_API_URL + "/LR", {"index_L": index_data[0], "index_R": index_data[1], "style": "hover"});
            break;
        default:
            throw new exception();
    }

    data = res.data;

    // Store in cache
    chartCache[cacheKey] = {
        data: data,
        timestamp: Date.now()
    };

    return data;
}

// Cache for the complete result
let allChartsCache = null;
let allChartsCacheTimestamp = null;

async function getAllChartJSON() {
    // Check if we have a valid cached complete response
    if (allChartsCache && (Date.now() - allChartsCacheTimestamp < CACHE_EXPIRY)) {
        return allChartsCache;
    }

    // Original code unchanged
    const chartJSON = []

    for (var exe in LR_CHARTS) {
        chartJSON.push(await getChartJSON(LR, LR_CHARTS[exe], "hover"))
    }
    for (var exe in SINGLE_CHARTS) {
        chartJSON.push(await getChartJSON(SINGLE, SINGLE_CHARTS[exe], "hover"))
    }

    // Store complete result in cache
    allChartsCache = chartJSON;
    allChartsCacheTimestamp = Date.now();

    return chartJSON
}

export {getAllChartJSON}
