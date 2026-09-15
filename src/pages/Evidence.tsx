import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import leadtimeData from '../data/leadtime.json';

export default function Evidence() {
  // Sort descending by gain_h
  const sortedData = [...leadtimeData].sort((a, b) => b.gain_h - a.gain_h);

  // Helper to format timestamps nicely
  const formatTime = (ts: string | null) => {
    if (!ts) return 'None';
    return new Date(ts).toLocaleString([], { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false 
    });
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-10">
          <Link to="/" className="inline-flex items-center text-brand-subtext hover:text-brand-text transition-colors mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold mb-4 tracking-tight">System Evidence & Lead-Time Analysis</h1>
          
          <div className="bg-brand-raised/50 border border-brand-border p-5 rounded-lg border-l-4 border-l-brand-accent">
            <p className="italic text-brand-subtext leading-relaxed">
              Hindcast over the August 2025 Punjab floods. Baseline = rainfall-threshold alert computed on the same forecast data. Both run on identical inputs; only the transformation differs.
            </p>
          </div>
        </div>

        {/* List of blocks */}
        <div className="space-y-6">
          {sortedData.map((block, idx) => (
            <div key={idx} className="bg-brand-surface border border-brand-border rounded-xl p-6 relative overflow-hidden">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-brand-text">{block.name}</h2>
                  <div className="text-sm text-brand-subtext font-mono mt-1">
                    {block.district} District · {block.river} Basin
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-brand-subtext uppercase tracking-wider">Net Gain</div>
                    <div className={`font-mono text-2xl font-black ${block.gain_h > 0 ? 'text-brand-green' : 'text-brand-subtext'}`}>
                      {block.gain_h > 0 ? `+${block.gain_h}h` : `${block.gain_h}h`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Horizontal Timeline Visualization */}
              <div className="relative pt-6 pb-2">
                {/* Track */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-brand-raised rounded-full -translate-y-1/2 z-0"></div>
                
                {/* Gap Shading if positive gain */}
                {block.gain_h > 0 && block.lead_baseline_h !== null && block.lead_meghdoot_h !== null && (
                  <div 
                    className="absolute top-1/2 h-1 bg-brand-green/30 -translate-y-1/2 z-0 transition-all"
                    style={{ 
                      // Simple relative positioning: peak is at right (100%), 0h lead.
                      // Max lead in this dataset is ~200h. Let's scale relative to max lead so it looks okay.
                      // Right side is Peak (0 lead). Left side is max lead.
                      right: '0%', 
                      width: '60%' // Fixed width just for visual representation of the gap
                    }}
                  ></div>
                )}

                {/* Markers */}
                <div className="flex justify-between items-end relative z-10 font-mono text-xs text-brand-subtext">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 w-3 h-3 rounded-full bg-brand-accent border-2 border-brand-bg shadow-lg"></div>
                    <div className="text-brand-accent font-bold">Meghdoot</div>
                    <div>{formatTime(block.meghdoot_alert_ts)}</div>
                    <div>{block.lead_meghdoot_h !== null ? `${block.lead_meghdoot_h}h lead` : 'No alert'}</div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="mb-2 w-3 h-3 rounded-full bg-brand-border border-2 border-brand-bg shadow-lg"></div>
                    <div>Baseline</div>
                    <div>{formatTime(block.baseline_alert_ts)}</div>
                    <div>{block.lead_baseline_h !== null ? `${block.lead_baseline_h}h lead` : 'No alert'}</div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="mb-2 w-3 h-3 rounded-full bg-brand-red border-2 border-brand-bg shadow-lg"></div>
                    <div className="text-brand-red font-bold">Peak Impact</div>
                    <div>{formatTime(block.peak_hour)}</div>
                    <div>{block.peak_24h_mm} mm/24h</div>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
