import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Zap, Waves, AlertTriangle, Clock, Activity, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Custom Map Marker Icons based on severity
const createIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const SEVERITY_COLORS = {
  Safe: '#3DBA6D',
  Watch: '#E8C547',
  Alert: '#E8873D',
  Warning: '#D4483D',
  Unknown: '#8B9BB8'
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

  // Fetch static blocks
  useEffect(() => {
    fetch(`${API_BASE}/blocks`)
      .then(res => res.json())
      .then(data => setBlocks(data))
      .catch(err => console.error("Failed to load blocks", err));
      
    // Pre-fetch replay frames
    fetch(`${API_BASE}/replay/aug_2025_punjab_floods/frames`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReplayFrames(data);
      })
      .catch(err => console.error("Failed to load replay", err));
  }, []);

  // Poll live data
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
    const interval = setInterval(poll, 60000); // 1 min for UI update, backend updates every 5m
    return () => clearInterval(interval);
  }, [replayMode]);

  // Fetch block detail on click
  useEffect(() => {
    if (!selectedBlockId || replayMode) return;
    
    fetch(`${API_BASE}/blocks/${selectedBlockId}/detail`)
      .then(res => res.json())
      .then(data => setBlockDetail(data))
      .catch(err => console.error("Failed to load block detail", err));
  }, [selectedBlockId, replayMode, riskData]);

  // Update block detail in replay mode
  useEffect(() => {
    if (replayMode && selectedBlockId && replayFrames.length > 0) {
      const frame = replayFrames[replayIndex];
      const risk = frame.blocks[selectedBlockId];
      if (risk) {
        const block = blocks.find(b => b.id === selectedBlockId);
        setBlockDetail({ block, risk, data_mode: 'replay', generated_at: frame.timestamp });
      }
    }
  }, [replayMode, selectedBlockId, replayIndex, replayFrames, blocks]);

  const currentData = replayMode 
    ? (replayFrames[replayIndex] || { blocks: {}, timestamp: 'N/A' }) 
    : (riskData || { blocks: {}, generated_at: 'Loading...' });

  // Map component auto-center
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
    if (activeLayer === 'Thunderstorm') severity = risk.thunderstorm_severity;
    else if (activeLayer === 'Cloudburst') severity = risk.cloudburst_severity;
    else if (activeLayer === 'Flash Flood') severity = risk.flash_flood_severity;
    
    return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.Unknown;
  };

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-brand-text overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-brand-surface border-b border-brand-border z-10">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CloudRain className="h-6 w-6 text-brand-accent" />
            <span className="text-xl font-bold tracking-tight">Meghdoot</span>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-widest ${replayMode ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'}`}>
            {replayMode ? 'REPLAY MODE' : (status?.data_mode === 'live' ? 'LIVE' : (status?.data_mode === 'starting_up' ? 'STARTING UP' : 'CACHED FALLBACK'))}
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {replayMode && (
            <div className="flex items-center space-x-3">
              <input 
                type="range" 
                min="0" 
                max={replayFrames.length - 1} 
                value={replayIndex} 
                onChange={e => setReplayIndex(parseInt(e.target.value))}
                className="w-48"
              />
              <span className="font-mono text-sm text-brand-secondary">
                {new Date(replayFrames[replayIndex]?.timestamp).toLocaleString()}
              </span>
            </div>
          )}
          
          <button 
            onClick={() => setReplayMode(!replayMode)}
            className="px-4 py-1.5 rounded-full bg-brand-raised border border-brand-border text-sm font-medium hover:bg-brand-border transition-colors"
          >
            {replayMode ? 'Return to Live' : 'View Replay (Aug 2025)'}
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-brand-secondary font-mono">
            <Clock className="w-4 h-4" />
            <span>
              {replayMode ? 'Replay Active' : (currentData.generated_at ? new Date(currentData.generated_at).toLocaleTimeString() : '...')}
            </span>
            {!replayMode && status && (
              <div className="group relative">
                <div className={`w-3 h-3 rounded-full ml-2 ${status.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-brand-surface border border-brand-border rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none text-xs">
                  Status: {status.status}<br/>
                  Age: {status.age_seconds ? Math.round(status.age_seconds) + 's' : 'unknown'}<br/>
                  Mode: {status.data_mode}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex">
        {/* Map */}
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
                <Popup className="bg-brand-surface text-brand-text border-none p-0">
                  <div className="font-bold text-lg">{block.name}</div>
                  <div className="text-sm text-brand-secondary mt-1">Click to view details</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Layer Controls (Bottom Left) */}
        <div className="absolute bottom-6 left-6 z-10 flex flex-col space-y-2 bg-brand-surface/90 backdrop-blur-md p-3 rounded-xl border border-brand-border shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-wider text-brand-secondary mb-1 px-2">Hazard Layer</div>
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
                  ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30' 
                  : 'hover:bg-brand-raised text-brand-secondary'
              }`}
            >
              <layer.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{layer.id}</span>
            </button>
          ))}
        </div>

        {/* Slide-in Detail Panel */}
        <AnimatePresence>
          {selectedBlockId && (
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-96 bg-brand-surface border-l border-brand-border shadow-2xl z-20 flex flex-col"
            >
              <div className="p-4 border-b border-brand-border flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{blocks.find(b => b.id === selectedBlockId)?.name}</h2>
                  <div className="text-xs text-brand-secondary font-mono mt-1">
                    {blocks.find(b => b.id === selectedBlockId)?.lat.toFixed(4)}, {blocks.find(b => b.id === selectedBlockId)?.lon.toFixed(4)}
                  </div>
                </div>
                <button onClick={() => setSelectedBlockId(null)} className="p-2 hover:bg-brand-raised rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {!blockDetail ? (
                  <div className="flex items-center justify-center h-32 text-brand-secondary">
                    <Activity className="w-6 h-6 animate-pulse" />
                  </div>
                ) : (
                  <>
                    {/* Primary Alert Badge */}
                    <div className="p-4 rounded-xl border border-brand-border bg-brand-raised">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-brand-accent" />
                        <h3 className="font-bold">Top Risk</h3>
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-black" style={{ color: SEVERITY_COLORS[blockDetail.risk.top_hazard_severity as keyof typeof SEVERITY_COLORS] }}>
                          {blockDetail.risk.top_hazard}
                        </span>
                        <span className="text-brand-secondary uppercase text-sm font-bold tracking-wider">
                          {blockDetail.risk.top_hazard_severity}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-brand-secondary border-l-2 border-brand-border pl-3 italic">
                        "{blockDetail.risk.narrative}"
                      </p>
                    </div>

                    {/* Scores */}
                    <div className="grid grid-cols-2 gap-3">
                      <Card className="p-3 bg-brand-raised border-brand-border border">
                        <div className="text-xs text-brand-secondary uppercase tracking-wider mb-1">Thunderstorm</div>
                        <div className="font-mono text-xl" style={{ color: SEVERITY_COLORS[blockDetail.risk.thunderstorm_severity as keyof typeof SEVERITY_COLORS] }}>
                          {(blockDetail.risk.thunderstorm_score * 100).toFixed(0)}%
                        </div>
                      </Card>
                      <Card className="p-3 bg-brand-raised border-brand-border border">
                        <div className="text-xs text-brand-secondary uppercase tracking-wider mb-1">Cloudburst</div>
                        <div className="font-mono text-xl" style={{ color: SEVERITY_COLORS[blockDetail.risk.cloudburst_severity as keyof typeof SEVERITY_COLORS] }}>
                          {(blockDetail.risk.cloudburst_score * 100).toFixed(0)}%
                        </div>
                      </Card>
                    </div>
                    <Card className="p-3 bg-brand-raised border-brand-border border">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-brand-secondary uppercase tracking-wider mb-1">Flash Flood</div>
                          <div className="font-mono text-xl" style={{ color: SEVERITY_COLORS[blockDetail.risk.flash_flood_severity as keyof typeof SEVERITY_COLORS] }}>
                            {(blockDetail.risk.flash_flood_score * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-brand-secondary">Terrain factor applied:</div>
                          <div className="text-xs font-mono bg-brand-bg px-2 py-1 rounded mt-1 border border-brand-border">
                            Preset placeholder
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Raw Features (Latest) */}
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-brand-secondary mb-3">Live Conditions</h3>
                      <div className="space-y-2">
                        {Object.entries(blockDetail.risk.raw_features).map(([key, val]: any) => (
                          <div key={key} className="flex justify-between items-center text-sm border-b border-brand-border pb-1">
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-mono">{typeof val === 'number' ? val.toFixed(1) : val}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-center text-brand-secondary border-t border-brand-border pt-4 mt-8">
                      Computed using Sure-Shot Baseline Heuristic.
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
