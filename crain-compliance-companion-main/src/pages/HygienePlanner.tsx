import { useState } from "react";
import { Shield, Loader2, Copy, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const hazardTypes = [
  { value: "asbestos", label: "Asbestos (ACM / ACBM)" },
  { value: "lead", label: "Lead-Based Paint / Dust / Soil" },
  { value: "pcb", label: "PCBs (Polychlorinated Biphenyls)" },
  { value: "mold", label: "Mold / Biological Hazards" },
  { value: "soil-contamination", label: "Soil Contamination / Remediation" },
  { value: "groundwater", label: "Groundwater Contamination" },
  { value: "ust", label: "Underground Storage Tanks (USTs)" },
  { value: "general", label: "General Environmental Hazard" },
];

export default function HygienePlanner() {
  const [hazardType, setHazardType] = useState("asbestos");
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
        body: { type: "hygiene-plan", hazardType, input },
      });

      if (resp.error) throw resp.error;
      setResult(resp.data?.content || "Could not generate plan.");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Plan generation failed", variant: "destructive" });
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
          <Shield className="h-6 w-6 text-primary" />
          Hygiene & Remediation Planner
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Get abatement plans, remediation strategies, and expert consultation tips — sourced exclusively from official government guidance (EPA, OSHA, DTSC, Cal/OSHA).
        </p>
      </div>

      <Card className="glass-panel border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            All recommendations are sourced from official government regulations and guidance documents. Always consult with a licensed professional before implementing any abatement or remediation plan.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select value={hazardType} onValueChange={setHazardType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {hazardTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            placeholder={`Describe the environmental hazard or situation...\n\nExample: During a building renovation inspection at a 1965 commercial building in Anaheim, CA, we identified friable asbestos-containing material in pipe insulation throughout the basement mechanical room (~500 linear feet). The building is occupied and the owner wants to renovate the space for office use. What are the abatement requirements, notification procedures, and recommended next steps?`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[300px] text-sm"
          />

          <Button onClick={handleGenerate} disabled={loading || !input.trim()} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Generate Plan
          </Button>
        </div>

        <div>
          {result ? (
            <Card className="glass-panel animate-slide-up">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Remediation Plan</CardTitle>
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
              <div className="text-center space-y-2">
                <Shield className="h-10 w-10 mx-auto opacity-30" />
                <p>Your remediation plan will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
