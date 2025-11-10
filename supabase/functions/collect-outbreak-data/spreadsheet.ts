import csv from "npm:csvtojson@2";

const HUMAN_DISEASE_SPREADSHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=0";

const VETERINARY_DISEASE_SPREADSHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/export?format=csv&gid=591383749";

// we don't have to worry about stale data here since we're in a serverless function
const cache: Record<string, string> = {};

export async function loadSheetCSV(spreadsheetUrl: string): Promise<string> {
  if (cache[spreadsheetUrl]) {
    return cache[spreadsheetUrl];
  }
  const csvResponse = await fetch(spreadsheetUrl);
  const csvText = await csvResponse.text();
  cache[spreadsheetUrl] = csvText;
  return csvText;
}

export function loadHumanDiseaseCSV(): Promise<string> {
  return loadSheetCSV(HUMAN_DISEASE_SPREADSHEET_CSV_URL);
}

export function loadVeterinaryDiseaseCSV(): Promise<string> {
  return loadSheetCSV(VETERINARY_DISEASE_SPREADSHEET_CSV_URL);
}

export async function loadAllDiseaseCSVs(): Promise<{
  human: string;
  veterinary: string;
}> {
  const [human, veterinary] = await Promise.all([
    loadHumanDiseaseCSV(),
    loadVeterinaryDiseaseCSV(),
  ]);
  return { human, veterinary };
}

export async function csvToJson(csvText: string) {
  return await csv().fromString(csvText);
}
