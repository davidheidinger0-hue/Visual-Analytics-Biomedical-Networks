import { useState, useMemo } from 'react';
import NetworkOverview from './NetworkOverview';
import SidebarStats from './SidebarStats';
import rawNetworkData from './network_data.json';

function App() {
  const initialElements = rawNetworkData.elements;

  // Dynamically extract all unique cell types
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

  // Filter network
  const filteredElements = useMemo(() => {
    // Define searchLower before using it in the loop
    const searchLower = localSearch.toLowerCase();

    const edges = initialElements.edges.filter(edge => {
      const d = edge.data;
      
      // Layer 3 has no weight
      const weightPasses = d.weight === null || d.weight >= weightThreshold;
      
      // Check sender and receiver cell types
      const senderPasses = activeSenders[d.source_celltype] !== false;
      const receiverPasses = activeReceivers[d.target_celltype] !== false;
      
      // M2 filtering
      const matchesSearch = localSearch === '' ||
                            d.source.toLowerCase().includes(searchLower) || 
                            d.target.toLowerCase().includes(searchLower);

      return weightPasses && senderPasses && receiverPasses && matchesSearch;
    });
    
    // Only keep valid nodes
    const validNodeIds = new Set();
    edges.forEach(e => {
      validNodeIds.add(e.data.source);
      validNodeIds.add(e.data.target);
    });
    
    const nodes = initialElements.nodes.filter(n => validNodeIds.has(n.data.id));

    return { nodes, edges };
  }, [initialElements, activeSenders, activeReceivers, weightThreshold, localSearch]); // FIX 3: Added localSearch here

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'sans-serif' }}>
      <div style={{ width: '380px', backgroundColor: '#f8f9fa', borderRight: '1px solid #ddd', overflowY: 'auto' }}>
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
        />
      </div>
      <div style={{ flexGrow: 1, position: 'relative', backgroundColor: '#ffffff' }}>
        <NetworkOverview 
          elements={filteredElements}
          activeSenders={activeSenders}
          activeReceivers={activeReceivers}
          weightThreshold={weightThreshold}
          localSearch={localSearch}
        />
      </div>
    </div>
  );
}

export default App;
