import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Play, RefreshCw } from "lucide-react";

interface GenerationStatus {
  status: "idle" | "generating" | "success" | "error";
  message?: string;
  results?: {
    totalProcessed: number;
    totalStored: number;
    totalErrors: number;
    totalBatches: number;
  };
}

export const DataGenerationPanel = () => {
  const [countries, setCountries] = useState("US,GB,CA,AU,DE");
  const [startYear, setStartYear] = useState("2020");
  const [endYear, setEndYear] = useState(new Date().getFullYear().toString());
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>({
    status: "idle",
  });

  const handleGenerate = async () => {
    try {
      setGenerationStatus({ status: "generating", message: "Starting data generation..." });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase configuration");
      }

      // Parse countries
      const countriesList = countries
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c.length > 0);

      if (countriesList.length === 0) {
        throw new Error("Please provide at least one country code");
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-health-data-table`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          countries: countriesList,
          startYear: parseInt(startYear),
          endYear: parseInt(endYear),
          forceRegenerate,
          skipExisting: !forceRegenerate,
          batchSize: 10,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setGenerationStatus({
        status: "success",
        message: data.message || "Data generation completed successfully",
        results: data.results,
      });
    } catch (error) {
      setGenerationStatus({
        status: "error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  const isGenerating = generationStatus.status === "generating";

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader>
        <CardTitle className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#66dbe1] flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Generate Health Data
        </CardTitle>
        <p className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb99]">
          Generate AI-modeled health statistics for selected countries and years
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="countries" className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb]">
              Countries (comma-separated codes)
            </Label>
            <Input
              id="countries"
              value={countries}
              onChange={(e) => setCountries(e.target.value)}
              placeholder="US,GB,CA,AU,DE"
              disabled={isGenerating}
              className="bg-[#2a4149] border-[#66dbe1] text-white"
            />
            <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
              Use ISO alpha-2 codes (e.g., US, GB, CA, AU, DE)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startYear" className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb]">
              Start Year
            </Label>
            <Input
              id="startYear"
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(e.target.value)}
              disabled={isGenerating}
              className="bg-[#2a4149] border-[#66dbe1] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endYear" className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb]">
              End Year
            </Label>
            <Input
              id="endYear"
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(e.target.value)}
              disabled={isGenerating}
              className="bg-[#2a4149] border-[#66dbe1] text-white"
            />
          </div>

          <div className="space-y-2 flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={forceRegenerate}
                onChange={(e) => setForceRegenerate(e.target.checked)}
                disabled={isGenerating}
                className="w-4 h-4 rounded border-[#66dbe1] bg-[#2a4149]"
              />
              <span className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb]">
                Force regenerate (overwrite existing)
              </span>
            </label>
          </div>
        </div>

        {/* Status Messages */}
        {generationStatus.status !== "idle" && (
          <Alert
            className={
              generationStatus.status === "error"
                ? "bg-red-900/20 border-red-500"
                : generationStatus.status === "success"
                ? "bg-green-900/20 border-green-500"
                : "bg-blue-900/20 border-blue-500"
            }
          >
            {generationStatus.status === "generating" && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {generationStatus.status === "success" && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            {generationStatus.status === "error" && (
              <AlertCircle className="h-4 w-4 text-red-500" />
            )}
            <AlertDescription className="[font-family:'Roboto',Helvetica] text-sm text-[#ebebeb]">
              {generationStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Results Summary */}
        {generationStatus.status === "success" && generationStatus.results && (
          <div className="bg-[#2a4149] rounded-lg p-4 space-y-2">
            <h4 className="[font-family:'Roboto',Helvetica] text-sm font-semibold text-[#66dbe1]">
              Generation Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">Processed</p>
                <p className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">
                  {generationStatus.results.totalProcessed}
                </p>
              </div>
              <div>
                <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">Stored</p>
                <p className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-green-400">
                  {generationStatus.results.totalStored}
                </p>
              </div>
              <div>
                <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">Errors</p>
                <p className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-red-400">
                  {generationStatus.results.totalErrors}
                </p>
              </div>
              <div>
                <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">Batches</p>
                <p className="[font-family:'Roboto',Helvetica] text-lg font-semibold text-[#ebebeb]">
                  {generationStatus.results.totalBatches}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full [font-family:'Roboto',Helvetica] bg-[#4eb7bd] hover:bg-[#3ea7ad] text-white"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Data...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Health Data
            </>
          )}
        </Button>

        {/* Info Note */}
        <div className="bg-[#2a4149] rounded-lg p-3">
          <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
            <strong className="text-[#66dbe1]">Note:</strong> This process may take several minutes
            depending on the number of countries and years selected. The function processes data in
            batches of 10 conditions per API call to ensure reliability.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};










