// Static AI predictions surfaced in the design's foresight panel.
// We don't yet have a real model output endpoint, so these are curated
// placeholders. Once a forecast endpoint exists, replace this with a hook.

export interface Prediction {
  id: string;
  region: string;
  disease: string;
  horizon: string;
  risk: number;
  confidence: number;
  drivers: string[];
  /** Approximate centroid of the region [lat, lng] — used to zoom the map. */
  center: [number, number];
}

export const PREDICTIONS: Prediction[] = [
  {
    id: "p1",
    region: "Greater Horn of Africa",
    disease: "Cholera",
    horizon: "14d",
    risk: 0.86,
    confidence: 0.78,
    drivers: ["Rainfall anomaly", "Refugee movement", "WaSH gap"],
    center: [8, 40],
  },
  {
    id: "p2",
    region: "Southeast Brazil",
    disease: "Dengue",
    horizon: "21d",
    risk: 0.81,
    confidence: 0.83,
    drivers: ["Temperature ↑", "Aedes density", "Search trends"],
    center: [-23, -45],
  },
  {
    id: "p3",
    region: "Mekong Delta",
    disease: "H5N1",
    horizon: "30d",
    risk: 0.62,
    confidence: 0.59,
    drivers: ["Poultry trade", "Migration corridor"],
    center: [10, 105],
  },
  {
    id: "p4",
    region: "Central Europe",
    disease: "Measles",
    horizon: "60d",
    risk: 0.54,
    confidence: 0.71,
    drivers: ["Vaccination gap", "Travel uptick"],
    center: [49, 15],
  },
];
