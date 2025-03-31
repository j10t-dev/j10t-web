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
    try {
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
    } catch (error) {
        console.error(`Error fetching chart data for ${type}:`, error);
        // Return cached data even if expired
        if (chartCache[cacheKey]) {
            return chartCache[cacheKey].data;
        }
        throw error; // Re-throw if no cached data
    }
}

// Cache for individual chart requests that have completed
async function getAllChartJSON() {
    const chartJSON = [];
    const promises = [];

    // Create all promises but don't await them yet
    for (var exe in LR_CHARTS) {
        promises.push({
            promise: getChartJSON(LR, LR_CHARTS[exe], "hover"),
            index: chartJSON.length
        });
        chartJSON.push(null); // Reserve spot in array
    }

    for (var exe in SINGLE_CHARTS) {
        promises.push({
            promise: getChartJSON(SINGLE, SINGLE_CHARTS[exe], "hover"),
            index: chartJSON.length
        });
        chartJSON.push(null); // Reserve spot in array
    }

    // Process all promises, even if some fail
    await Promise.allSettled(promises.map(async (item) => {
        try {
            const result = await item.promise;
            chartJSON[item.index] = result;
        } catch (error) {
            console.error(`Failed to load chart at index ${item.index}:`, error);
            // Leave as null to indicate missing data
        }
    }));

    // Filter out any null entries (failed requests)
    return chartJSON.filter(chart => chart !== null);
}

export {getAllChartJSON}
