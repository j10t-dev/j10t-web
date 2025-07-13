import type { TopLevelSpec } from "https://esm.sh/vega-lite@5.16.3";

declare global {
  interface Window {
    vegaEmbed: (
      el: string,
      spec: TopLevelSpec,
      opts: { renderer: string; actions: boolean },
    ) => Promise<unknown>;
  }
}

// Chart definitions matching backend
const CHARTS = [
  { type: 'lr', name: 'Calves' },
  { type: 'lr', name: 'Thighs' },
  { type: 'lr', name: 'Forearms' },
  { type: 'lr', name: 'Biceps' },
  { type: 'single', name: 'Weight' },
  { type: 'single', name: 'Hips' },
  { type: 'single', name: 'Waist' },
  { type: 'single', name: 'Chest' },
];

async function loadChart(type: string, name: string, chartDiv: HTMLElement): Promise<void> {
  try {
    const response = await fetch(`/api/charts/${type}/${name.toLowerCase()}`);
    if (!response.ok) return;
    
    const chartSpec = await response.json();
    await (globalThis as typeof window).vegaEmbed(chartDiv, chartSpec, {
      renderer: "svg",
      actions: false,
    });
  } catch (_error) {
    chartDiv.innerHTML = `<p>Failed to load ${name} chart</p>`;
  }
}

globalThis.addEventListener("DOMContentLoaded", () => {
  const visContainer = document.getElementById("vis");
  if (!visContainer) return;
  
  visContainer.innerHTML = "";
  
  // Create containers and start parallel loading
  CHARTS.forEach((chart, index) => {
    const chartDiv = document.createElement("div");
    chartDiv.id = `chart-${index}`;
    chartDiv.className = "chart-container";
    visContainer.appendChild(chartDiv);
    
    // Start loading immediately
    loadChart(chart.type, chart.name, chartDiv);
  });
});
