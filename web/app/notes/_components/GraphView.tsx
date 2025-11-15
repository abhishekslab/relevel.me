'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ZoomInIcon, ZoomOutIcon, MaximizeIcon } from 'lucide-react';

interface GraphNode {
  id: string;
  title: string;
  tags: string[];
  bodyLength: number;
  linkCount: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'wiki' | 'parent' | 'tag' | 'semantic';
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphViewProps {
  focusNoteId: string | null;
  onNodeClick: (noteId: string) => void;
}

export default function GraphView({ focusNoteId, onNodeClick }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  // Fetch graph data
  useEffect(() => {
    fetchGraphData();
  }, [focusNoteId]);

  const fetchGraphData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (focusNoteId) {
        params.append('focus', focusNoteId);
        params.append('depth', '2');
      }
      params.append('orphans', 'true');

      const res = await fetch(`/api/notes/graph?${params}`);
      if (res.ok) {
        const data = await res.json();
        setGraphData(data);
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render graph with D3
  useEffect(() => {
    if (!svgRef.current || !graphData || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous graph
    svg.selectAll('*').remove();

    // Create zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    // Create container group
    const g = svg.append('g');

    // Create force simulation
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.edges)
        .id((d: any) => d.id)
        .distance((d: any) => {
          // Shorter distance for stronger connections
          return d.type === 'wiki' ? 100 : d.type === 'parent' ? 80 : 150;
        })
        .strength((d: any) => d.weight)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    simulationRef.current = simulation;

    // Color scale for different link types
    const linkColorScale = d3.scaleOrdinal<string>()
      .domain(['wiki', 'parent', 'tag', 'semantic'])
      .range(['#a855f7', '#06b6d4', '#10b981', '#f59e0b']); // violet, cyan, emerald, amber

    // Size scale based on link count
    const nodeSizeScale = d3.scaleLinear()
      .domain([0, d3.max(graphData.nodes, d => d.linkCount) || 1])
      .range([6, 16]);

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.edges)
      .join('line')
      .attr('stroke', (d: any) => linkColorScale(d.type))
      .attr('stroke-opacity', (d: any) => d.weight * 0.6)
      .attr('stroke-width', (d: any) => d.weight * 2);

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .join('circle')
      .attr('r', (d: any) => nodeSizeScale(d.linkCount))
      .attr('fill', (d: any) => {
        // Highlight focused node
        if (d.id === focusNoteId) return '#a855f7';
        // Color by primary tag
        if (d.tags && d.tags.length > 0) {
          const tagHash = d.tags[0].split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const hue = tagHash % 360;
          return `hsl(${hue}, 60%, 50%)`;
        }
        return '#64748b'; // slate for untagged
      })
      .attr('stroke', (d: any) => d.id === focusNoteId ? '#fff' : 'none')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      )
      .on('click', (_event, d: any) => {
        onNodeClick(d.id);
      });

    // Add labels
    const label = g.append('g')
      .selectAll('text')
      .data(graphData.nodes)
      .join('text')
      .text((d: any) => d.title)
      .attr('font-size', 12)
      .attr('fill', '#fff')
      .attr('text-anchor', 'middle')
      .attr('dy', (d: any) => nodeSizeScale(d.linkCount) + 16)
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Add tooltips
    node.append('title')
      .text((d: any) => `${d.title}\n${d.linkCount} links\n${d.tags.length} tags`);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData, focusNoteId, onNodeClick]);

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).transition().call(
      (d3.zoom() as any).scaleBy,
      1.3
    );
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current).transition().call(
      (d3.zoom() as any).scaleBy,
      0.7
    );
  };

  const handleResetView = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      (d3.zoom() as any).transform,
      d3.zoomIdentity
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        Loading graph...
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <div className="text-center">
          <p className="mb-2">No notes to visualize yet.</p>
          <p className="text-sm">Create some notes and link them with [[wiki links]]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#0b0f17]">
      {/* Graph Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur"
          title="Zoom In"
        >
          <ZoomInIcon className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur"
          title="Zoom Out"
        >
          <ZoomOutIcon className="w-5 h-5 text-white" />
        </button>
        <button
          onClick={handleResetView}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur"
          title="Reset View"
        >
          <MaximizeIcon className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/10 backdrop-blur rounded-lg p-3">
        <div className="text-xs text-white/80 space-y-1.5">
          <div className="font-semibold mb-2">Link Types</div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-violet-500"></div>
            <span>Wiki Link</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-cyan-500"></div>
            <span>Parent/Child</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-emerald-500"></div>
            <span>Shared Tag</span>
          </div>
        </div>
      </div>

      {/* Graph Stats */}
      <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur rounded-lg px-3 py-2 text-sm text-white/80">
        {graphData.nodes.length} notes · {graphData.edges.length} connections
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ background: '#0b0f17' }}
      />
    </div>
  );
}
