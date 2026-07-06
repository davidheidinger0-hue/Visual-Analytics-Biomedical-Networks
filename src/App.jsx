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
          setSelectedElement={setSelectedElement}
        />
      </div>
      <div style={{ width: '340px', backgroundColor: '#f8f9fa', borderLeft: '1px solid #ddd', overflowY: 'auto' }}>
        <SidebarMetadata selection={selectedElement} />
      </div>
    </div>
  );
}

export default App;
