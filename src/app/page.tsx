import Link from 'next/link';
import Script from 'next/script';
import { Navigation, Clock, Search, Building2, Compass, Layers, ShieldCheck, ArrowRight, UserCheck, Briefcase } from 'lucide-react';
import { Logo } from './components/Logo';

export default function LandingPage() {
  return (
    <>
      <Script id="schema-org" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "House Planner",
          "url": "https://houseplanner.example.com",
          "description": "Evaluate real estate and neighborhoods with absolute precision. Get real walking routes and accurate time estimates instantly.",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "All",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        })
      }} />
      <div className="min-h-screen bg-[#fff9f2] text-[#141c22] font-sans overflow-x-hidden">
        {/* Navigation */}
        <header className="fixed w-full z-50 top-0 transition-all duration-300 bg-[#fff9f2]/80 backdrop-blur-md border-b border-[#141c22]/5">
          <nav aria-label="Main navigation" className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-9 h-9" />
            <span className="font-display font-semibold text-xl tracking-tight text-[#141c22]">
              HousePlanner
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-sm text-[#141c22]/70">
            <a href="#features" className="hover:text-[#c6673c] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#c6673c] transition-colors">How it Works</a>
            <a href="#use-cases" className="hover:text-[#c6673c] transition-colors">Use Cases</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/map" className="hidden sm:block text-sm font-semibold text-[#141c22] hover:text-[#c6673c] transition-colors">
              Open App
            </Link>
            <Link
              href="/map"
              className="bg-[#141c22] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#c6673c] transition-all duration-300 shadow-lg shadow-[#141c22]/10 hover:shadow-[#c6673c]/20 hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section aria-labelledby="hero-heading" className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-[#20776f]/10 blur-[120px]" />
          <div className="absolute top-[20%] -left-[10%] w-[40%] h-[40%] rounded-full bg-[#c6673c]/10 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <h1 id="hero-heading" className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-[#141c22] leading-[1.05] max-w-5xl">
            Evaluate any location with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#c6673c] to-[#d6a960]">absolute precision.</span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-[#141c22]/70 max-w-2xl leading-relaxed">
            The definitive platform for discovering and analyzing nearby amenities. Whether you&apos;re house hunting or evaluating real estate, get real walking routes and accurate time estimates instantly.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
            <Link
              href="/map"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#141c22] text-white px-8 py-4 rounded-full text-base font-medium hover:bg-[#c6673c] transition-all duration-300 shadow-xl shadow-[#141c22]/10 hover:shadow-[#c6673c]/20 hover:-translate-y-1 group"
            >
              Start Exploring
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#141c22] border border-[#141c22]/10 px-8 py-4 rounded-full text-base font-medium hover:bg-[#f6efe4] transition-all duration-300"
            >
              See How It Works
            </a>
          </div>

          {/* Hero Image / Dashboard Mockup */}
          <div className="mt-20 w-full max-w-6xl mx-auto relative perspective-1000">
            <div className="relative rounded-2xl md:rounded-[40px] overflow-hidden border border-white/40 shadow-2xl shadow-[#141c22]/15 bg-white/50 backdrop-blur-sm p-2 md:p-4 transform hover:scale-[1.01] transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-white/10 z-10 pointer-events-none rounded-[40px]" />
              <div className="w-full aspect-[4/3] md:aspect-[16/9] rounded-xl md:rounded-[32px] shadow-sm relative z-0 overflow-hidden bg-[#fdfcfa] flex flex-col md:flex-row">
                {/* Abstract Sidebar */}
                <div className="hidden md:flex w-64 lg:w-80 bg-white/90 backdrop-blur-md border-r border-[#141c22]/5 p-6 flex-col gap-6 z-10">
                  <div className="h-12 bg-[#141c22]/5 rounded-xl flex items-center px-4 gap-3">
                    <Search className="w-4 h-4 text-[#141c22]/40" />
                    <div className="h-2.5 w-24 bg-[#141c22]/20 rounded-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 bg-[#c6673c]/10 rounded-xl flex items-center justify-center text-xs font-semibold text-[#c6673c]">Amenities</div>
                    <div className="h-10 bg-[#20776f]/10 rounded-xl flex items-center justify-center text-xs font-semibold text-[#20776f]">Distances</div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="h-3 w-32 bg-[#141c22]/10 rounded-full mb-6 mt-4" />
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-16 bg-[#141c22]/5 rounded-2xl p-4 flex flex-col justify-center gap-2.5 hover:bg-[#141c22]/10 transition-colors">
                        <div className="h-2 w-3/4 bg-[#141c22]/20 rounded-full" />
                        <div className="h-2 w-1/2 bg-[#141c22]/10 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Abstract Map Area */}
                <div className="flex-1 relative bg-[#f1f4f9] overflow-hidden">
                  {/* Grid / Map Base */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#141c22" strokeOpacity="0.04" strokeWidth="1" />
                      </pattern>
                      <linearGradient id="routeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#c6673c" />
                        <stop offset="100%" stopColor="#d6a960" />
                      </linearGradient>
                      <linearGradient id="routeGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#20776f" />
                        <stop offset="100%" stopColor="#2db5a9" />
                      </linearGradient>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Rivers/Parks - abstract shapes */}
                    <path d="M -100 200 C 100 150, 300 300, 500 250 S 800 100, 1200 200 L 1200 800 L -100 800 Z" fill="#d2e3e0" fillOpacity="0.5" />
                    <path d="M 200 -100 C 300 100, 200 300, 400 400 S 700 300, 800 600 S 700 800, 900 900 L 1200 900 L 1200 -100 Z" fill="#e4ebd6" fillOpacity="0.6" />

                    {/* Routes */}
                    <path d="M 300 240 L 450 240 L 450 360 L 650 360 L 750 300" fill="none" stroke="url(#routeGrad1)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 750 300 L 800 300 L 800 180 L 900 180" fill="none" stroke="url(#routeGrad2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M 750 300 L 700 360 L 700 480 L 500 480" fill="none" stroke="#d6a960" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 8" />

                    {/* Nodes / Pins */}
                    {/* Center point */}
                    <g transform="translate(750, 300)">
                      <circle r="24" fill="#141c22" fillOpacity="0.1" className="animate-ping origin-center" />
                      <circle r="10" fill="#141c22" />
                      <circle r="4" fill="#fff" />
                    </g>

                    {/* Destination 1 */}
                    <g transform="translate(300, 240)">
                      <circle r="14" fill="#c6673c" className="drop-shadow-lg" />
                      <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                    </g>

                    {/* Destination 2 */}
                    <g transform="translate(900, 180)">
                      <circle r="14" fill="#20776f" className="drop-shadow-lg" />
                      <circle r="5" fill="#fff" />
                    </g>

                    {/* Destination 3 */}
                    <g transform="translate(500, 480)">
                      <circle r="14" fill="#d6a960" className="drop-shadow-lg" />
                      <rect x="-5" y="-5" width="10" height="10" fill="#fff" rx="1.5" />
                    </g>
                  </svg>

                  {/* Floating Map UI */}
                  <div className="absolute bottom-8 right-8 flex flex-col gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center font-bold text-[#141c22] text-2xl pb-1 hover:bg-gray-50 cursor-pointer">+</div>
                    <div className="w-12 h-12 bg-white rounded-xl shadow-xl flex items-center justify-center font-bold text-[#141c22] text-2xl pb-1 hover:bg-gray-50 cursor-pointer">-</div>
                  </div>

                  <div className="absolute top-8 left-8 bg-white/95 backdrop-blur-md px-5 py-4 rounded-2xl shadow-xl border border-[#141c22]/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#c6673c]/10 flex items-center justify-center">
                      <Navigation className="w-5 h-5 text-[#c6673c]" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold tracking-wider text-[#141c22]/50 uppercase mb-0.5">Selected Route</div>
                      <div className="text-sm font-semibold text-[#141c22]">2.4 km <span className="text-[#141c22]/30 px-1">•</span> 32 mins walking</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements for visual interest */}
            <div className="hidden lg:flex absolute -right-12 top-24 bg-white/90 backdrop-blur-md border border-[#141c22]/5 p-4 rounded-2xl shadow-xl flex-col gap-3 animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#20776f]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#20776f]" />
                </div>
                <div>
                  <div className="text-xs text-[#141c22]/50 font-medium">Walking Time</div>
                  <div className="text-sm font-bold text-[#141c22]">4 mins to Station</div>
                </div>
              </div>
            </div>

            <div className="hidden lg:flex absolute -left-12 bottom-24 bg-white/90 backdrop-blur-md border border-[#141c22]/5 p-4 rounded-2xl shadow-xl flex-col gap-3 animate-bounce-slow-delayed">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#c6673c]/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-[#c6673c]" />
                </div>
                <div>
                  <div className="text-xs text-[#141c22]/50 font-medium">Real Route</div>
                  <div className="text-sm font-bold text-[#141c22]">Street Paths Validated</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section aria-labelledby="features-heading" id="features" className="py-24 bg-white border-y border-[#141c22]/5 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 id="features-heading" className="font-display text-4xl md:text-5xl font-bold text-[#141c22]">Go beyond the straight line.</h2>
            <p className="mt-4 text-lg text-[#141c22]/70">
              Unlike standard tools that draw direct circles, HousePlanner calculates real pedestrian routes to give you the true measure of a neighborhood&apos;s walkability.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Navigation,
                title: 'Real Walking Routes',
                description: 'We calculate the actual paths along streets and pedestrian walkways, ensuring the distances and times you see are what you actually walk.',
                color: 'text-[#c6673c]',
                bg: 'bg-[#c6673c]/10'
              },
              {
                icon: Clock,
                title: 'Accurate Time Estimates',
                description: 'Know exactly how long it takes to walk or drive to the nearest grocery store, hospital, or school before you make a decision.',
                color: 'text-[#20776f]',
                bg: 'bg-[#20776f]/10'
              },
              {
                icon: Layers,
                title: 'Comprehensive Amenities',
                description: 'Filter and discover hospitals, schools, restaurants, supermarkets, and EV charging stations instantly on an interactive map.',
                color: 'text-[#d6a960]',
                bg: 'bg-[#d6a960]/10'
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-[#fff9f2] border border-[#141c22]/5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} flex items-center justify-center mb-6`}>
                  <feature.icon className={`w-7 h-7 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-[#141c22] mb-3">{feature.title}</h3>
                <p className="text-[#141c22]/70 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section aria-labelledby="workflow-heading" id="how-it-works" className="py-24 bg-[#141c22] text-white relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#20776f]/20 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="block text-[#d6a960] font-semibold tracking-wide uppercase text-sm mb-3">Workflow</span>
              <h2 id="workflow-heading" className="font-display text-4xl md:text-5xl font-bold mb-6">Effortless location analysis in three steps.</h2>

              <div className="mt-12 space-y-8">
                {[
                  {
                    step: '01',
                    title: 'Pin a Location',
                    description: 'Search for any address globally or click anywhere on the interactive map to set your central point.'
                  },
                  {
                    step: '02',
                    title: 'Select Amenities',
                    description: 'Choose which services matter most to you—schools, hospitals, transit, or dining. Adjust the number of results needed.'
                  },
                  {
                    step: '03',
                    title: 'Analyze Routes',
                    description: 'Instantly view real walking paths, distances, and time estimates to each amenity, color-coded for clarity.'
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-sm font-bold text-white/60">
                        {item.step}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                      <p className="text-white/60 leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12">
                <Link
                  href="/map"
                  className="inline-flex items-center gap-2 bg-white text-[#141c22] px-8 py-4 rounded-full text-base font-medium hover:bg-[#d6a960] transition-colors duration-300"
                >
                  Try the Map Now
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-full absolute -inset-4 bg-gradient-to-tr from-[#c6673c]/20 to-[#20776f]/20 blur-3xl" />
              <div className="bg-[#fff9f2]/5 border border-white/10 rounded-[32px] p-6 backdrop-blur-md relative">
                 <div className="space-y-4">
                   <div className="h-12 bg-white/10 rounded-xl w-full flex items-center px-4 gap-3">
                     <Search className="w-5 h-5 text-white/40" />
                     <div className="h-4 bg-white/20 rounded w-1/2"></div>
                   </div>
                   <div className="h-[300px] bg-white/5 rounded-xl border border-white/10 relative overflow-hidden flex items-center justify-center">
                     <Compass className="w-16 h-16 text-white/10" />
                     {/* Mock map UI elements */}
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#c6673c] rounded-full shadow-[0_0_20px_rgba(198,103,60,0.6)] z-20"></div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-[#c6673c]/30 z-10"></div>
                     <div className="absolute top-[30%] left-[60%] w-3 h-3 bg-[#20776f] rounded-full shadow-[0_0_15px_rgba(32,119,111,0.6)] z-20"></div>
                     <svg className="absolute inset-0 w-full h-full z-10 opacity-30" preserveAspectRatio="none">
                        <path d="M 50% 50% L 60% 30%" stroke="#20776f" strokeWidth="2" strokeDasharray="4,4" fill="none" />
                     </svg>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="h-24 bg-white/5 rounded-xl p-4">
                        <div className="h-3 w-1/3 bg-white/20 rounded mb-4"></div>
                        <div className="h-6 w-2/3 bg-white/30 rounded"></div>
                     </div>
                     <div className="h-24 bg-white/5 rounded-xl p-4">
                        <div className="h-3 w-1/3 bg-white/20 rounded mb-4"></div>
                        <div className="h-6 w-1/2 bg-[#c6673c]/60 rounded"></div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section aria-labelledby="use-cases-heading" id="use-cases" className="py-24 bg-[#fff9f2] relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 id="use-cases-heading" className="font-display text-4xl md:text-5xl font-bold text-[#141c22]">Built for professionals and individuals.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-[32px] border border-[#141c22]/5 shadow-sm">
              <div className="w-14 h-14 rounded-full bg-[#20776f]/10 flex items-center justify-center mb-6">
                <UserCheck className="w-7 h-7 text-[#20776f]" />
              </div>
              <h3 className="text-2xl font-bold text-[#141c22] mb-4">For Homebuyers & Movers</h3>
              <p className="text-[#141c22]/70 mb-8 leading-relaxed">
                Don&apos;t just look at photos. Ensure your future home is truly walkable to the amenities that matter to your daily life—like your preferred grocery store or the nearest park.
              </p>
              <ul className="space-y-4">
                {['Verify school walkability', 'Check EV charger proximity', 'Evaluate neighborhood livability'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[#141c22]/80 font-medium">
                    <ShieldCheck className="w-5 h-5 text-[#20776f]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#141c22] text-white p-10 rounded-[32px] shadow-xl">
              <div className="w-14 h-14 rounded-full bg-[#c6673c]/20 flex items-center justify-center mb-6">
                <Briefcase className="w-7 h-7 text-[#c6673c]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">For Real Estate Professionals</h3>
              <p className="text-white/70 mb-8 leading-relaxed">
                Provide unmatched value to your clients. Instantly generate factual, visual data about a property&apos;s location to close deals faster and build immediate trust.
              </p>
              <ul className="space-y-4">
                {['Instantly answer location queries', 'Show visual proof of convenience', 'Differentiate your listings'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/90 font-medium">
                    <ShieldCheck className="w-5 h-5 text-[#c6673c]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section aria-labelledby="cta-heading" className="py-24 relative overflow-hidden border-t border-[#141c22]/5">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff9f2] to-[#f6efe4] z-0" />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="w-20 h-20 mx-auto bg-white rounded-2xl shadow-xl flex items-center justify-center mb-8 rotate-3">
            <Building2 className="w-10 h-10 text-[#c6673c]" />
          </div>
          <h2 id="cta-heading" className="font-display text-4xl md:text-6xl font-bold text-[#141c22] mb-6">Ready to map your neighborhood?</h2>
          <p className="text-xl text-[#141c22]/70 mb-10">
            Start using HousePlanner for free. No account required.
          </p>
          <Link
            href="/map"
            className="inline-flex items-center justify-center gap-2 bg-[#c6673c] text-white px-10 py-5 rounded-full text-lg font-semibold hover:bg-[#af4d28] transition-all duration-300 shadow-xl shadow-[#c6673c]/20 hover:shadow-[#c6673c]/40 hover:-translate-y-1"
          >
            Launch Interactive Map
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#141c22] text-white/50 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Logo className="w-7 h-7 invert brightness-0 opacity-80" />
            <span className="font-display font-semibold text-lg text-white">HousePlanner</span>
          </div>
          <div className="flex gap-8 text-sm">
            <Link href="/map" className="hover:text-white transition-colors">Map Application</Link>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} HousePlanner. All rights reserved.
          </p>
        </div>
      </footer>
      </main>
    </div>
    </>
  );
}
