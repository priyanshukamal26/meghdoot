import { useState, useEffect } from 'react';
import {
  Radar,
  ArrowRight,
  Menu,
  X,
  CloudRain,
  Zap,
  Waves,
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  BarChart3,
  Database,
  Eye,
  ArrowUpRight,
  HeartHandshake,
  Compass,
  Radio,
  FileText
} from 'lucide-react';

// --- NAVBAR COMPONENT ---
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-brand-bg/90 backdrop-blur-md border-b border-brand-border py-2'
            : 'bg-transparent border-b border-transparent py-0'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="relative flex items-center h-16 md:h-20">
            {/* Left logo mark */}
            <a
              href="#"
              className="flex items-center gap-2.5 animate-fade-down stagger-1 group"
            >
              <div className="w-8 h-8 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center group-hover:border-brand-accent/50 transition-colors">
                <Radar className="w-5 h-5 text-brand-accent transition-transform group-hover:rotate-45 duration-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg text-brand-text tracking-tight font-semibold font-sans leading-none">
                  Meghdoot
                </span>
                <span className="text-[10px] text-brand-subtext font-mono tracking-wider uppercase mt-1">
                  Early Warning System
                </span>
              </div>
            </a>

            {/* Center nav links */}
            <nav className="hidden xl:flex items-center gap-7 absolute left-1/2 -translate-x-1/2 animate-fade-down stagger-2">
              <a
                href="#mission"
                className="text-sm font-medium text-brand-subtext hover:text-brand-text transition-colors"
              >
                Mission &amp; Purpose
              </a>
              <a
                href="#hazards"
                className="text-sm font-medium text-brand-subtext hover:text-brand-text transition-colors"
              >
                Atmospheric Triad
              </a>
              <a
                href="#telemetry"
                className="text-sm font-medium text-brand-subtext hover:text-brand-text transition-colors"
              >
                Live Instrument
              </a>
              <a
                href="#architecture"
                className="text-sm font-medium text-brand-subtext hover:text-brand-text transition-colors"
              >
                Architecture
              </a>
              <a
                href="#impact"
                className="text-sm font-medium text-brand-subtext hover:text-brand-text transition-colors"
              >
                Field Impact
              </a>
            </nav>

            {/* Right CTA */}
            <a
              href="#dashboard"
              className="hidden md:inline-flex items-center gap-2 ml-auto animate-fade-down stagger-3 px-5 py-2.5 bg-brand-accent text-brand-bg text-sm font-semibold rounded-full hover:brightness-110 hover:shadow-lg hover:shadow-brand-accent/20 transition-all"
            >
              <span>Open Dashboard</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>

            {/* Mobile / Tablet hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden ml-auto md:ml-4 z-50 w-10 h-10 flex items-center justify-center text-brand-text rounded-lg border border-brand-border bg-brand-surface/60 hover:bg-brand-surface transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={`xl:hidden fixed inset-0 bg-brand-bg/95 backdrop-blur-xl z-40 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`flex flex-col items-center justify-center h-full gap-7 px-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] delay-100 ${
            mobileMenuOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-8 opacity-0'
          }`}
        >
          <a
            href="#mission"
            onClick={closeMenu}
            className="text-2xl text-brand-text tracking-tight font-medium hover:text-brand-accent transition-colors"
          >
            Mission &amp; Purpose
          </a>
          <a
            href="#hazards"
            onClick={closeMenu}
            className="text-2xl text-brand-text tracking-tight font-medium hover:text-brand-accent transition-colors"
          >
            Atmospheric Triad
          </a>
          <a
            href="#telemetry"
            onClick={closeMenu}
            className="text-2xl text-brand-text tracking-tight font-medium hover:text-brand-accent transition-colors"
          >
            Live Instrument
          </a>
          <a
            href="#architecture"
            onClick={closeMenu}
            className="text-2xl text-brand-text tracking-tight font-medium hover:text-brand-accent transition-colors"
          >
            Architecture
          </a>
          <a
            href="#impact"
            onClick={closeMenu}
            className="text-2xl text-brand-text tracking-tight font-medium hover:text-brand-accent transition-colors"
          >
            Field Impact
          </a>
          <a
            href="#dashboard"
            onClick={closeMenu}
            className="mt-6 inline-flex items-center gap-2 px-8 py-3.5 bg-brand-accent text-brand-bg text-base font-semibold rounded-full shadow-lg shadow-brand-accent/25"
          >
            <span>Open Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </>
  );
}

// --- HERO COMPONENT ---
function Hero() {
  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-brand-bg flex flex-col justify-between">
      {/* Video background layer */}
      <div className="absolute inset-0">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260820_010308_b1636845-4c15-4ab6-b0c9-9a29bfb0c6e3.mp4"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Scrim: functional gradient for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-brand-bg via-brand-bg/50 to-brand-bg/20 pointer-events-none" />

      {/* Content column */}
      <div className="relative z-10 flex flex-col items-start max-w-7xl mx-auto pt-32 md:pt-40 px-6 lg:px-8 w-full flex-grow justify-center">
        {/* Announcement pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-brand-border bg-brand-surface/80 backdrop-blur-md mb-6 animate-fade-up stagger-3 shadow-lg shadow-black/20">
          <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse-dot" />
          <span className="text-xs sm:text-sm text-brand-subtext font-medium">
            Live monitoring active across Punjab, Haryana &amp; Delhi NCT
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-left text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-brand-text leading-[1.1] tracking-tight max-w-3xl font-semibold font-sans animate-fade-up stagger-4">
          Severe weather, seen<br className="hidden sm:block" />{' '}
          hours before it arrives
        </h1>

        {/* Subline */}
        <p className="text-left text-base md:text-lg text-brand-subtext max-w-2xl mt-5 leading-relaxed animate-fade-up stagger-5 font-normal">
          Meghdoot tracks the atmospheric signals that come before thunderstorms, cloudbursts, and flash floods — giving disaster teams a two-to-six-hour head start, block by block, across India.
        </p>

        {/* Hero Actions */}
        <div className="mt-8 flex flex-wrap items-center gap-4 animate-fade-up stagger-5">
          <a
            href="#dashboard"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-accent text-brand-bg text-base font-semibold rounded-full hover:brightness-110 hover:shadow-lg hover:shadow-brand-accent/30 transition-all group"
          >
            <span>Open the live dashboard</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#mission"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-surface/80 border border-brand-border text-brand-text text-base font-medium rounded-full hover:bg-brand-surface hover:border-brand-accent/50 transition-all backdrop-blur-sm"
          >
            <span>Explore Methodology</span>
          </a>
        </div>

        {/* Live Stat Strip */}
        <div className="w-full mt-14 md:mt-20 pb-12 animate-fade-up stagger-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-8 border-t border-brand-border/60">
            {/* Stat 1 */}
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-medium text-brand-text tracking-tight">
                2–6 hrs
              </span>
              <span className="text-xs text-brand-subtext mt-1.5 max-w-[12rem] leading-snug">
                Lead time before severe weather onset
              </span>
            </div>

            {/* Stat 2 */}
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-medium text-brand-text tracking-tight">
                15 min
              </span>
              <span className="text-xs text-brand-subtext mt-1.5 max-w-[12rem] leading-snug">
                How often live conditions are refreshed
              </span>
            </div>

            {/* Stat 3 */}
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-medium text-brand-text tracking-tight">
                3
              </span>
              <span className="text-xs text-brand-subtext mt-1.5 max-w-[12rem] leading-snug">
                Hazards tracked at once — storms, cloudbursts, floods
              </span>
            </div>

            {/* Stat 4 */}
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl lg:text-4xl font-mono font-medium text-brand-text tracking-tight">
                All India
              </span>
              <span className="text-xs text-brand-subtext mt-1.5 max-w-[12rem] leading-snug">
                Map coverage, growing from a validated North India core
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- MISSION & HUMANE PURPOSE SECTION ---
function MissionSection() {
  return (
    <section id="mission" className="py-24 md:py-32 bg-brand-bg relative border-t border-brand-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-border bg-brand-surface text-brand-accent text-xs font-mono tracking-wide uppercase mb-4">
              <HeartHandshake className="w-3.5 h-3.5" />
              The Humanitarian Mission
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-brand-text tracking-tight leading-tight">
              Giving every community the precious gift of time.
            </h2>
            <p className="mt-5 text-base sm:text-lg text-brand-subtext leading-relaxed">
              Named after Kalidasa’s celebrated lyric poem <em className="text-brand-text font-serif">Meghdūta</em> (&ldquo;The Cloud Messenger&rdquo;), Meghdoot reimagines the monsoon cloud not as a harbinger of surprise, but as a messenger of safety, foresight, and preparedness.
            </p>
            <p className="mt-4 text-base sm:text-lg text-brand-subtext leading-relaxed">
              When severe convective storms build, the difference between tragedy and safety is rarely measured in days — it is measured in the critical two to six hours beforehand. Meghdoot bridges this exact window, converting raw atmospheric physics into clear, compassionate, and actionable intelligence for the people on the ground.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-brand-surface/50 border border-brand-border">
                <div className="p-2.5 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-brand-text">Protecting Vulnerable Habitats</h4>
                  <p className="text-sm text-brand-subtext mt-1 leading-relaxed">
                    Allowing civic administrations to evacuate low-lying settlements, secure drainage corridors, and safely shelter livestock and crops hours before downpours peak.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-brand-surface/50 border border-brand-border">
                <div className="p-2.5 rounded-lg bg-brand-green/10 border border-brand-green/20 text-brand-green shrink-0 mt-0.5">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-brand-text">Bridging the NWP Compute Gap</h4>
                  <p className="text-sm text-brand-subtext mt-1 leading-relaxed">
                    Traditional numerical weather prediction models require massive multi-hour compute cycles. Meghdoot’s lightweight neural inference runs every 15 minutes, catching fast convective updrafts in real time.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Cards: The Core Commitments */}
          <div className="w-full lg:max-w-lg space-y-6">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-brand-surface to-brand-surface/60 border border-brand-border relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />
              <span className="text-xs font-mono uppercase tracking-widest text-brand-accent">Why Nowcasting Matters</span>
              <h3 className="text-xl font-semibold text-brand-text mt-2">
                The Science of the 2–6 Hour Horizon
              </h3>
              <p className="text-sm text-brand-subtext mt-3 leading-relaxed">
                Atmospheric boundary layers undergo swift thermodynamic shifts before violent convective downpours. By tracking convective available potential energy (CAPE), low-level wind convergence, and moisture surge trends in real-time, Meghdoot catches the precursor physical signals long before rain gauges register the first drop.
              </p>

              <div className="mt-6 pt-6 border-t border-brand-border grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-brand-subtext uppercase tracking-wider font-mono">Precision Level</div>
                  <div className="text-lg font-semibold text-brand-text mt-1">Block-Level</div>
                  <div className="text-xs text-brand-subtext mt-0.5">Hyper-local spatial scale</div>
                </div>
                <div>
                  <div className="text-xs text-brand-subtext uppercase tracking-wider font-mono">Response Readiness</div>
                  <div className="text-lg font-semibold text-brand-green mt-1">100% Actionable</div>
                  <div className="text-xs text-brand-subtext mt-0.5">Built for field officers</div>
                </div>
              </div>
            </div>

            {/* SIH / MoES institutional trust badge */}
            <div className="p-6 rounded-2xl bg-brand-surface/40 border border-brand-border flex items-center gap-5">
              <div className="w-12 h-12 rounded-xl bg-brand-raised border border-brand-border flex items-center justify-center shrink-0">
                <Compass className="w-6 h-6 text-brand-accent" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-brand-text">
                  Built for SIH26077 / MoES &amp; NCMRWF
                </h4>
                <p className="text-xs text-brand-subtext mt-1 leading-relaxed">
                  Developed in rigorous adherence to national early warning benchmarks established by the Ministry of Earth Sciences and the National Centre for Medium Range Weather Forecasting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- ATMOSPHERIC TRIAD SECTION ---
function AtmosphericTriadSection() {
  const [activeHazard, setActiveHazard] = useState<'storm' | 'cloudburst' | 'flood'>('cloudburst');

  const hazardDetails = {
    storm: {
      title: 'Severe Thunderstorms',
      subtitle: 'Convective Updrafts & Severe Lightning Cells',
      icon: Zap,
      colorClass: 'text-brand-yellow',
      bgClass: 'bg-brand-yellow/10 border-brand-yellow/30',
      description:
        'Rapid updrafts fueled by extreme surface heating and low-level wind shear can organize into destructive supercells. Meghdoot monitors convective instability and thermodynamic boundary collapse to forecast storm cells up to 6 hours before lightning and microbursts manifest.',
      indicators: [
        { label: 'Primary Trigger', value: 'Rapid CAPE buildup (>2,200 J/kg) & CIN collapse' },
        { label: 'Kinematic Metric', value: '850–500 hPa vertical wind shear gradient' },
        { label: 'Protective Outcome', value: 'Securing electrical grids, rural power infrastructure, and airport ramps' },
      ],
      leadTime: '3–6 Hours Lead Time',
    },
    cloudburst: {
      title: 'Localized Cloudbursts',
      subtitle: 'Sudden High-Intensity Atmospheric Deluges',
      icon: CloudRain,
      colorClass: 'text-brand-accent',
      bgClass: 'bg-brand-accent/10 border-brand-accent/30',
      description:
        'A cloudburst occurs when highly saturated monsoon air is forced upward into cold tropospheric layers, accumulating tens of millions of metric tons of water vapor that suddenly collapse over small geographic footprints. Meghdoot analyzes integrated moisture convergence and rapid cloud-top cooling trends to pinpoint these deluges before release.',
      indicators: [
        { label: 'Primary Trigger', value: 'Extreme Integrated Water Vapor (IWV) saturation surge' },
        { label: 'Satellite Signal', value: 'Steep Cloud-Top Temperature (CTT) drop rates' },
        { label: 'Protective Outcome', value: 'Immediate pre-evacuation of flash-flood prone gullies and nullahs' },
      ],
      leadTime: '2–4 Hours Lead Time',
    },
    flood: {
      title: 'Terrain-Coupled Flash Floods',
      subtitle: 'Hydrological Runoff & Topographic Surges',
      icon: Waves,
      colorClass: 'text-brand-orange',
      bgClass: 'bg-brand-orange/10 border-brand-orange/30',
      description:
        'Rainfall alone does not determine flood danger — terrain dictates where water gathers. Meghdoot fuses continuous precipitation intensity predictions with high-resolution SRTM Digital Elevation Models (DEM) and hydrological flow-accumulation matrices, computing the exact geographic blocks where runoff will gather into dangerous torrents.',
      indicators: [
        { label: 'Hydro Model', value: 'pysheds flow accumulation weight × rain intensity' },
        { label: 'Terrain Input', value: 'High-resolution SRTM DEM slope & drainage vectors' },
        { label: 'Protective Outcome', value: 'Staging rescue craft, activating stormwater pumps, closing floodgates' },
      ],
      leadTime: '2–5 Hours Lead Time',
    },
  };

  const current = hazardDetails[activeHazard];
  const CurrentIcon = current.icon;

  return (
    <section id="hazards" className="py-24 md:py-32 bg-brand-surface/30 relative border-t border-brand-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-border bg-brand-surface text-brand-accent text-xs font-mono tracking-wide uppercase mb-4">
            <Layers className="w-3.5 h-3.5" />
            Specialized Multi-Task Intelligence
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-brand-text tracking-tight">
            The Triad of Severe Atmospheric Hazards
          </h2>
          <p className="mt-4 text-base sm:text-lg text-brand-subtext leading-relaxed">
            Unlike generic weather apps that forecast simple percentage chances of rain, Meghdoot trains distinct specialized prediction heads for the three most critical localized weather emergencies.
          </p>
        </div>

        {/* Hazard Selector Tabs */}
        <div className="mt-12 flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-brand-surface border border-brand-border max-w-full overflow-x-auto">
            <button
              onClick={() => setActiveHazard('storm')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeHazard === 'storm'
                  ? 'bg-brand-raised text-brand-text shadow-md border border-brand-border'
                  : 'text-brand-subtext hover:text-brand-text'
              }`}
            >
              <Zap className="w-4 h-4 text-brand-yellow" />
              <span>Severe Thunderstorms</span>
            </button>
            <button
              onClick={() => setActiveHazard('cloudburst')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeHazard === 'cloudburst'
                  ? 'bg-brand-raised text-brand-text shadow-md border border-brand-border'
                  : 'text-brand-subtext hover:text-brand-text'
              }`}
            >
              <CloudRain className="w-4 h-4 text-brand-accent" />
              <span>Cloudbursts</span>
            </button>
            <button
              onClick={() => setActiveHazard('flood')}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeHazard === 'flood'
                  ? 'bg-brand-raised text-brand-text shadow-md border border-brand-border'
                  : 'text-brand-subtext hover:text-brand-text'
              }`}
            >
              <Waves className="w-4 h-4 text-brand-orange" />
              <span>Flash Floods</span>
            </button>
          </div>
        </div>

        {/* Selected Hazard Interactive Showcase Card */}
        <div className="mt-10 p-8 sm:p-12 rounded-3xl bg-brand-surface border border-brand-border relative overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-7">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl border ${current.bgClass}`}>
                  <CurrentIcon className={`w-6 h-6 ${current.colorClass}`} />
                </div>
                <div>
                  <span className="text-xs font-mono uppercase tracking-widest text-brand-subtext">
                    Specialized Forecasting Head
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-semibold text-brand-text mt-0.5">
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className="mt-2 text-sm text-brand-accent font-medium">
                {current.subtitle}
              </p>

              <p className="mt-5 text-base text-brand-subtext leading-relaxed">
                {current.description}
              </p>

              <div className="mt-8 space-y-3">
                {current.indicators.map((ind, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-brand-raised/60 border border-brand-border text-sm"
                  >
                    <span className="text-brand-subtext font-medium">{ind.label}</span>
                    <span className="text-brand-text font-mono sm:text-right mt-1 sm:mt-0 font-medium">
                      {ind.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-center">
              <div className="p-7 rounded-2xl bg-brand-bg/80 border border-brand-border/80 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center mb-4 text-brand-accent shadow-inner">
                  <Clock className="w-8 h-8" />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-brand-subtext">
                  Operational Window
                </span>
                <span className="text-2xl font-mono font-semibold text-brand-text mt-2">
                  {current.leadTime}
                </span>
                <p className="text-xs text-brand-subtext mt-3 max-w-xs leading-relaxed">
                  Enough advance notice for district magistrates and first-responder battalions to mobilize resources, sound alerts, and protect lives without panic.
                </p>
                <div className="mt-6 w-full pt-6 border-t border-brand-border/60 flex items-center justify-between text-xs">
                  <span className="text-brand-subtext">Official IMD Scale Aligned</span>
                  <span className="text-brand-green font-mono font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-green" />
                    Verified Calibration
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- INTERACTIVE LIVE BLOCK TELEMETRY & XAI SECTION ---
function LiveTelemetrySection() {
  const [selectedScenario, setSelectedScenario] = useState<'calm' | 'buildup' | 'alert'>('buildup');

  const scenarios = {
    calm: {
      name: 'Stable Atmospheric State',
      location: 'Chandigarh Urban Block',
      riskScore: 'Low Risk',
      riskBadgeClass: 'bg-brand-green/10 text-brand-green border-brand-green/30',
      cape: '420 J/kg',
      cin: '180 J/kg',
      convergence: '-0.12 × 10⁻⁴ s⁻¹',
      moisture: '42% Saturation',
      flowAcc: 'Nominal River Flow',
      xai: 'Stable dry boundary layer in place. Strong convective inhibition (CIN 180 J/kg) suppresses vertical cloud formation. No significant thermodynamic triggers detected over the next 6 hours.',
    },
    buildup: {
      name: 'Pre-Convective Buildup (Active Tracking)',
      location: 'Rupnagar Block, Punjab',
      riskScore: 'Elevated Watch (Orange)',
      riskBadgeClass: 'bg-brand-orange/10 text-brand-orange border-brand-orange/30',
      cape: '2,450 J/kg',
      cin: '24 J/kg (Rapidly Eroding)',
      convergence: '+3.85 × 10⁻⁴ s⁻¹',
      moisture: '88% Saturation',
      flowAcc: 'Topographic Funneling',
      xai: 'Elevated cloudburst risk. Convective Available Potential Energy (CAPE) has surged to 2,450 J/kg while inhibition has collapsed. Strong 850 hPa wind convergence combined with Shivalik foothill orographic lift indicates high probability of intense rain bands within 2.5 hours.',
    },
    alert: {
      name: 'Critical Surge Imminent',
      location: 'Yamunanagar Basin, Haryana',
      riskScore: 'Immediate Warning (Red)',
      riskBadgeClass: 'bg-brand-red/10 text-brand-red border-brand-red/30',
      cape: '3,180 J/kg',
      cin: '0 J/kg (Complete Rupture)',
      convergence: '+6.10 × 10⁻⁴ s⁻¹',
      moisture: '96% Deep Tropospheric Saturation',
      flowAcc: 'High Risk Catchment Accumulation',
      xai: 'Severe flash flood alert. Deep saturated convective column with peak 850 hPa convergence. Precipitation head forecasts >65mm/hr rain rate, matching downstream river basin accumulation matrices. Advise immediate floodgate monitoring and nullah clearing.',
    },
  };

  const active = scenarios[selectedScenario];

  return (
    <section id="telemetry" className="py-24 md:py-32 bg-brand-bg relative border-t border-brand-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-border bg-brand-surface text-brand-accent text-xs font-mono tracking-wide uppercase mb-4">
              <Activity className="w-3.5 h-3.5" />
              Real-Time Instrument Panel
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold text-brand-text tracking-tight">
              Transparent, Explainable Intelligence (XAI)
            </h2>
            <p className="mt-4 text-base sm:text-lg text-brand-subtext leading-relaxed">
              Disaster management officers cannot act on black-box predictions. Meghdoot provides full meteorological attribution — decomposing every alert into plain-language physical causes.
            </p>
          </div>

          {/* State Scenario Toggles */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedScenario('calm')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                selectedScenario === 'calm'
                  ? 'bg-brand-green/10 border-brand-green/40 text-brand-green'
                  : 'bg-brand-surface border-brand-border text-brand-subtext hover:text-brand-text'
              }`}
            >
              Scenario A: Stable
            </button>
            <button
              onClick={() => setSelectedScenario('buildup')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                selectedScenario === 'buildup'
                  ? 'bg-brand-orange/10 border-brand-orange/40 text-brand-orange'
                  : 'bg-brand-surface border-brand-border text-brand-subtext hover:text-brand-text'
              }`}
            >
              Scenario B: Convective Buildup
            </button>
            <button
              onClick={() => setSelectedScenario('alert')}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                selectedScenario === 'alert'
                  ? 'bg-brand-red/10 border-brand-red/40 text-brand-red'
                  : 'bg-brand-surface border-brand-border text-brand-subtext hover:text-brand-text'
              }`}
            >
              Scenario C: Severe Warning
            </button>
          </div>
        </div>

        {/* The Instrument Console Box */}
        <div className="rounded-3xl bg-brand-surface border border-brand-border overflow-hidden shadow-2xl">
          {/* Header Bar */}
          <div className="px-6 sm:px-8 py-4 bg-brand-raised/70 border-b border-brand-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse-dot" />
              <span className="text-xs font-mono uppercase tracking-wider text-brand-subtext">
                Live Sensor Telemetry:
              </span>
              <span className="text-sm font-semibold text-brand-text flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-brand-accent" />
                {active.location}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border ${active.riskBadgeClass}`}>
                {active.riskScore}
              </span>
              <span className="text-xs font-mono text-brand-subtext">
                Updated: 2 mins ago
              </span>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="p-6 sm:p-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border flex flex-col">
              <span className="text-xs font-mono text-brand-subtext uppercase">CAPE (Instability)</span>
              <span className="text-xl sm:text-2xl font-mono font-semibold text-brand-text mt-2">
                {active.cape}
              </span>
              <span className="text-[11px] text-brand-subtext mt-1">Convective energy</span>
            </div>

            <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border flex flex-col">
              <span className="text-xs font-mono text-brand-subtext uppercase">CIN (Inhibition)</span>
              <span className="text-xl sm:text-2xl font-mono font-semibold text-brand-text mt-2">
                {active.cin}
              </span>
              <span className="text-[11px] text-brand-subtext mt-1">Atmospheric lid</span>
            </div>

            <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border flex flex-col">
              <span className="text-xs font-mono text-brand-subtext uppercase">850hPa Convergence</span>
              <span className="text-xl sm:text-2xl font-mono font-semibold text-brand-text mt-2">
                {active.convergence}
              </span>
              <span className="text-[11px] text-brand-subtext mt-1">MetPy dynamic lift</span>
            </div>

            <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border flex flex-col">
              <span className="text-xs font-mono text-brand-subtext uppercase">Integrated Moisture</span>
              <span className="text-xl sm:text-2xl font-mono font-semibold text-brand-text mt-2">
                {active.moisture}
              </span>
              <span className="text-[11px] text-brand-subtext mt-1">IWV water column</span>
            </div>

            <div className="p-4 rounded-xl bg-brand-bg/60 border border-brand-border flex flex-col col-span-2 sm:col-span-1">
              <span className="text-xs font-mono text-brand-subtext uppercase">Terrain Hydro Index</span>
              <span className="text-xl sm:text-2xl font-mono font-semibold text-brand-accent mt-2">
                {active.flowAcc}
              </span>
              <span className="text-[11px] text-brand-subtext mt-1">SRTM DEM × pysheds</span>
            </div>
          </div>

          {/* Explainable AI Box */}
          <div className="px-6 sm:px-8 pb-8 pt-2">
            <div className="p-6 rounded-2xl bg-brand-raised/50 border border-brand-border/80 flex flex-col sm:flex-row items-start gap-5">
              <div className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-brand-text uppercase tracking-wider font-mono">
                    Explainable AI Narrative (Human-in-the-Loop)
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-surface border border-brand-border text-brand-subtext">
                    SHAP Attribution + Groq
                  </span>
                </div>
                <p className="text-base text-brand-text mt-2 leading-relaxed font-sans">
                  &ldquo;{active.xai}&rdquo;
                </p>
                <div className="mt-3 flex items-center gap-4 text-xs text-brand-subtext">
                  <span>✓ Verified physical consistency</span>
                  <span>✓ Cached once per alert for repeatable inspection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- ARCHITECTURE & DATA PIPELINE SECTION ---
function ArchitectureSection() {
  const pipelineSteps = [
    {
      step: '01',
      title: 'Unified Multi-Stream Ingestion',
      icon: Database,
      desc: 'Pulls live thermodynamic and kinematic atmospheric layers from Open-Meteo and IMD every 15 minutes, with full fallback caching for offline resilience.',
      detail: 'CAPE, CIN, U/V wind vectors at 850/500 hPa, dewpoint, pressure altitude.',
    },
    {
      step: '02',
      title: 'Rigorous Physical Feature Engineering',
      icon: Cpu,
      desc: 'Derives kinematic divergence via MetPy, computes vertical wind shear, and estimates Integrated Water Vapor (IWV) trends across sliding 6-timestep windows.',
      detail: 'Consistent schema between historical training archives (2021+) and live inference.',
    },
    {
      step: '03',
      title: 'Multi-Task Neural Encoder',
      icon: Layers,
      desc: 'A high-throughput GRU/MLP backbone with shared physical representation branches into three specialized operational heads.',
      detail: 'Dual sigmoid classification heads + continuous precipitation intensity regression.',
    },
    {
      step: '04',
      title: 'Topographic Runoff Coupling',
      icon: Waves,
      desc: 'Fuses predicted rain rates with precomputed SRTM DEM flow-accumulation paths using pysheds to calculate actual surface water pooling.',
      detail: 'Separates flat soil absorption from dangerous valley and urban catchment surges.',
    },
    {
      step: '05',
      title: 'Explainable AI & Alert Dispatch',
      icon: Eye,
      desc: 'Computes feature attributions via SHAP saliency, generating plain-language meteorological rationales for incident commanders.',
      detail: 'Dispatches instant web alerts and powers the interactive Leaflet command map.',
    },
  ];

  return (
    <section id="architecture" className="py-24 md:py-32 bg-brand-surface/20 relative border-t border-brand-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-border bg-brand-surface text-brand-accent text-xs font-mono tracking-wide uppercase mb-4">
            <Cpu className="w-3.5 h-3.5" />
            End-to-End System Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-brand-text tracking-tight">
            How Meghdoot Processes the Atmosphere
          </h2>
          <p className="mt-4 text-base sm:text-lg text-brand-subtext leading-relaxed">
            Engineered for computational speed and absolute operational dependability, eliminating multi-terabyte raster latency to deliver real-time intelligence when every second counts.
          </p>
        </div>

        {/* Pipeline List */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pipelineSteps.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-7 rounded-2xl bg-brand-surface border border-brand-border hover:border-brand-accent/40 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-brand-raised border border-brand-border flex items-center justify-center text-brand-accent group-hover:border-brand-accent/50 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-2xl font-mono font-bold text-brand-subtext/40 group-hover:text-brand-accent/60 transition-colors">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-text group-hover:text-brand-accent transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-brand-subtext mt-2.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-brand-border/60 text-xs font-mono text-brand-accent/80">
                  {item.detail}
                </div>
              </div>
            );
          })}

          {/* Hard Floor Guarantee Card */}
          <div className="p-7 rounded-2xl bg-gradient-to-br from-brand-raised to-brand-surface border border-brand-accent/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/30 flex items-center justify-center text-brand-accent">
                  <Radio className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-brand-green font-semibold">
                  Field Ready
                </span>
              </div>
              <h3 className="text-lg font-semibold text-brand-text">
                Offline Replay &amp; Zero-Net Reliability
              </h3>
              <p className="text-sm text-brand-subtext mt-2.5 leading-relaxed">
                Critical life-safety systems cannot fail when connectivity drops. Meghdoot includes a baked-in historical replay engine (Aug 2025 Punjab &amp; Jul 2023 North India events) that operates with zero internet access for field simulation and training.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-brand-border/60 text-xs font-mono text-brand-green">
              ✓ Survives physical network disconnects
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- FIELD IMPACT & HUMANE STAKEHOLDERS SECTION ---
function FieldImpactSection() {
  const personas = [
    {
      role: 'District Disaster Management Authorities',
      badge: 'Civic Leadership',
      icon: ShieldCheck,
      description:
        'Equips District Magistrates and emergency operation centers with high-confidence lead times to deploy State Disaster Response Forces (SDRF), position relief supplies, and alert vulnerable communities with calm authority.',
    },
    {
      role: 'Municipal Water & Sanitation Engineers',
      badge: 'Urban Infrastructure',
      icon: Waves,
      description:
        'Enables proactive operation of storm pumps, scheduled clearance of high-risk culverts, and early barricading of waterlogged underpasses hours before rain rates overwhelm metropolitan conduits.',
    },
    {
      role: 'Agricultural & Rural Communities',
      badge: 'Livelihoods & Food Security',
      icon: Compass,
      description:
        'Provides block-specific notices allowing farmers to protect harvested grain, clear field drainage channels, and relocate cattle away from flood-prone riverbanks before lightning and deluge strikes.',
    },
    {
      role: 'First Responders & Volunteer Teams',
      badge: 'Humanitarian Action',
      icon: HeartHandshake,
      description:
        'Gives NDRF battalions and local volunteer networks clear maps showing exactly where terrain flow accumulation will turn rain into raging torrents, allowing pre-positioning of rescue boats before roads submerge.',
    },
  ];

  return (
    <section id="impact" className="py-24 md:py-32 bg-brand-bg relative border-t border-brand-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-brand-border bg-brand-surface text-brand-accent text-xs font-mono tracking-wide uppercase mb-4">
            <HeartHandshake className="w-3.5 h-3.5" />
            Humanitarian Stewardship
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold text-brand-text tracking-tight">
            Built for the Hands on the Frontlines
          </h2>
          <p className="mt-4 text-base sm:text-lg text-brand-subtext leading-relaxed">
            Data has value only when it translates into safety. Meghdoot was architected around the practical workflows of real public servants and community caretakers.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
          {personas.map((persona, i) => {
            const Icon = persona.icon;
            return (
              <div
                key={i}
                className="p-8 rounded-2xl bg-brand-surface/60 border border-brand-border hover:border-brand-border/90 transition-all flex flex-col sm:flex-row gap-6 items-start"
              >
                <div className="p-3.5 rounded-xl bg-brand-raised border border-brand-border text-brand-accent shrink-0">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-brand-accent uppercase tracking-wider">
                      {persona.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-brand-text mt-1">
                    {persona.role}
                  </h3>
                  <p className="mt-3 text-sm text-brand-subtext leading-relaxed">
                    {persona.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quote banner */}
        <div className="mt-14 p-8 rounded-3xl bg-gradient-to-r from-brand-surface to-brand-raised border border-brand-border flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl">
            <h4 className="text-xl font-semibold text-brand-text">
              &ldquo;The goal of early warning is not to cause alarm, but to eliminate uncertainty.&rdquo;
            </h4>
            <p className="text-sm text-brand-subtext mt-2">
              Meghdoot delivers quiet, confident, and verifiable telemetry so leadership can act with composure and compassion.
            </p>
          </div>
          <a
            href="#dashboard"
            className="px-6 py-3 rounded-full bg-brand-accent text-brand-bg font-semibold text-sm hover:brightness-110 shrink-0 transition-all shadow-md shadow-brand-accent/20"
          >
            Experience the Console
          </a>
        </div>
      </div>
    </section>
  );
}

// --- STANDARDS & VERIFICATION SECTION ---
function StandardsSection() {
  return (
    <section className="py-20 bg-brand-surface/30 border-t border-brand-border/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-brand-green/10 border border-brand-green/30 text-brand-green shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-brand-text">
                IMD Severity Scale Alignment
              </h4>
              <p className="text-xs text-brand-subtext mt-1.5 leading-relaxed">
                Color-coded risks adhere strictly to standard meteorological conventions (Green, Yellow, Orange, Red) ensuring zero cognitive friction for veteran disaster operators.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-brand-accent/10 border border-brand-accent/30 text-brand-accent shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-brand-text">
                NASA IMERG Ground Truth
              </h4>
              <p className="text-xs text-brand-subtext mt-1.5 leading-relaxed">
                Model training and threshold verification are validated against NASA IMERG Final Run satellite precipitation archives for robust statistical calibration.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-brand-yellow/10 border border-brand-yellow/30 text-brand-yellow shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-brand-text">
                Open Science &amp; Auditability
              </h4>
              <p className="text-xs text-brand-subtext mt-1.5 leading-relaxed">
                Every architectural choice, mathematical trade-off, and data-source proxy is fully documented with total transparency for research and governmental peer review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// --- CALL TO ACTION FOOTER BANNER ---
function CallToActionBanner() {
  return (
    <section id="dashboard" className="py-24 bg-gradient-to-b from-brand-bg to-brand-surface relative overflow-hidden border-t border-brand-border">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-accent/10 via-transparent to-transparent pointer-events-none" />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center mx-auto mb-6 text-brand-accent shadow-xl">
          <Radar className="w-8 h-8" />
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold text-brand-text tracking-tight">
          Ready to inspect the live radar console?
        </h2>
        <p className="mt-4 text-base sm:text-lg text-brand-subtext max-w-2xl mx-auto leading-relaxed">
          Access the real-time block-level early warning dashboard, inspect active weather polygons, and review live explainable AI telemetry across the region.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert('Redirecting to the Meghdoot Live Dashboard (Map & Risk Layer Console)...');
            }}
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-brand-accent text-brand-bg text-base font-semibold rounded-full hover:brightness-110 hover:shadow-xl hover:shadow-brand-accent/30 transition-all group"
          >
            <span>Launch Live Dashboard</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#mission"
            className="inline-flex items-center gap-2 px-7 py-4 bg-brand-surface border border-brand-border text-brand-text text-base font-medium rounded-full hover:bg-brand-raised transition-all"
          >
            <span>Back to Top</span>
          </a>
        </div>
        <div className="mt-10 flex items-center justify-center gap-6 text-xs text-brand-subtext font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-green" />
            Operational Live Feed
          </span>
          <span>•</span>
          <span>SIH26077 / MoES &amp; NCMRWF</span>
          <span>•</span>
          <span>Free &amp; Open Access</span>
        </div>
      </div>
    </section>
  );
}

// --- EXTENSIVE FOOTER COMPONENT ---
function Footer() {
  return (
    <footer className="bg-brand-bg border-t border-brand-border py-12 text-sm text-brand-subtext">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Col */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center">
                <Radar className="w-4 h-4 text-brand-accent" />
              </div>
              <span className="text-base text-brand-text font-semibold tracking-tight">
                Meghdoot (मेघदूत)
              </span>
            </div>
            <p className="text-xs text-brand-subtext mt-3 max-w-md leading-relaxed">
              Hyper-local severe weather nowcasting system built for Smart India Hackathon (SIH26077) under the auspices of the Ministry of Earth Sciences (MoES) and the National Centre for Medium Range Weather Forecasting (NCMRWF).
            </p>
            <div className="mt-4 text-xs font-mono text-brand-accent">
              Core Coverage: Punjab, Haryana &amp; Delhi NCT • Expanding All-India
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-brand-text font-semibold mb-3">
              System Modules
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#mission" className="hover:text-brand-text transition-colors">
                  Humanitarian Mission
                </a>
              </li>
              <li>
                <a href="#hazards" className="hover:text-brand-text transition-colors">
                  Atmospheric Triad Heads
                </a>
              </li>
              <li>
                <a href="#telemetry" className="hover:text-brand-text transition-colors">
                  Explainable AI (XAI)
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-brand-text transition-colors">
                  Pipeline Architecture
                </a>
              </li>
              <li>
                <a href="#impact" className="hover:text-brand-text transition-colors">
                  Field Response Workflows
                </a>
              </li>
            </ul>
          </div>

          {/* Technical Specs */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-brand-text font-semibold mb-3">
              Data &amp; Science
            </h4>
            <ul className="space-y-2 text-xs">
              <li>Open-Meteo High-Res Atmosphere</li>
              <li>SRTM Digital Elevation Model (DEM)</li>
              <li>pysheds Hydro Flow Accumulation</li>
              <li>MetPy Kinematic Divergence</li>
              <li>Groq XAI Attribution Narrative</li>
              <li>Offline Replay Protection</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-brand-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            © 2026 Meghdoot Project Team. Designed for life safety, civic preparedness, and open science.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-brand-green flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse-dot" />
              All Systems Nominal
            </span>
            <a href="#dashboard" className="hover:text-brand-text transition-colors">
              Privacy &amp; Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  return (
    <div className="min-h-screen bg-brand-bg font-sans selection:bg-brand-accent/30 selection:text-brand-text">
      <Navbar />
      <main>
        <Hero />
        <MissionSection />
        <AtmosphericTriadSection />
        <LiveTelemetrySection />
        <ArchitectureSection />
        <FieldImpactSection />
        <StandardsSection />
        <CallToActionBanner />
      </main>
      <Footer />
    </div>
  );
}
