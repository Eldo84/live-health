import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export const SpreadsheetImport = (): JSX.Element => {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/import-spreadsheet-data`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="bg-[#ffffff14] border-[#eaebf024]">
      <CardHeader>
        <h3 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-lg flex items-center gap-2">
          <Upload className="w-5 h-5 text-[#66dbe1]" />
          Import Spreadsheet Data
        </h3>
        <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-sm mt-1">
          Import disease data from Google Spreadsheet into the database
        </p>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleImport}
          disabled={importing}
          className="bg-[#4eb7bd] hover:bg-[#3da5ab] text-white"
        >
          {importing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import Now
            </>
          )}
        </Button>

        {result && (
          <div className="mt-4 p-4 bg-[#4ade8033] border border-[#4ade80] rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#4ade80] mt-0.5" />
              <div className="flex-1">
                <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-2">
                  Import Successful!
                </h4>
                <div className="space-y-1">
                  <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
                    <strong>Total Rows:</strong> {result.total}
                  </p>
                  <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
                    <strong>Processed:</strong> {result.processed}
                  </p>
                  <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
                    <strong>Skipped:</strong> {result.skipped}
                  </p>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="[font-family:'Roboto',Helvetica] font-medium text-[#fbbf24] text-xs cursor-pointer">
                      View Errors ({result.errors.length})
                    </summary>
                    <div className="mt-2 space-y-1">
                      {result.errors.map((err: any, idx: number) => (
                        <p key={idx} className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
                          {err.row}: {err.error}
                        </p>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-[#f8717133] border border-[#f87171] rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#f87171] mt-0.5" />
              <div>
                <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-1">
                  Import Failed
                </h4>
                <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-sm">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 p-4 bg-[#66dbe11a] border border-[#66dbe133] rounded-lg">
          <h4 className="[font-family:'Roboto',Helvetica] font-semibold text-[#ffffff] text-sm mb-2">
            What This Does
          </h4>
          <ul className="space-y-1 list-disc list-inside">
            <li className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
              Fetches data from the Google Spreadsheet
            </li>
            <li className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
              Creates or updates diseases, pathogens, and outbreak categories
            </li>
            <li className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
              Links diseases to their pathogens and outbreak categories
            </li>
            <li className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb] text-xs">
              Extracts and stores keywords for better disease detection
            </li>
          </ul>
        </div>

        <div className="mt-4">
          <p className="[font-family:'Roboto',Helvetica] font-normal text-[#ebebeb99] text-xs">
            <strong>Source:</strong>
            <a
              href="https://docs.google.com/spreadsheets/d/1HU-AANvAkXXLqga2rsSMyy5Hhn3_uJ2ewVZ1UrNbC30/edit"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#66dbe1] hover:underline ml-1"
            >
              Disease Database Spreadsheet
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
