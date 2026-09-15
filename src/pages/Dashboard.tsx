import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Zap, Waves, AlertTriangle, Clock, X, Info } from 'lucide-react';

const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const SEVERITY_COLORS = {
  Safe: '#3DBA6D',  // radar-green
  Green: '#3DBA6D',
  Yellow: '#E8C547', // radar-yellow
  Orange: '#E8873D', // radar-orange
  Red: '#D4483D',    // radar-red
  Unknown: '#8B9BB8' // radar-subtext
};

const API_BASE = "http://localhost:8000/api/v1";

export default function Dashboard() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayFrames, setReplayFrames] = useState<any[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  
  const [activeLayer, setActiveLayer] = useState<'Thunderstorm' | 'Cloudburst' | 'Flash Flood'>('Flash Flood');
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
  const [blockDetail, setBlockDetail] = useState<any>(null);
  
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/blocks`)
      .then(res => res.json())
      .then(data => setBlocks(data))
      .catch(err => console.error("Failed to load blocks", err));
      
    fetch(`${API_BASE}/replay/aug_2025_punjab_floods/frames`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReplayFrames(data);
      })
      .catch(err => console.error("Failed to load replay", err));
  }, []);

  useEffect(() => {
    if (replayMode) return;
    
    const poll = async () => {
      try {
        const [riskRes, statusRes] = await Promise.all([
          fetch(`${API_BASE}/risk/current`),
          fetch(`${API_BASE}/status`)
        ]);
        if (riskRes.ok) setRiskData(await riskRes.json());
        if (statusRes.ok) setStatus(await statusRes.json());
      } catch (err) {
        console.error("Poll failed", err);
      }
    };
    
    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, [replayMode]);

  useEffect(() => {
    if (!selectedBlockId || replayMode) return;
    
    fetch(`${API_BASE}/blocks/${selectedBlockId}/detail`)
      .then(res => res.json())
      .then(data => setBlockDetail(data))
      .catch(err => console.error("Failed to load block detail", err));
  }, [selectedBlockId, replayMode, riskData]);

  useEffect(() => {
    if (replayMode && selectedBlockId && replayFrames.length > 0) {
      const frame = replayFrames[replayIndex];
      const risk = frame.blocks[selectedBlockId];
      if (risk) {
        const block = blocks.find(b => b.id === selectedBlockId);
        setBlockDetail({ block, risk, data_mode: 'replay', generated_at: frame.time || frame.timestamp });
      }
    }
  }, [replayMode, selectedBlockId, replayIndex, replayFrames, blocks]);

  const currentData = replayMode 
    ? (replayFrames[replayIndex] || { blocks: {}, time: 'N/A' }) 
    : (riskData || { blocks: {}, generated_at: 'Loading...' });

  const MapCenter = () => {
    const map = useMap();
    useEffect(() => {
      if (blocks.length > 0) {
        const bounds = L.latLngBounds(blocks.map(b => [b.lat, b.lon]));
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [blocks, map]);
    return null;
  };

  const getMarkerColor = (blockId: number) => {
    const risk = currentData.blocks[blockId];
    if (!risk) return SEVERITY_COLORS.Unknown;
    
    let severity = 'Safe';
    if (activeLayer === 'Thunderstorm') severity = risk.thunderstorm_severity || 'Green';
    else if (activeLayer === 'Cloudburst') severity = risk.cloudburst_severity || 'Green';
    else if (activeLayer === 'Flash Flood') severity = risk.flash_flood_severity || 'Green';
    
    return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.Unknown;
  };

  const formatCountdown = (arrivalFrom: string, arrivalTo: string, refTime: string) => {
    try {
      const t1 = new Date(arrivalFrom);
      const t2 = new Date(arrivalTo);
      const now = refTime ? new Date(refTime) : new Date();
      
      const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const diffMs = t1.getTime() - now.getTime();
      let countdown = "";
      if (diffMs <= 0) {
        countdown = "Arrival window active/passed";
      } else {
        const diffH = Math.floor(diffMs / 3600000);
        const diffM = Math.floor((diffMs % 3600000) / 60000);
        countdown = `in ${diffH}h ${diffM}m`;
      }
      
      return `Estimated runoff arrival — ${formatTime(t1)} to ${formatTime(t2)} (${countdown})`;
    } catch {
      return "Estimated runoff arrival — calculating...";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-radar-bg text-radar-text overflow-hidden font-sans">
      <div className="flex items-center justify-between px-6 py-3 bg-radar-surface border-b border-radar-border z-10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CloudRain className="h-6 w-6 text-radar-accent" />
            <span className="text-xl font-bold tracking-tight">Meghdoot</span>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${replayMode ? 'bg-purple-500/20 text-purple-400' : 'bg-radar-green/20 text-radar-green'}`}>
            {replayMode ? 'REPLAY MODE' : (status?.data_mode === 'live' ? 'LIVE' : (status?.data_mode === 'starting_up' ? 'STARTING UP' : 'CACHED FALLBACK'))}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {replayMode && (
            <div className="flex items-center space-x-3">
              <input 
                type="range" 
                min="0" 
                max={Math.max(0, replayFrames.length - 1)} 
                value={replayIndex} 
                onChange={e => setReplayIndex(parseInt(e.target.value))}
                className="w-48"
              />
              <span className="font-mono text-sm text-radar-subtext">
                {new Date(replayFrames[replayIndex]?.time || '').toLocaleString()}
              </span>
            </div>
          )}
          
          <button 
            onClick={() => setReplayMode(!replayMode)}
            className="px-4 py-1.5 rounded-full bg-radar-raised border border-radar-border text-sm font-medium hover:bg-radar-border transition-colors"
          >
            {replayMode ? 'Return to Live' : 'View Replay (Aug 2025)'}
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-radar-subtext font-mono">
            <Clock className="w-4 h-4" />
            <span>
              {replayMode ? 'Replay Active' : (currentData.generated_at ? new Date(currentData.generated_at).toLocaleTimeString() : '...')}
            </span>
            {!replayMode && status && (
              <div className="group relative">
                <div className={`w-3 h-3 rounded-full ml-2 ${status.status === 'ok' ? 'bg-radar-green' : 'bg-radar-red'}`} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 relative flex">
        <div className="absolute inset-0 z-0">
          <MapContainer 
            center={[30.5, 76.5]} 
            zoom={8} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapCenter />
            {blocks.map(block => (
              <Marker 
                key={block.id} 
                position={[block.lat, block.lon]}
                icon={createIcon(getMarkerColor(block.id))}
                eventHandlers={{
                  click: () => setSelectedBlockId(block.id)
                }}
              >
                <Popup className="bg-radar-surface text-radar-text border-none p-0">
                  <div className="font-bold text-lg">{block.name}</div>
                  <div className="text-sm text-radar-subtext mt-1">Click to view details</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        <div className="absolute bottom-6 left-6 z-10 flex flex-col space-y-2 bg-radar-surface/90 backdrop-blur-md p-3 rounded-xl border border-radar-border shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-radar-subtext mb-1 px-2">Hazard Layer</div>
          {[
            { id: 'Thunderstorm', icon: Zap },
            { id: 'Cloudburst', icon: CloudRain },
            { id: 'Flash Flood', icon: Waves }
          ].map(layer => (
            <button
              key={layer.id}
              onClick={() => setActiveLayer(layer.id as any)}
              className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                activeLayer === layer.id 
                  ? 'bg-radar-accent/20 text-radar-accent border border-radar-accent/30' 
                  : 'hover:bg-radar-raised text-radar-subtext'
              }`}
            >
              <layer.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{layer.id}</span>
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selectedBlockId && blockDetail && blockDetail.risk && (
            <motion.div 
              initial={{ x: 500, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 500, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-[480px] bg-radar-surface border-l border-radar-border shadow-2xl z-20 flex flex-col overflow-y-auto"
            >
              <div className="p-5 border-b border-radar-border flex items-center justify-between sticky top-0 bg-radar-surface z-10">
                <div>
                  <h2 className="text-2xl font-bold text-radar-text">{blockDetail.block.name}</h2>
                  <div className="text-xs text-radar-subtext font-mono mt-1">
                    {blockDetail.block.district}, {blockDetail.block.state} · {blockDetail.block.river} Basin
                  </div>
                </div>
                <button onClick={() => setSelectedBlockId(null)} className="p-2 hover:bg-radar-raised text-radar-subtext hover:text-radar-text rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-5 space-y-6">
                
                {/* Row A — Severity + Dry-Sky pill */}
                <div className="flex items-center space-x-3">
                  <div className="px-3 py-1 rounded border font-bold text-sm" style={{ 
                    backgroundColor: `${SEVERITY_COLORS[blockDetail.risk.top_hazard_severity as keyof typeof SEVERITY_COLORS]}20`,
                    borderColor: SEVERITY_COLORS[blockDetail.risk.top_hazard_severity as keyof typeof SEVERITY_COLORS],
                    color: SEVERITY_COLORS[blockDetail.risk.top_hazard_severity as keyof typeof SEVERITY_COLORS] 
                  }}>
                    {blockDetail.risk.top_hazard_severity.toUpperCase()} {blockDetail.risk.top_hazard.toUpperCase()} RISK
                  </div>
                  {blockDetail.risk.dry_sky && (
                    <div className="px-3 py-1 rounded bg-blue-500/20 border border-blue-500 text-blue-400 font-bold text-sm tracking-wide shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                      DRY-SKY FLOOD RISK
                    </div>
                  )}
                </div>

                {/* Row B — The arrival clock */}
                <div className="bg-radar-raised border border-radar-border rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-radar-text mb-1">
                    <Clock className="w-5 h-5 text-radar-accent" />
                    <span className="font-mono text-[15px] tracking-tight">
                      {formatCountdown(
                        blockDetail.risk.arrival_from, 
                        blockDetail.risk.arrival_to, 
                        replayMode ? currentData.time : new Date().toISOString()
                      )}
                    </span>
                  </div>
                  <div className="text-xs text-radar-subtext italic ml-7">
                    Lumped kinematic-wave routing estimate; DEM flow routing pending.
                  </div>
                </div>

                {/* Row C — The contribution bar */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-radar-subtext mb-2">Flood Source Contribution</div>
                  <div className="flex h-6 rounded-md overflow-hidden bg-radar-raised border border-radar-border">
                    <div 
                      className="bg-purple-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all" 
                      style={{ width: `${blockDetail.risk.contribution_split.local_pct}%` }}
                    >
                      {blockDetail.risk.contribution_split.local_pct > 10 && `${blockDetail.risk.contribution_split.local_pct}%`}
                    </div>
                    <div 
                      className="bg-blue-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all" 
                      style={{ width: `${blockDetail.risk.contribution_split.upstream_pct}%` }}
                    >
                      {blockDetail.risk.contribution_split.upstream_pct > 10 && `${blockDetail.risk.contribution_split.upstream_pct}%`}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-radar-subtext mt-1">
                    <span>Local rainfall {blockDetail.risk.contribution_split.local_pct}%</span>
                    <span>Upstream catchment {blockDetail.risk.contribution_split.upstream_pct}%</span>
                  </div>
                </div>

                {/* Row D — The comparison block */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-radar-subtext mb-2">Impact Nowcast vs Point Forecast</div>
                  <div className="border border-radar-border rounded-lg bg-radar-raised overflow-hidden text-sm">
                    {/* Standard forecast */}
                    <div className="p-3 border-b border-radar-border flex flex-col space-y-1">
                      <div className="text-radar-subtext text-xs">{blockDetail.risk.comparison?.point_forecast?.label}</div>
                      <div className="font-mono text-radar-text">{blockDetail.risk.comparison?.point_forecast?.value}</div>
                    </div>
                    {/* IMD Scale */}
                    <div className="p-3 border-b border-radar-border flex flex-col space-y-1">
                      <div className="text-radar-subtext text-xs">{blockDetail.risk.comparison?.imd_scale?.label}</div>
                      <div className="font-mono" style={{ color: SEVERITY_COLORS[blockDetail.risk.comparison?.imd_scale?.colour as keyof typeof SEVERITY_COLORS] || '#E8EDF7' }}>
                        {blockDetail.risk.comparison?.imd_scale?.colour} — {blockDetail.risk.comparison?.imd_scale?.value}
                      </div>
                    </div>
                    {/* Meghdoot */}
                    <div className="p-3 bg-radar-bg flex flex-col space-y-1 border-l-4" style={{ borderColor: SEVERITY_COLORS[blockDetail.risk.comparison?.meghdoot?.severity as keyof typeof SEVERITY_COLORS] }}>
                      <div className="text-radar-subtext text-xs font-bold">{blockDetail.risk.comparison?.meghdoot?.label}</div>
                      <div className="font-mono font-bold" style={{ color: SEVERITY_COLORS[blockDetail.risk.comparison?.meghdoot?.severity as keyof typeof SEVERITY_COLORS] }}>
                        {blockDetail.risk.comparison?.meghdoot?.value}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row E — Exposure */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-radar-subtext mb-2 flex items-center justify-between">
                    <span>Vulnerable Exposure</span>
                    <span className="text-[10px] bg-radar-raised px-2 py-0.5 rounded text-radar-subtext border border-radar-border flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      DDMA / LGD facility registry integration pending
                    </span>
                  </div>
                  <div className="bg-radar-raised border border-radar-border p-3 rounded-lg text-sm mb-2 text-radar-text">
                    Est. <span className="font-bold text-white">{blockDetail.risk.exposure_total?.toLocaleString()} people</span> across {blockDetail.risk.exposure?.length} facilities in the low-lying runoff band.
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                    {blockDetail.risk.exposure?.map((exp: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2 border border-radar-border bg-radar-bg rounded">
                        <span className="text-radar-subtext truncate max-w-[200px]" title={exp.name}>{exp.name}</span>
                        <span className="text-radar-subtext uppercase text-[10px]">{exp.type}</span>
                        <span className="font-mono text-radar-text text-right w-12">{exp.pop}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row F — Upstream detail */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-radar-subtext mb-2">Upstream Routing Detail</div>
                  <div className="bg-radar-raised border border-radar-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-radar-bg text-radar-subtext uppercase border-b border-radar-border">
                        <tr>
                          <th className="px-3 py-2 font-medium">Node</th>
                          <th className="px-3 py-2 font-medium">Dist</th>
                          <th className="px-3 py-2 font-medium">3h Rain</th>
                          <th className="px-3 py-2 font-medium">Lag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-radar-border">
                        {blockDetail.risk.upstream_detail?.map((u: any, i: number) => (
                          <tr key={i} className="text-radar-text">
                            <td className="px-3 py-2 capitalize">{u.name}</td>
                            <td className="px-3 py-2 font-mono">{u.distance_km} km</td>
                            <td className="px-3 py-2 font-mono">{u.rain_3h_mm} mm</td>
                            <td className="px-3 py-2 font-mono">{u.lag_hours.toFixed(1)} h</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Row G — Narrative sentence + caveat */}
                <div className="border-l-2 border-radar-accent pl-3 text-sm text-radar-text bg-radar-raised/50 p-3 rounded-r-lg">
                  <p className="mb-2 italic">"{blockDetail.risk.narrative}"</p>
                  {blockDetail.risk.dam_regulated && (
                    <div className="text-xs text-radar-subtext flex items-start gap-1.5 mt-2 pt-2 border-t border-radar-border/50">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-radar-yellow" />
                      <span>Note: {blockDetail.risk.dam} dam intercepts this runoff. <br/><span className="font-mono bg-radar-bg px-1 rounded text-[10px]">reservoir_state_modelled: {blockDetail.risk.reservoir_state_modelled ? 'true' : 'false'}</span></span>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
