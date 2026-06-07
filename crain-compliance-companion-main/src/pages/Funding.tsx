import { useState } from "react";
import { DollarSign, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { askFunding } from "@/lib/enviroApi";

const fundingSources = [
  { name: "Grants.gov", url: "https://www.grants.gov" },
  { name: "SAM.gov", url: "https://sam.gov" },
  { name: "CA Grants Portal", url: "https://www.grants.ca.gov" },
  { name: "EPA Grants", url: "https://www.epa.gov/grants" },
  { name: "CalRecycle Grants", url: "https://calrecycle.ca.gov/grants/" },
  { name: "SWRCB Funding", url: "https://www.waterboards.ca.gov/water_issues/programs/grants_loans/" },
];

export default function Funding() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult("");
    setSources([]);

    try {
      const resp = await askFunding(query.trim());
      setResult(resp.answer || "No results found.");
      setSources(resp.sources || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to search funding", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-warning" />
          Funding Finder
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discover environmental grants, loans & funding from CA and Federal programs that normal search can't find.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {fundingSources.map((s) => (
          <Badge key={s.name} variant="secondary" className="cursor-pointer" onClick={() => window.open(s.url, "_blank")}>
            {s.name}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="e.g. brownfield remediation grants for small businesses in Orange County..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="flex-1"
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          <span className="ml-2">Find Funding</span>
        </Button>
      </div>

      {result && (
        <Card className="glass-panel animate-slide-up">
          <CardHeader>
            <CardTitle className="text-base">Funding Opportunities</CardTitle>
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
