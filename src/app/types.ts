export type Location = [number, number];

export interface Amenity {
  id?: string | number;
  name: string;
  position: Location;
  distance?: number;
  tags?: Record<string, any>;
  number?: number;
  color?: string;
  type?: string;
}

export interface Place {
  place_id?: string | number;
  display_name?: string;
  lat?: string | number;
  lon?: string | number;
  address?: Record<string, any>;
}
