import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const CHART_COLORS = ['#1e3a5f', '#f2994a', '#cbd5e0', '#4a5568'];

const D3RingChart = ({ data, width = 200, height = 200 }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Regla: Atomicidad visual - limpiamos el lienzo
    d3.select(chartRef.current).selectAll('*').remove();

    const radius = Math.min(width, height) / 2;
    // Utilizamos el color brand accent (naranja) y el dark navy
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.label))
      .range(CHART_COLORS);

    const svg = d3.select(chartRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie()
      .value(d => d.value)
      .sort(null);

    // Dynamic stroke to maintain white space between slices (Premium Vibe)
    const arc = d3.arc()
      .innerRadius(radius - 25)
      .outerRadius(radius)
      .padAngle(0.04)
      .cornerRadius(4);

    const arcs = svg.selectAll('.arc')
      .data(pie(data))
      .enter()
      .append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .style('fill', d => color(d.data.label))
      .style('stroke', 'var(--color-bg-card)')
      .style('stroke-width', '2px')
      .style('transition', 'all 0.3s')
      .on('mouseover', function() { d3.select(this).style('opacity', 0.8) })
      .on('mouseout', function() { d3.select(this).style('opacity', 1) })
      .append('title')
      .text(d => `${d.data.label}: ${d.data.value} líneas expuestas`);
      
    // Text in center
    const total = d3.sum(data, d => d.value);
    
    // Total Number
    svg.append('text')
       .attr('text-anchor', 'middle')
       .attr('dy', '-0.1em')
       .style('font-size', '1.4rem')
       .style('font-weight', '700')
       .style('fill', 'var(--color-text-primary)')
       .text(Math.round(total));
       
    // Sublabel
    svg.append('text')
       .attr('text-anchor', 'middle')
       .attr('dy', '1.2em')
       .style('font-size', '0.75rem')
       .style('fill', 'var(--color-text-secondary)')
       .text('Líneas');

  }, [data, width, height]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div ref={chartRef} style={{ display: 'flex', justifyContent: 'center' }} />
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {data && data.map((d, i) => (
          <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}></span>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default D3RingChart;
