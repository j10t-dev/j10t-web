import Head from 'next/head';
import React from 'react';
import { getAllChartJSON } from '../lib/chart_data';
import dynamic from 'next/dynamic';

// Import VegaEmbed with no SSR to avoid hydration issues
const VegaEmbed = dynamic(
  () => import('react-vega/lib/VegaEmbed'),
  { ssr: false }
);

function parse(jsonString) {
  return JSON.parse(jsonString);
}

export default function FirstPost(props) {
  return (
    <div className="container">
      <Head>
        <title>Measurements</title>
        <link rel="icon" href="/measure/icons/tape.ico" />
      </Head>
      <main>
        <h1>MEASUREMENTS</h1>

        <div id="vis">
        </div>

        {props.data.map((chartJson, index) => (
          <div key={index}> 
            <VegaEmbed 
              spec={parse(chartJson)}
              options={{
                loader: {
                  baseURL: '/measure/'
                },
                renderer: 'svg' // Try SVG renderer instead of canvas
              }}
            />
          </div>
        ))} 
      </main>
    </div>
  );
}

export async function getServerSideProps() {
  const data = await getAllChartJSON();
  return { props: { data } };
}
