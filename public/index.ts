import type { TopLevelSpec } from "https://esm.sh/vega-lite@5.16.3";

declare global {
  interface Window {
    vegaEmbed: (el: string, spec: TopLevelSpec, opts: { renderer: string; actions: boolean }) => Promise<unknown>;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  fetch('/api/charts')
    .then((r: Response) => r.json())
    .then((data: TopLevelSpec[]) => {
      const visContainer = document.getElementById('vis');
      if (!visContainer) return;
      visContainer.innerHTML = '';
      data.forEach((chartSpec: TopLevelSpec, index: number) => {
        const chartDiv = document.createElement('div');
        chartDiv.id = `chart-${index}`;
        chartDiv.className = 'chart-container';
        visContainer.appendChild(chartDiv);
        try {
          const spec: TopLevelSpec = typeof chartSpec === 'string' ? JSON.parse(chartSpec) : chartSpec;
          window.vegaEmbed(`#chart-${index}`, spec, {
            renderer: 'svg',
            actions: false
          }).catch((error: Error) => {
            console.error(`Failed to render chart ${index}:`, error);
            chartDiv.innerHTML = `<p>Failed to load chart</p>`;
          });
        } catch (error) {
          console.error(`Error parsing chart ${index}:`, error);
          chartDiv.innerHTML = `<p>Failed to parse chart data</p>`;
        }
      });
    })
    .catch((err: Error) => {
      const visContainer = document.getElementById('vis');
      if (visContainer) visContainer.innerHTML = '<p>Failed to load charts</p>';
      console.error('Failed to fetch chart data:', err);
    });
}); 