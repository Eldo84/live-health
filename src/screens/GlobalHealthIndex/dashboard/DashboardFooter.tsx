import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Image, Database } from "lucide-react";

export const DashboardFooter = () => {
  return (
    <Card className="bg-[#ffffff14] border-t border-[#eaebf024]">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Data Sources */}
          <div className="space-y-2">
            <h4 className="[font-family:'Roboto',Helvetica] text-sm font-semibold text-[#66dbe1]">Data Sources</h4>
            <div className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] space-y-1">
              <p>• AI-Generated Estimates (DeepSeek) - <span className="text-[#fbbf24]">Currently Active</span></p>
              <p className="text-[#ebebeb66]">• Global Burden of Disease Study (IHME) - <span className="text-[#ebebeb66]">Integration Pending</span></p>
              <p className="text-[#ebebeb66]">• World Health Organization (WHO) - <span className="text-[#ebebeb66]">Integration Pending</span></p>
              <p className="text-[#ebebeb66]">• Centers for Disease Control (CDC) - <span className="text-[#ebebeb66]">Integration Pending</span></p>
            </div>
            <p className="[font-family:'Roboto',Helvetica] text-[10px] text-[#ebebeb66] mt-2 italic">
              Note: Official data source integrations are in development. Current data uses AI estimates for demonstration purposes.
            </p>
          </div>

          {/* Export Options */}
          <div className="space-y-2">
            <h4 className="[font-family:'Roboto',Helvetica] text-sm font-semibold text-[#66dbe1]">Export Options</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2 [font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]">
                <Database className="h-4 w-4" />
                CSV Data
              </Button>
              <Button variant="outline" size="sm" className="gap-2 [font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]">
                <Image className="h-4 w-4" />
                PNG Charts
              </Button>
              <Button variant="outline" size="sm" className="gap-2 [font-family:'Roboto',Helvetica] border-[#eaebf024] text-[#ebebeb] hover:bg-[#ffffff1a]">
                <FileText className="h-4 w-4" />
                PDF Report
              </Button>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="space-y-2 max-w-md">
            <h4 className="[font-family:'Roboto',Helvetica] text-sm font-semibold text-[#66dbe1]">Important Notes</h4>
            <div className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99] space-y-1">
              <p>• Equity and intervention data are AI-generated for demonstration purposes</p>
              <p>• Disease burden metrics are based on established epidemiological models</p>
              <p>• Data updated quarterly with latest available information</p>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="border-t border-[#eaebf024] pt-4 mt-6 text-center">
          <p className="[font-family:'Roboto',Helvetica] text-xs text-[#ebebeb99]">
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