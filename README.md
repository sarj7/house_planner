# HousePlanner

HousePlanner is a web application for evaluating a location by the everyday amenities around it. It combines an interactive map, OpenStreetMap amenity data, route-aware distance estimates, and a polished planning interface so users can compare hospitals, schools, restaurants, supermarkets, and EV charging stations around any selected place.

The project includes a public landing page at `/` and the main planning experience at `/map`.

## Features

- Search for a location by address, use the browser's current location, or click directly on the map.
- Compare nearby amenities by category: EV chargers, hospitals, schools, restaurants, and supermarkets.
- Select a search radius up to 50 km.
- Choose how many amenities to display per selected category.
- Fetch amenities only when the user explicitly clicks `Find Nearby Amenities`.
- Show color-coded amenity markers and matching color-coded selection controls.
- Display walking and driving route information where routing data is available.
- Estimate walking time from walking route distance using a transparent average walking speed calculation.
- Use provider fallbacks and clear user-facing messages when map data providers return partial results, no results, rate limits, or errors.
- Keep detailed amenity diagnostics hidden in production by default, with an opt-in environment flag for debugging.
- Support a responsive layout with a resizable desktop control panel and a mobile-friendly map experience.

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Leaflet and React Leaflet
- Lucide React icons
- OpenStreetMap tiles
- Overpass API for amenity data
- OSRM for routing fallback
- Optional OpenRouteService routing support
- Optional Positionstack address search support

## Project Structure

```text
src/app/
  page.tsx                    Landing page
  map/page.tsx                Main app route
  icon.svg                    App favicon and brand icon
  health/route.ts             Health check endpoint
  api/amenities/route.ts      Amenity search proxy and provider fallback logic
  api/route/route.ts          Route calculation and routing fallback logic
  components/
    HousePlanner.tsx          Main planner layout, state, search flow, result handling
    AmenityControls.tsx       Radius, result count, and amenity selection controls
    MapComponent.tsx          Leaflet map, markers, routes, and map interactions
    Logo.tsx                  Shared app logo
```

## Getting Started

### Prerequisites

- Node.js 20 or newer is recommended.
- npm

### Installation

```bash
git clone https://github.com/sarj7/house_planner.git
cd house_planner
npm install
```

### Environment Variables

The app can run without paid API keys by using public OpenStreetMap, Overpass, and OSRM services. Optional environment variables can improve geocoding or enable OpenRouteService routing.

Create `.env.local` if needed:

```bash
NEXT_PUBLIC_POSITIONSTACK_ACCESS_KEY=
OPENROUTE_API_KEY=
ENABLE_OPENROUTE=false
NEXT_PUBLIC_SHOW_AMENITY_DIAGNOSTICS=false
```

Variable reference:

- `NEXT_PUBLIC_POSITIONSTACK_ACCESS_KEY`: optional Positionstack key for address search.
- `OPENROUTE_API_KEY`: optional OpenRouteService API key.
- `ENABLE_OPENROUTE`: set to `true` to use OpenRouteService before falling back to OSRM.
- `NEXT_PUBLIC_SHOW_AMENITY_DIAGNOSTICS`: set to `true` to show detailed amenity provider diagnostics in production.

### Development

```bash
npm run dev
```

Open `http://localhost:3000` for the landing page or `http://localhost:3000/map` for the planner.

### Production Build

```bash
npm run build
npm run start
```

### Health Check

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "ok": true }
```

## Usage

1. Open the app and go to `/map`.
2. Search for an address, use current location, or select a point on the map.
3. Set the search radius.
4. Choose how many nearby amenities to show per selected category.
5. Select one or more amenity categories.
6. Click `Find Nearby Amenities`.
7. Review markers, result cards, distances, estimated travel times, and provider messages.

If fewer amenities are available than requested, the app explains that directly, for example: `Showing 9 of 35 hospitals. Only 9 were found within 13 km.`

## Data and Routing Notes

HousePlanner uses public map data services. Availability, rate limits, and response times can vary by provider and region.

- Amenity data comes from Overpass API providers.
- Routing uses OSRM by default.
- OpenRouteService is available only when explicitly enabled with `ENABLE_OPENROUTE=true` and a valid `OPENROUTE_API_KEY`.
- If a provider fails or returns incomplete data, the app tries fallback providers and shows a concise message instead of a vague failure state.
- Large searches, especially near dense cities or at high radius values, can take longer and may return partial results depending on provider limits.

## Deployment

The app is designed for Vercel deployment.

Recommended Vercel settings:

- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: `.next`
- Node.js runtime: use the current Vercel default compatible with Next.js 15

Optional production environment variables:

```bash
NEXT_PUBLIC_POSITIONSTACK_ACCESS_KEY=
OPENROUTE_API_KEY=
ENABLE_OPENROUTE=false
NEXT_PUBLIC_SHOW_AMENITY_DIAGNOSTICS=false
```

For most deployments, keep `ENABLE_OPENROUTE=false` unless the OpenRouteService key is confirmed to work in production. The OSRM fallback keeps routing available without depending on OpenRouteService.

## Scripts

```bash
npm run dev      # Start the development server
npm run build    # Create a production build
npm run start    # Start the production server
npm run lint     # Run ESLint
npm run clean    # Remove the Next.js build directory
```

## License

No license has been published for this repository.
