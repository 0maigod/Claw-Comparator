import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const D3BarChart = ({ data, width = 600, height = 300, minimal = false }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;
    d3.select(chartRef.current).selectAll('*').remove();

    const margin = minimal 
      ? { top: 10, right: 10, bottom: 10, left: 25 } 
      : { top: 20, right: 20, bottom: 100, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Escalas
    const x0 = d3.scaleBand()
      .domain(data.map(d => d.agent_name))
      .rangeRound([0, innerWidth])
      .paddingInner(0.2);

    const keys = ['lines_added', 'lines_removed'];
    const x1 = d3.scaleBand()
      .domain(keys)
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    const yMax = d3.max(data, d => Math.max(d.lines_added, d.lines_removed)) || 10;
    
    const y = d3.scaleLinear()
      .domain([0, yMax])
      .range([innerHeight, 0]);

    const z = d3.scaleOrdinal()
      .domain(keys)
      .range(['#1e3a5f', '#f2994a']); // Navy / Orange

    // Ejes
    if (!minimal) {
      svg.append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
        .style('fill', 'var(--color-text-secondary)')
        .style('font-family', 'var(--font-family-base)')
        .style('font-size', '12px')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    }

    // Quitar línea del eje Y por minimalismo premium
    svg.append('g')
      .call(d3.axisLeft(y).ticks(minimal ? 3 : 5).tickSize(-innerWidth))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line')
        .attr('stroke', 'rgba(0,0,0,0.05)')
        .attr('stroke-dasharray', '2,2')
      )
      .call(g => g.selectAll('.tick text')
        .style('fill', 'var(--color-text-secondary)')
        .style('font-size', minimal ? '10px' : '12px')
      );

    // Barras
    svg.append('g')
      .selectAll('g')
      .data(data)
      .enter().append('g')
      .attr('transform', d => `translate(${x0(d.agent_name)},0)`)
      .selectAll('rect')
      .data(d => keys.map(k => ({ key: k, value: d[k] })))
      .enter().append('rect')
      .attr('x', d => x1(d.key))
      .attr('y', d => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', d => innerHeight - y(d.value))
      .attr('fill', d => z(d.key))
      .attr('rx', 3) // bordes redondeados ligeros
      .attr('ry', 3);
      
  }, [data, width, height]);

  return <div ref={chartRef} style={{ width: '100%', overflowX: 'auto' }} />;
};

export default D3BarChart;
