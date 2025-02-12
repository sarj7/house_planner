# House Planner Tool

## Overview
The **House Planner Tool** is an interactive web application that helps users visualize various amenities near a given address. It utilizes OpenStreetMap (OSM) to display locations of essential services such as EV chargers, hospitals, schools, restaurants, and supermarkets. The tool also calculates and displays the walking distance to these amenities, providing valuable insights for decision-making when choosing a home.

## Features
- **Address Input**: Users can enter an address to locate it on the map.
- **Amenities Visualization**: Displays nearby EV chargers, hospitals, schools, restaurants, and supermarkets.
- **Route Highlighting**: Shows walking paths from the given address to selected amenities.
- **Distance Calculation**: Computes and displays the walking distance to each selected amenity.
- **Interactive Map**: Uses OpenStreetMap for a user-friendly visualization.

## Technologies Used
- **Frontend**: React.js with Leaflet.js for map rendering.
- **Backend**: Node.js with Express.js (if applicable).
- **Mapping Data**: OpenStreetMap (OSM) and Overpass API for retrieving nearby amenities.
- **Geolocation Services**: Nominatim API for address geocoding.

## Installation
### Prerequisites
Ensure you have the following installed:
- **Node.js** (version 16+ recommended)
- **npm** or **yarn**

### Steps
1. **Clone the Repository**
   ```sh
   git clone https://github.com/yourusername/house-planner.git
   cd house-planner
   ```

2. **Install Dependencies**
   ```sh
   npm install
   # or
   yarn install
   ```

3. **Start the Development Server**
   ```sh
   npm start
   # or
   yarn start
   ```

4. **Open in Browser**
   Navigate to `http://localhost:3000` to access the tool.

## Usage
1. Enter an address in the input field and press "Search."
2. The map will update with the address location.
3. Select amenities using checkboxes to display them on the map.
4. The tool will fetch nearby amenities and display them with markers.
5. Clicking on a marker will show the name and walking distance from the given address.
6. A highlighted route from the address to the selected amenity will be shown.

## Configuration
- If using an API key for external services (e.g., Nominatim, Overpass API), ensure it's set up in an `.env` file.
- Customize map appearance and controls by modifying the Leaflet settings in the source code.

## Future Enhancements
- Add filtering options based on distance thresholds.
- Support for additional amenities.
- Optimize performance for large-scale queries.

## Contributing
Contributions are welcome! Follow these steps:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit your changes (`git commit -m "Add new feature"`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License
This project is licensed under the MIT License. See `LICENSE` for details.



