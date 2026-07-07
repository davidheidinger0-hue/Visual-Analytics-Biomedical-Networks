import { useState, useMemo } from 'react';
import NetworkOverview from './NetworkOverview';
import SidebarStats from './SidebarStats';
import SidebarMetadata from './SidebarMetadata';
import rawNetworkData from './network_data.json';

function App() {
  const initialElements = rawNetworkData.elements;

  const uniqueCellTypes = useMemo(() => {
    const types = new Set();
    initialElements.edges.forEach(e => {
      if (e.data.source_celltype) types.add(e.data.source_celltype);
      if (e.data.target_celltype) types.add(e.data.target_celltype);
    });
    return Array.from(types).sort();
  }, [initialElements]);

  // M1 filtering
  const [localSearch, setLocalSearch] = useState('');
  const [activeSenders, setActiveSenders] = useState({});
  const [activeReceivers, setActiveReceivers] = useState({});
  const [weightThreshold, setWeightThreshold] = useState(-1);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedMolType, setSelectedMolType] = useState(null);
  const [brushedNodes, setBrushedNodes] = useState([]);
  const [lensMode, setLensMode] = useState(false);

  // Filter network
  const filteredElements = useMemo(() => {
    const searchLower = localSearch.toLowerCase();

    // edge filtering from sidebar inputs
    let edges = initialElements.edges.filter(edge => {
      const d = edge.data;
      const weightPasses = d.weight === null || d.weight >= weightThreshold;
      const senderPasses = activeSenders[d.source_celltype] !== false;
      const receiverPasses = activeReceivers[d.target_celltype] !== false;
      const matchesSearch = localSearch === '' ||
        d.source.toLowerCase().includes(searchLower) ||
        d.target.toLowerCase().includes(searchLower);
      return weightPasses && senderPasses && receiverPasses && matchesSearch;
    });

    // Create a node map lookup for molecule type evaluation
    const nodeMap = new Map(initialElements.nodes.map(n => [n.data.id, n.data]));

    if (selectedMolType) {
      const targetType = selectedMolType.toLowerCase();
      edges = edges.filter(edge => {
        const srcNode = nodeMap.get(edge.data.source);
        const tgtNode = nodeMap.get(edge.data.target);

        // Retain edges connected directly to the chosen molecule type
        const srcMatch = srcNode && srcNode.moltype?.toLowerCase() === targetType;
        const tgtMatch = tgtNode && tgtNode.moltype?.toLowerCase() === targetType;
        return srcMatch || tgtMatch;
      });
    }

    const validNodeIds = new Set();
    edges.forEach(e => {
      validNodeIds.add(e.data.source);
      validNodeIds.add(e.data.target);
    });
    const nodes = initialElements.nodes.filter(n => validNodeIds.has(n.data.id));

    return { nodes, edges };
  }, [initialElements, activeSenders, activeReceivers, weightThreshold, localSearch, selectedMolType]);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
      <div style={{ width: '380px', backgroundColor: '#f8f9fa', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
        {/* Pass state and setter down to SidebarStats */}
        <SidebarStats
          nodes={filteredElements.nodes}
          cellTypes={uniqueCellTypes}
          activeSenders={activeSenders}
          setActiveSenders={setActiveSenders}
          activeReceivers={activeReceivers}
          setActiveReceivers={setActiveReceivers}
          weightThreshold={weightThreshold}
          setWeightThreshold={setWeightThreshold}
          localSearch={localSearch}
          setLocalSearch={setLocalSearch}
          selectedMolType={selectedMolType}
          setSelectedMolType={setSelectedMolType}
        />
      </div>
      <div style={{ flexGrow: 1, position: 'relative', backgroundColor: '#ffffff' }}>
        <NetworkOverview
          elements={filteredElements}
          activeSenders={activeSenders}
          activeReceivers={activeReceivers}
          weightThreshold={weightThreshold}
          localSearch={localSearch}
          setBrushedNodes={setBrushedNodes}
          setSelectedElement={setSelectedElement}
          lensMode={lensMode}
        />
      </div>
      <div style={{ width: '340px', backgroundColor: '#f8f9fa', borderLeft: '1px solid #ddd', overflowY: 'auto' }}>
        <SidebarMetadata selection={selectedElement} brushedNodes={brushedNodes} />
        <div style={{ padding: '10px', position: 'sticky', top: 0, backgroundColor: '#f8f9fa', zIndex: 10 }}>
          <button
            onClick={() => setLensMode(!lensMode)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: lensMode ? '#0891b2' : '#e2e8f0',
              color: lensMode ? '#fff' : '#334155',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {lensMode ? 'Magnification Lens: ON' : 'Magnification Lens: OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
