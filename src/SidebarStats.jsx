import { BarChart, Bar, XAxis, Tooltip, Cell } from 'recharts';

function SidebarStats({
  nodes, cellTypes,
  activeSenders, setActiveSenders,
  activeReceivers, setActiveReceivers,
  weightThreshold, setWeightThreshold,
  localSearch, setLocalSearch,
  selectedMolType, setSelectedMolType
}) {

  const stats = [
    { name: 'TF', count: nodes.filter(n => n.data.moltype === 'TF').length || 0, color: '#ff7f0e' },
    { name: 'Ligand', count: nodes.filter(n => n.data.moltype === 'ligand').length || 0, color: '#2ca02c' },
    { name: 'Receptor', count: nodes.filter(n => n.data.moltype === 'receptor').length || 0, color: '#1f77b4' }
  ];

  const toggleSender = (type) => setActiveSenders(prev => ({ ...prev, [type]: prev[type] === false ? true : false }));
  const toggleReceiver = (type) => setActiveReceivers(prev => ({ ...prev, [type]: prev[type] === false ? true : false }));

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>Data Settings</h2>

      <div style={{ marginBottom: '20px', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '6px' }}>
        <p style={{ fontWeight: 'bold', fontSize: '14px', margin: '0 0 5px 0' }}>Molecule Search</p>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="e.g. Atf3..."
          style={{ width: '100%', padding: '6px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '30px' }}>
        <p style={{ fontWeight: 'bold' }}>Node Cardinalities</p>
        <div style={{ height: '150px', width: '100%' }}>
          <BarChart width={340} height={150} data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" fontSize={12} />
            <Tooltip />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              onClick={(data) => {
                if (data && data.name) {
                  setSelectedMolType(prev => prev === data.name ? null : data.name);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {stats.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  fillOpacity={selectedMolType && selectedMolType !== entry.name ? 0.35 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Sender Cell Type</p>
          {cellTypes.map(type => (
            <label key={`send-${type}`} style={{ display: 'block', fontSize: '12px', marginBottom: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={activeSenders[type] !== false}
                onChange={() => toggleSender(type)}
                style={{ marginRight: '8px' }}
              />
              {type}
            </label>
          ))}
        </div>

        <div>
          <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Receiver Cell Type</p>
          {cellTypes.map(type => (
            <label key={`rec-${type}`} style={{ display: 'block', fontSize: '12px', marginBottom: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={activeReceivers[type] !== false}
                onChange={() => toggleReceiver(type)}
                style={{ marginRight: '8px' }}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontWeight: 'bold', fontSize: '14px' }}>Interaction Weight: &ge; {weightThreshold}</p>
        <input
          type="range"
          min="-1"
          max="1"
          step="0.1"
          value={weightThreshold}
          onChange={(e) => setWeightThreshold(parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
          <span>-1 (Inhibiting)</span>
          <span>1 (Promoting)</span>
        </div>
      </div>
    </div>
  );
}

export default SidebarStats;
