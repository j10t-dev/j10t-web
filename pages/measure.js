import Head from 'next/head';
import { VegaLite } from 'react-vega';
import React from 'react';
import { getAllChartJSON } from '../lib/chart_data';
import VegaEmbed from 'react-vega/lib/VegaEmbed';

function parse(jsonString) {
  return JSON.parse(jsonString)
}

export default function FirstPost(props) {
    return (
    <div className="container">
    <Head>
      <title>Measurements</title>
      <link rel="icon" href="icons/tape.ico" />
    </Head>
      <main>
        <h1>MEASUREMENTS</h1>

        <div id="vis">
        </div>

      {props.data.map((chartJson) => (
        <div> 
          <VegaEmbed spec={parse(chartJson)}/>
        </div>)
      )} 
      </main>
    </div>
    )
  }

  export async function getServerSideProps() {
    // Fetch data from external API
    const data = await getAllChartJSON()
    // Pass data to the page via props
    return { props: { data } }
  }

  