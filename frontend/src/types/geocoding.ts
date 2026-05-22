export interface GeocodingResult {
  display: string;
  lat: number;
  lon: number;
}

export interface ReverseGeocodeResult {
  city: string;
  region: string;
  country: string;
  display: string;
}

export interface StoredLocation {
  city: string;
  lat: number;
  lon: number;
}
