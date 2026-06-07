import { useState } from "react";
import { FileText, Loader2, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const reportTypes = [
  { value: "phase1", label: "Phase I ESA Summary" },
  { value: "phase2", label: "Phase II ESA Report" },
  { value: "lab-analysis", label: "Lab Results Analysis" },
  { value: "compliance", label: "Compliance Assessment" },
  { value: "remediation", label: "Remediation Plan" },
  { value: "custom", label: "Custom Report" },
];

export default function Reports() {
  const [reportType, setReportType] = useState("lab-analysis");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult("");

    try {
      const resp = await supabase.functions.invoke("enviro-ai", {
        body: { type: "report", reportType, input },
      });

      if (resp.error) throw resp.error;
      setResult(resp.data?.content || "Could not generate report.");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to generate report", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6 text-info" />
          Report Writer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Generate professional environmental reports from lab data, site assessments, or compliance findings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder="Paste lab results, site data, or describe what you need...&#10;&#10;Example: Soil samples from 123 Main St, Orange CA. TPH-d 450mg/kg, Lead 280mg/kg, Benzene 0.08mg/kg. Site is zoned commercial, adjacent to residential. Need analysis against CA screening levels."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
            Generate Report
          </Button>
        </div>

        <div>
          {result ? (
            <Card className="glass-panel animate-slide-up">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Generated Report</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert max-h-[500px] overflow-auto">
                <ReactMarkdown>{result}</ReactMarkdown>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg p-8">
              Your generated report will appear here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
