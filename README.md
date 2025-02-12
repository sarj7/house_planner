# HousePlanner

HousePlanner is a Next.js-based web application that helps you plan your ideal home location by visualizing nearby amenities on an interactive map. Using a combination of mapping and routing APIs, HousePlanner enables you to:

- **Search and select an address:** Leverage the Nominatim API for address autocomplete and reverse geocoding.
- **View an interactive map:** Enjoy a smooth, dynamic map experience with React-Leaflet and Leaflet.
- **Discover nearby amenities:** Quickly locate EV Chargers, Hospitals, Schools, Restaurants, and Supermarkets using the Overpass API.
- **Visualize walking routes:** Get walking route information between your selected location and nearby amenities with the OSRM API.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [APIs and Data Sources](#apis-and-data-sources)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Address Search & Autocomplete:**  
  Type in your home address and view location suggestions powered by the Nominatim API.

- **Dynamic Map Display:**  
  An interactive map built with React-Leaflet that centers on Calgary by default. Once you select a location, the map updates to focus on your chosen spot.

- **Amenity Selection:**  
  Choose from a list of amenities (EV Chargers, Hospitals, Schools, Restaurants, Supermarkets) to search for nearby facilities within a 2 km radius.

- **Route Visualization:**  
  Displays walking routes from your selected location to the nearest amenities using the OSRM API.

- **Responsive UI:**  
  A clean and responsive interface styled with Tailwind CSS.

## Prerequisites

- **Node.js** (version 14 or later)
- **npm** or **yarn**

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/houseplanner.git
   cd houseplanner

