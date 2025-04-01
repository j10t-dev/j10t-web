window.addEventListener('DOMContentLoaded', () => {
  fetch('/api/charts')
    .then(r => r.json())
    .then(data => {
      const visContainer = document.getElementById('vis');
      if (!visContainer) return;
      visContainer.innerHTML = '';
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
    })
    .catch(err => {
      const visContainer = document.getElementById('vis');
      if (visContainer) visContainer.innerHTML = '<p>Failed to load charts</p>';
      console.error('Failed to fetch chart data:', err);
    });
});
