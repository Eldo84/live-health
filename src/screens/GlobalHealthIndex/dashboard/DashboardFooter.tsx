import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image, Database } from "lucide-react";

export const DashboardFooter = () => {
  return (
    <Card className="bg-card-subtle border-t">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Data Sources */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Data Sources</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Global Burden of Disease Study 2024</p>
              <p>• World Health Organization Global Health Observatory</p>
              <p>• Institute for Health Metrics and Evaluation (IHME)</p>
              <p>• National health surveillance systems</p>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Export Options</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Database className="h-4 w-4" />
                CSV Data
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Image className="h-4 w-4" />
                PNG Charts
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                PDF Report
              </Button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="space-y-2 max-w-md">
            <h4 className="text-sm font-semibold text-foreground">Important Notes</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Equity and intervention data are AI-generated for demonstration purposes</p>
              <p>• Disease burden metrics are based on established epidemiological models</p>
              <p>• Data updated quarterly with latest available information</p>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="border-t pt-4 mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Global Health Burden Dashboard • Last updated: September 2024 • 
            <span className="ml-2">
              Built for comprehensive health analytics and policy planning
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};