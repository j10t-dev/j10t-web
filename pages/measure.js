import Head from 'next/head';
import { useEffect } from 'react';
import { getAllChartJSON } from '../lib/chart_data';

export default function Measure({ data }) {
  useEffect(() => {
    // Make sure Vega libraries are loaded
    if (window.vegaEmbed) {
      renderCharts();
    } else {
      // If Vega isn't loaded yet, wait for it
      const checkVega = setInterval(() => {
        if (window.vegaEmbed) {
          clearInterval(checkVega);
          renderCharts();
        }
      }, 100);

      // Clear interval if component unmounts
      return () => clearInterval(checkVega);
    }

    function renderCharts() {
      const visContainer = document.getElementById('vis');
      if (!visContainer) return;

      // Clear any existing content
      visContainer.innerHTML = '';

      // Render each chart
      data.forEach((chartSpec, index) => {
        const chartDiv = document.createElement('div');
        chartDiv.id = `chart-${index}`;
        chartDiv.className = 'chart-container';
        visContainer.appendChild(chartDiv);

        try {
          const spec = typeof chartSpec === 'string' ? JSON.parse(chartSpec) : chartSpec;
          window.vegaEmbed(`#chart-${index}`, spec, {
            renderer: 'svg',
            actions: false
          }).catch(error => {
            console.error(`Failed to render chart ${index}:`, error);
            chartDiv.innerHTML = `<p>Failed to load chart</p>`;
          });
        } catch (error) {
          console.error(`Error parsing chart ${index}:`, error);
          chartDiv.innerHTML = `<p>Failed to parse chart data</p>`;
        }
      });
    }
  }, [data]);

  return (
    <div className="container">
      <Head>
        <title>Measurements</title>
        <link rel="icon" href="/measure/icons/tape.ico" />
        {/* Ensure Vega libraries are loaded */}
        <script src="https://cdn.jsdelivr.net/npm/vega@5"></script>
        <script src="https://cdn.jsdelivr.net/npm/vega-lite@5"></script>
        <script src="https://cdn.jsdelivr.net/npm/vega-embed@6"></script>
      </Head>
      <main>
        <h1>MEASUREMENTS</h1>
        <div id="vis"></div>
      </main>
      <style jsx>{`
        .chart-container {
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
}

export async function getServerSideProps() {
  try {
    const chartData = await getAllChartJSON();
    return {
      props: {
        data: chartData
      }
    };
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return {
      props: {
        data: []
      }
    };
  }
}
