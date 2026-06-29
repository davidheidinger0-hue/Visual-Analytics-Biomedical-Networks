import { useMemo, useRef, useEffect, useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
  
function NetworkOverview({ 
  elements,
  activeSenders,
  activeReceivers,
  weightThreshold,
  localSearch,
  lensMode = false,
  setLensMetadata = () => {},
  setBrushedNodes = () => {},
  setSelectedElement = () => {},
  activeTab
 }) {
  const cyRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [focusLegend, setFocusLegend] = useState(null);

  const formatNodeTooltip = (node) => {
    const score = node.data('betweenness_centrality') || 0;
    return [
      `<strong>Name:</strong> ${node.data('name') || node.data('id')}`,
      `<strong>ID:</strong> ${node.data('id')}`,
      `<strong>Molecule Type:</strong> ${node.data('moltype') || 'N/A'}`,
      `<strong>Cell Type:</strong> ${node.data('celltype') || 'N/A'}`,
      `<strong>BC Centrality:</strong> ${score.toFixed(4)}`
    ].join('<br/>');
  };

  const formatEdgeTooltip = (edge, cy) => {
    const srcNode = cy.getElementById(edge.data('source'));
    const tgtNode = cy.getElementById(edge.data('target'));
    const weight = edge.data('weight');
    return [
      `<strong>Source:</strong> ${edge.data('source')}${srcNode.nonempty() ? ` (${srcNode.data('name')})` : ''}`,
      `<strong>Target:</strong> ${edge.data('target')}${tgtNode.nonempty() ? ` (${tgtNode.data('name')})` : ''}`,
      `<strong>Weight:</strong> ${weight ?? 'N/A'}`,
      `<strong>Interaction Type:</strong> ${edge.data('type') || 'N/A'}`,
      `<strong>Layer:</strong> ${edge.data('layer') ?? 'N/A'}`
    ].join('<br/>');
  };

  const maxBcValue = useMemo(() => {
    if (!elements || !elements.nodes) return 0.001; 
    const max = Math.max(...elements.nodes.map(n => Math.sqrt(n.data.betweenness_centrality || 0)));
    return max > 0 ? max : 0.001;
  }, [elements]);

  // ADDED: Visual rules for :selected and .hovered states
  const cyStylesheet = useMemo(() => [
    { 
      selector: 'node', 
      style: { 
        'border-width': 1, 
        'border-color': '#fff',
        'width': `mapData(visual_score, 0, ${maxBcValue}, 12, 50)`,
        'height': `mapData(visual_score, 0, ${maxBcValue}, 12, 50)`
      } 
    },
    { selector: 'node[moltype = "TF"]', style: { 'background-color': '#ff7f0e' } },
    { selector: 'node[moltype = "ligand"]', style: { 'background-color': '#2ca02c' } },
    { selector: 'node[moltype = "receptor"]', style: { 'background-color': '#1f77b4' } },
    { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#eab308', 'background-color': '#eab308' } },
    { selector: 'node.hovered', style: { 'border-width': 3, 'border-color': '#10b981', 'z-index': 500 } },
    { selector: 'node.faded', style: { 'opacity': 0.12 } },
    { selector: 'node.focus-active', style: { 'border-width': 5, 'border-color': '#eab308', 'opacity': 1, 'z-index': 9999 } },
    { selector: 'node.focus-connected', style: { 'border-width': 3, 'border-color': '#60a5fa', 'opacity': 1, 'z-index': 8000 } },
    { selector: 'node.search-match', style: { 'border-width': 5, 'border-color': '#eab308', 'background-color': '#eab308', 'label': 'data(name)', 'z-index': 9999 } },
    { selector: 'node.lens-magnified', style: { 'width': 60, 'height': 60, 'label': 'data(name)', 'font-size': 14, 'z-index': 9999, 'border-width': 4, 'border-color': '#10b981', 'text-valign': 'center' } },
    { selector: 'edge', style: { 'width': 1, 'opacity': 0.15, 'curve-style': 'straight', 'line-color': '#bbb', 'target-arrow-shape': 'triangle', 'overlay-opacity': 0, 'overlay-padding': 6 } },
    { selector: 'edge[weight < 0]', style: { 'line-color': '#d62728', 'target-arrow-shape': 'tee' } },
    { selector: 'edge[weight > 0]', style: { 'line-color': '#2ca02c' } },
    { selector: 'edge.hovered', style: { 'opacity': 0.95, 'width': 3, 'z-index': 500 } },
    { selector: 'edge.faded', style: { 'opacity': 0.04 } },
    { selector: 'edge.focus-active', style: { 'opacity': 1, 'width': 4, 'line-color': '#eab308', 'z-index': 9999 } },
    { selector: 'edge.focus-connected', style: { 'opacity': 0.9, 'width': 2.5, 'z-index': 8000 } },
    { selector: 'edge.edge-outbound', style: { 'opacity': 1, 'width': 3.5, 'line-color': '#22c55e', 'z-index': 8500 } },
    { selector: 'edge.edge-inbound', style: { 'opacity': 1, 'width': 3.5, 'line-color': '#f97316', 'z-index': 8500 } }
  ], [maxBcValue]);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const processedElements = useMemo(() => {
    if (!elements || !elements.nodes || !elements.edges) return [];

    const nMap = new Map();
    elements.nodes.forEach(n => nMap.set(n.data.id, n.data));

    const edgeMap = new Map();
    elements.edges.forEach(edge => {
      const edgeKey = `${edge.data.source}->${edge.data.target}`;
      const currentWeight = Math.abs(edge.data.weight || 0);
      if (!edgeMap.has(edgeKey) || Math.abs(edgeMap.get(edgeKey).data.weight || 0) < currentWeight) {
        edgeMap.set(edgeKey, edge);
      }
    });

    const filteredEdges = Array.from(edgeMap.values()).filter(edge => {
      const srcNode = nMap.get(edge.data.source);
      const tgtNode = nMap.get(edge.data.target);
      if (!srcNode || !tgtNode) return false;

      if (activeSenders[srcNode.celltype] === false) return false;
      if (activeReceivers[tgtNode.celltype] === false) return false;

      return (edge.data.weight || 0) >= weightThreshold;
    });

    const connectedNodeIds = new Set();
    filteredEdges.forEach(edge => {
      connectedNodeIds.add(edge.data.source);
      connectedNodeIds.add(edge.data.target);
    });

    let tfCount = 0, ligandCount = 0, receptorCount = 0;
    const nodesPerRow = 10; 
    const spacing = 55;    

    const positionedNodes = elements.nodes
      .filter(node => connectedNodeIds.has(node.data.id))
      .map(node => {
        const type = node.data.moltype;
        let x = 0, y = 0;

        if (type === 'TF') { 
          x = (tfCount % nodesPerRow) * spacing;
          y = Math.floor(tfCount / nodesPerRow) * spacing;
          tfCount++;
        } else if (type === 'ligand') { 
          x = 850 + (ligandCount % nodesPerRow) * spacing; 
          y = Math.floor(ligandCount / nodesPerRow) * spacing;
          ligandCount++;
        } else if (type === 'receptor') { 
          x = 1700 + (receptorCount % nodesPerRow) * spacing; 
          y = Math.floor(receptorCount / nodesPerRow) * spacing;
          receptorCount++;
        }

        const rawScore = node.data.betweenness_centrality || 0;
        const visualScore = Math.sqrt(rawScore);

        return { 
          ...node, 
          data: { ...node.data, visual_score: visualScore },
          position: { x, y } 
        };
      });

    return [...positionedNodes, ...filteredEdges];
  }, [elements, activeSenders, activeReceivers, weightThreshold]);

  useEffect(() => {
    if (cyRef.current && (!activeTab || activeTab === 'graph')) {
      const cy = cyRef.current;
      cy.nodes().removeClass('search-match');
    
      if (localSearch?.trim()) {
        const searchLower = localSearch.toLowerCase();
        const matches = cy.nodes().filter(node => {
          return (node.data('name') || '').toLowerCase().includes(searchLower) || (node.data('id') || '').toLowerCase().includes(searchLower);
        });

        if (matches.length > 0) {
          matches.addClass('search-match');
          cy.animate({ center: { eles: matches.first() }, zoom: 1.2 }, { duration: 450 });
        }
      }
    }
  }, [localSearch, activeTab]);

  useEffect(() => {
    if (cyRef.current && (!activeTab || activeTab === 'graph')) {
      const cy = cyRef.current;
      cy.fit(cy.elements(), 40);

      const clearFocus = () => {
        cy.elements().removeClass('faded focus-active focus-connected hovered edge-outbound edge-inbound');
        setFocusLegend(null);
        setSelectedElement(null);
      };

      const buildNodeSelection = (node) => {
        const nodeId = node.data('id');
        const nodeData = node.data();
        const outbound = [];
        const inbound = [];

        node.connectedEdges().forEach(edge => {
          const isOutbound = edge.data('source') === nodeId;
          const neighbor = isOutbound ? edge.target() : edge.source();
          const entry = {
            id: neighbor.data('id'),
            name: neighbor.data('name'),
            moltype: neighbor.data('moltype'),
            celltype: neighbor.data('celltype'),
            weight: edge.data('weight'),
            type: edge.data('type')
          };

          if (isOutbound) outbound.push(entry);
          else inbound.push(entry);
        });

        return {
          kind: 'node',
          data: { ...nodeData },
          connections: { outbound, inbound }
        };
      };

      const buildEdgeSelection = (edge) => {
        const source = edge.source();
        const target = edge.target();

        return {
          kind: 'edge',
          data: { ...edge.data() },
          sourceNode: source.nonempty() ? { ...source.data() } : null,
          targetNode: target.nonempty() ? { ...target.data() } : null
        };
      };

      const applyNodeFocus = (node) => {
        clearFocus();
        const nodeId = node.data('id');
        const connectedEdges = node.connectedEdges();
        const neighbors = connectedEdges.connectedNodes();

        cy.elements().addClass('faded');
        node.removeClass('faded').addClass('focus-active');
        neighbors.removeClass('faded').addClass('focus-connected');

        let outboundCount = 0;
        let inboundCount = 0;

        connectedEdges.removeClass('faded').forEach(edge => {
          if (edge.data('source') === nodeId) {
            edge.addClass('edge-outbound');
            outboundCount++;
          } else {
            edge.addClass('edge-inbound');
            inboundCount++;
          }
        });

        setSelectedElement(buildNodeSelection(node));
      };

      const applyEdgeFocus = (edge) => {
        clearFocus();
        const highlighted = edge.union(edge.source()).union(edge.target());
        cy.elements().addClass('faded');
        highlighted.removeClass('faded');
        edge.addClass('focus-active');
        edge.source().addClass('focus-connected');
        edge.target().addClass('focus-connected');
        setSelectedElement(buildEdgeSelection(edge));
      };

      const showTooltip = (event, content) => {
        setTooltip({
          x: event.renderedPosition.x,
          y: event.renderedPosition.y,
          content
        });
      };

      // --- ANALYTICAL LENS ---
      cy.on('mousemove', (event) => {
        if (!lensMode) return;
        
        const radius = 100;
        const mousePos = event.position;

        cy.nodes().removeClass('lens-magnified');

        const nodesInRadius = cy.nodes().filter(node => {
          const nodePos = node.position();
          const dx = nodePos.x - mousePos.x;
          const dy = nodePos.y - mousePos.y;
          return Math.sqrt(dx * dx + dy * dy) <= radius;
        });

        nodesInRadius.addClass('lens-magnified');
      });

      // --- NODE HOVER ---
      cy.on('mouseover', 'node', (event) => {
        const node = event.target;
        if (!node) return;

        if (lensMode) {
          const score = node.data('betweenness_centrality') || 0;
          setLensMetadata({
            id: node.data('id'),
            name: node.data('name'),
            moltype: node.data('moltype'),
            celltype: node.data('celltype'),
            metric: score.toFixed(4)
          });
        } else {
          node.addClass('hovered');
          showTooltip(event, formatNodeTooltip(node));
        }
      });

      cy.on('mousemove', 'node', (event) => {
        if (lensMode) return;
        showTooltip(event, formatNodeTooltip(event.target));
      });

      cy.on('mouseout', 'node', (event) => {
        if (event.target) event.target.removeClass('hovered');
        setTooltip(null);
        setLensMetadata(null);
      });

      // --- EDGE HOVER ---
      cy.on('mouseover', 'edge', (event) => {
        const edge = event.target;
        if (!edge) return;
        edge.addClass('hovered');
        showTooltip(event, formatEdgeTooltip(edge, cy));
      });

      cy.on('mousemove', 'edge', (event) => {
        showTooltip(event, formatEdgeTooltip(event.target, cy));
      });

      cy.on('mouseout', 'edge', (event) => {
        if (event.target) event.target.removeClass('hovered');
        setTooltip(null);
      });

      cy.on('mouseout', (event) => {
        if (event.target === cy && lensMode) {
          cy.nodes().removeClass('lens-magnified');
        }
      });

      // --- CLICK FOCUS ---
      cy.on('tap', 'node', (event) => {
        applyNodeFocus(event.target);
      });

      cy.on('tap', 'edge', (event) => {
        applyEdgeFocus(event.target);
      });

      cy.on('tap', (event) => {
        if (event.target === cy) {
          clearFocus();
        }
      });

      // --- SELECTION / BRUSHING LOGIC ---
      const handleSelectionChange = () => {
        const selections = cy.nodes(':selected').map(node => {
          const nId = node.data('id');
          const interactions = node.connectedEdges().map(edge => {
            const isSrc = edge.data('source') === nId;
            const targetNode = isSrc ? edge.target() : edge.source();
            return {
              role: isSrc ? 'Outbound Target' : 'Inbound Source',
              name: targetNode.data('name') || targetNode.data('id'),
              type: targetNode.data('moltype'),
              cell: targetNode.data('celltype') || 'N/A'
            };
          });
          return {
            id: nId,
            name: node.data('name'),
            moltype: node.data('moltype'),
            celltype: node.data('celltype') || 'N/A',
            metric: (node.data('betweenness_centrality') || 0).toFixed(4),
            interactions
          };
        });
        setBrushedNodes(selections);
      };
      
      cy.on('select unselect boxselect', 'node', handleSelectionChange);
      
      return () => {
        cy.off('mouseover', 'node');
        cy.off('mousemove', 'node');
        cy.off('mouseout', 'node');
        cy.off('mouseover', 'edge');
        cy.off('mousemove', 'edge');
        cy.off('mouseout', 'edge');
        cy.off('tap', 'node');
        cy.off('tap', 'edge');
        cy.off('tap');
        cy.off('select unselect boxselect', 'node');
        cy.off('mousemove');
        cy.off('mouseout');
      };
    }
  }, [processedElements, activeTab, lensMode, setLensMetadata, setBrushedNodes, setSelectedElement]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <CytoscapeComponent 
        elements={processedElements} 
        style={{ width: '100%', height: '100%' }} 
        stylesheet={cyStylesheet} 
        layout={{ name: 'preset' }} 
        boxSelectionEnabled={true} 
        cy={(cy) => { cyRef.current = cy; }} 
      />
      {tooltip && !lensMode && (
        <div style={{ position: 'absolute', top: tooltip.y + 12, left: tooltip.x + 12, backgroundColor: 'rgba(15, 23, 42, 0.95)', color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '11px', lineHeight: 1.5, pointerEvents: 'none', zIndex: 1000, maxWidth: '280px', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }} dangerouslySetInnerHTML={{ __html: tooltip.content }} />
      )}
      {focusLegend && (
        <div style={{ position: 'absolute', bottom: 16, left: 16, backgroundColor: 'rgba(15, 23, 42, 0.92)', color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '11px', lineHeight: 1.6, pointerEvents: 'none', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Edge Direction</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: 24, height: 3, backgroundColor: '#22c55e', display: 'inline-block', borderRadius: 2 }} />
            <span>Away from node ({focusLegend.outbound})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: 24, height: 3, backgroundColor: '#f97316', display: 'inline-block', borderRadius: 2 }} />
            <span>Toward node ({focusLegend.inbound})</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkOverview;