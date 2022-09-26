import { LR_CHARTS, SINGLE_CHARTS, CHART_API_URL } from "./constants";
import axios from "axios";

const SINGLE = "SINGLE"
const LR = "LR"

async function getChartJSON(type, index_data) {
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
    return data;
}

async function getAllChartJSON() {
    const chartJSON = []

    for (var exe in LR_CHARTS) {
        chartJSON.push(await getChartJSON(LR, LR_CHARTS[exe], "hover"))
    }
    for (var exe in SINGLE_CHARTS) {
        chartJSON.push(await getChartJSON(SINGLE, SINGLE_CHARTS[exe], "hover"))
    }
    return chartJSON
}


export {getAllChartJSON}