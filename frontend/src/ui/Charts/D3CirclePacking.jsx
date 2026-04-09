import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

/**
 * D3CirclePacking: Visualiza conceptos añadidos (adentro), eliminados (afuera) y mutados (anillo).
 * Props:
 *  - added_concepts, removed_concepts, mutated_concepts: arrays de { concept, size }
 *  - labelA: nombre del sistema A (izquierda en el form)
 *  - labelB: nombre del sistema B (derecha en el form)
 *  - onConceptClick: callback al hacer clic en un nodo
 */
const D3CirclePacking = ({
    added_concepts = [],
    removed_concepts = [],
    mutated_concepts = [],
    labelA = 'Sistema A',
    labelB = 'Sistema B',
    width = 700,
    height = 460,
    onConceptClick
}) => {
    const svgRef = useRef(null);

    useEffect(() => {
        const hasData = added_concepts.length > 0 || removed_concepts.length > 0 || mutated_concepts.length > 0;
        if (!hasData) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = 20;
        const mainRadius = Math.min(width, height) / 2 - margin - 30; // -30 para dejar espacio a leyenda

        // --- ZOOM SETUP ---
        const zoomWrapper = svg.append('g').attr('class', 'zoom-wrapper');
        svg.call(d3.zoom().scaleExtent([0.4, 6]).on('zoom', (e) => zoomWrapper.attr('transform', e.transform)));

        const g = zoomWrapper.append('g').attr('transform', `translate(${width / 2}, ${height / 2 - 15})`);

        // --- OUTER MEMBRANE: zone boundary circle ---
        g.append('circle')
            .attr('r', mainRadius)
            .style('fill', 'rgba(37, 99, 235, 0.04)')
            .style('stroke', 'rgba(37, 99, 235, 0.25)')
            .style('stroke-dasharray', '6 4')
            .style('stroke-width', '1.5px');

        // --- MUTATION RING (middle zone): visual reference circle ---
        if (mutated_concepts.length > 0) {
            g.append('circle')
                .attr('r', mainRadius * 1.42)
                .style('fill', 'none')
                .style('stroke', 'rgba(234, 179, 8, 0.25)')
                .style('stroke-dasharray', '6 4')
                .style('stroke-width', '1.5px');
        }

        const renderNodes = (concepts, selector, colorRange, getTransform, getRadius, titlePrefix) => {
            const nodes = g.selectAll(selector)
                .data(concepts)
                .enter().append('g')
                .attr('class', selector.replace('.', ''))
                .attr('transform', getTransform)
                .style('cursor', 'pointer')
                .on('mouseover', function () { d3.select(this).select('circle').attr('stroke', '#fff').attr('stroke-width', 2); })
                .on('mouseout', function () { d3.select(this).select('circle').attr('stroke', null); })
                .on('click', (event, d) => onConceptClick && onConceptClick(d));

            const colorScale = d3.scaleOrdinal().range(colorRange);

            nodes.append('circle')
                .attr('r', getRadius)
                .style('fill', (d, i) => colorScale(i))
                .style('opacity', 0.88);

            nodes.append('title').text(d => `${titlePrefix} ${d.concept} (Peso: ${d.size})`);

            nodes.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', '0.35em')
                .style('fill', '#fff')
                .style('font-size', d => Math.min(getRadius(d) / 3, 13) + 'px')
                .style('font-weight', '600')
                .style('pointer-events', 'none')
                .style('opacity', d => getRadius(d) > 18 ? 1 : 0)
                .text(d => {
                    const r = getRadius(d);
                    const max = Math.max(3, Math.floor(r / 4));
                    return d.concept.length > max ? d.concept.slice(0, max) + '…' : d.concept;
                });
        };

        // --- CORE: Added (inside membrane) ---
        if (added_concepts.length > 0) {
            const root = d3.hierarchy({ children: added_concepts }).sum(d => d.size || 10).sort((a, b) => b.value - a.value);
            const packed = d3.pack().size([mainRadius * 1.7, mainRadius * 1.7]).padding(5)(root).leaves();
            const offset = mainRadius * 0.85;
            renderNodes(
                packed, '.node-added',
                ['#3b82f6', '#2563eb', '#1d4ed8', '#60a5fa', '#93c5fd'],
                d => `translate(${d.x - offset}, ${d.y - offset})`,
                d => d.r,
                '+'
            );
        }

        // --- ORBIT: Removed (outside membrane) ---
        if (removed_concepts.length > 0) {
            const step = (Math.PI * 2) / removed_concepts.length;
            const orbitBase = mainRadius * 1.2;
            renderNodes(
                removed_concepts.map((d, i) => {
                    const r = Math.max((d.size / 100) * 30, 14);
                    const angle = i * step;
                    d._x = Math.cos(angle) * (orbitBase + r);
                    d._y = Math.sin(angle) * (orbitBase + r);
                    d._r = r;
                    return d;
                }),
                '.node-removed',
                ['#ef4444', '#dc2626', '#b91c1c', '#f87171'],
                d => `translate(${d._x}, ${d._y})`,
                d => d._r,
                '-'
            );
        }

        // --- RING: Mutated (between membranes) ---
        if (mutated_concepts.length > 0) {
            const step = (Math.PI * 2) / mutated_concepts.length;
            const ringBase = mainRadius * 1.08;
            renderNodes(
                mutated_concepts.map((d, i) => {
                    const r = Math.max((d.size / 100) * 22, 12);
                    const angle = i * step + Math.PI / mutated_concepts.length; // offset to avoid overlap with removed
                    d._x = Math.cos(angle) * (ringBase + r);
                    d._y = Math.sin(angle) * (ringBase + r);
                    d._r = r;
                    return d;
                }),
                '.node-mutated',
                ['#eab308', '#ca8a04', '#f59e0b', '#fbbf24'],
                d => `translate(${d._x}, ${d._y})`,
                d => d._r,
                '~'
            );
        }

        // --- LEGEND (SVG, bottom of chart) ---
        const legend = svg.append('g').attr('transform', `translate(${width / 2}, ${height - 28})`);
        const legendItems = [
            { color: '#3b82f6', label: `Innovaciones en ${labelB}` },
            { color: '#f59e0b', label: 'Mutados (transformados)' },
            { color: '#ef4444', label: `Purgado de ${labelA}` },
        ];
        const itemWidth = 190;
        const totalWidth = legendItems.length * itemWidth;
        legendItems.forEach((item, i) => {
            const x = -totalWidth / 2 + i * itemWidth;
            const group = legend.append('g').attr('transform', `translate(${x}, 0)`);
            group.append('circle').attr('r', 6).style('fill', item.color);
            group.append('text')
                .attr('x', 12).attr('y', 4)
                .style('font-size', '11px')
                .style('fill', '#64748b')
                .text(item.label);
        });

    }, [added_concepts, removed_concepts, mutated_concepts, labelA, labelB, width, height, onConceptClick]);

    return (
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <svg ref={svgRef} width={width} height={height} />
        </div>
    );
};

export default D3CirclePacking;
