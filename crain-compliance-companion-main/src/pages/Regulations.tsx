import { useState } from "react";
import { Search, Scale, ExternalLink, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { askRegulations } from "@/lib/enviroApi";

const officialSources = {
  california: [
    { name: "CalEPA", url: "https://calepa.ca.gov" },
    { name: "DTSC", url: "https://dtsc.ca.gov" },
    { name: "SWRCB", url: "https://www.waterboards.ca.gov" },
    { name: "CARB", url: "https://ww2.arb.ca.gov" },
  ],
  federal: [
    { name: "US EPA", url: "https://www.epa.gov" },
    { name: "OSHA", url: "https://www.osha.gov" },
    { name: "DOE", url: "https://www.energy.gov" },
    { name: "USACE", url: "https://www.usace.army.mil" },
  ],
  eu: [
    { name: "ECHA", url: "https://echa.europa.eu" },
    { name: "EEA", url: "https://www.eea.europa.eu" },
    { name: "EU Environment", url: "https://environment.ec.europa.eu" },
  ],
};

export default function Regulations() {
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState("california");
  const [result, setResult] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    if (jurisdiction !== "california") {
      toast({ title: "Coming soon", description: "Only California lookup is available right now." });
      return;
    }
    setLoading(true);
    setResult("");
    setSources([]);

    try {
      const jurisdictionLabel = jurisdiction === "california"
        ? "California"
        : jurisdiction === "federal"
          ? "U.S. Federal"
          : "European Union";
      const prompt = `[Jurisdiction: ${jurisdictionLabel}] ${query.trim()}`;
      const resp = await askRegulations(prompt);
      setResult(resp.answer || "No results found.");
      setSources(resp.sources || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to search regulations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Scale className="h-6 w-6 text-primary" />
          Regulatory Lookup
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Search environmental laws and regulations from official government sources only.
        </p>
      </div>

      <Tabs value={jurisdiction} onValueChange={setJurisdiction}>
        <TabsList>
          <TabsTrigger value="california">California</TabsTrigger>
          <TabsTrigger value="federal" disabled>U.S. Federal (Coming soon)</TabsTrigger>
          <TabsTrigger value="eu" disabled>European Union (Coming soon)</TabsTrigger>
        </TabsList>

        {(["california", "federal", "eu"] as const).map((jur) => (
          <TabsContent key={jur} value={jur}>
            <div className="flex flex-wrap gap-2 mb-4">
              {officialSources[jur].map((s) => (
                <Badge key={s.name} variant="secondary" className="cursor-pointer" onClick={() => window.open(s.url, "_blank")}>
                  {s.name} <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-2">
        <Input
          placeholder="e.g. RCRA hazardous waste storage requirements in Orange County..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Search</span>
        </Button>
      </div>

      {result && (
        <Card className="glass-panel animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>{result}</ReactMarkdown>
            {sources.length > 0 && (
              <div className="not-prose mt-4">
                <p className="text-sm font-semibold">Sources</p>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {sources.map((source) => (
                    <li key={source}>
                      <a href={source} target="_blank" rel="noreferrer" className="underline underline-offset-2 break-all">
                        {source}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
