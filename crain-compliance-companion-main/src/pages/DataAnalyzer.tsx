import { useState, useCallback, useMemo, useEffect } from "react";
import { BarChart3, Upload, Loader2, Copy, Check, FileSpreadsheet, Shield, BookmarkPlus, ExternalLink, Globe, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { API_BASE_URL } from "@/lib/enviroApi";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const analysisTypes = [
  { value: "emissions", label: "Emissions Data (SO₂, NOₓ, CO, CO₂, NH₃)" },
  { value: "soil", label: "Soil Sampling Results" },
  { value: "water", label: "Water Quality / Groundwater" },
  { value: "air", label: "Ambient Air Monitoring" },
  { value: "asbestos", label: "Asbestos / Lead / PCB Results" },
  { value: "general", label: "General Lab Results" },
];

const domainRegistry: Record<string, Record<string, Record<string, string[]>>> = {
    "USA": {
        "Federal": {
            "emissions": ["epa.gov", "osha.gov"],
            "water": ["epa.gov", "usgs.gov"],
            "soil": ["epa.gov"],
            "air": ["epa.gov"],
            "asbestos": ["osha.gov", "epa.gov"],
            "general": ["epa.gov", "osha.gov", "cdc.gov"]
        },
        "California": {
            "emissions": ["arb.ca.gov", "dir.ca.gov", "epa.gov"],
            "water": ["waterboards.ca.gov", "epa.gov"],
            "soil": ["dtsc.ca.gov", "epa.gov"],
            "air": ["arb.ca.gov", "epa.gov"],
            "asbestos": ["dir.ca.gov", "epa.gov"],
            "general": ["cdph.ca.gov", "epa.gov"]
        },
        "Texas": {
            "emissions": ["tceq.texas.gov", "epa.gov"],
            "water": ["tceq.texas.gov", "epa.gov"],
            "soil": ["tceq.texas.gov", "epa.gov"],
            "air": ["tceq.texas.gov", "epa.gov"],
            "asbestos": ["dshs.texas.gov", "epa.gov"],
            "general": ["tceq.texas.gov", "epa.gov"]
        }
    },
    "United Kingdom": {
        "National": {
            "emissions": ["hse.gov.uk", "environment-agency.gov.uk"],
            "water": ["environment-agency.gov.uk", "dwi.gov.uk"],
            "soil": ["environment-agency.gov.uk"],
            "air": ["environment-agency.gov.uk"],
            "asbestos": ["hse.gov.uk"],
            "general": ["hse.gov.uk", "gov.uk"]
        }
    },
    "Canada": {
        "Federal": {
            "emissions": ["canada.ca", "ccme.ca"],
            "water": ["canada.ca", "ccme.ca"],
            "soil": ["ccme.ca"],
            "air": ["canada.ca", "ccme.ca"],
            "asbestos": ["canada.ca"],
            "general": ["canada.ca"]
        },
        "Ontario": {
            "emissions": ["ontario.ca", "ccme.ca"],
            "water": ["ontario.ca", "ccme.ca"],
            "soil": ["ontario.ca", "ccme.ca"],
            "air": ["ontario.ca", "ccme.ca"],
            "asbestos": ["ontario.ca"],
            "general": ["ontario.ca"]
        }
    },
    "Australia": {
        "National": {
            "emissions": ["dcceew.gov.au", "safeworkaustralia.gov.au"],
            "water": ["dcceew.gov.au", "nhmrc.gov.au"],
            "soil": ["nepc.gov.au"],
            "air": ["dcceew.gov.au"],
            "asbestos": ["safeworkaustralia.gov.au"],
            "general": ["dcceew.gov.au"]
        }
    },
    "European Union": {
        "EEA": {
            "emissions": ["eea.europa.eu", "osha.europa.eu"],
            "water": ["eea.europa.eu"],
            "soil": ["eea.europa.eu"],
            "air": ["eea.europa.eu"],
            "asbestos": ["osha.europa.eu"],
            "general": ["eea.europa.eu", "osha.europa.eu"]
        }
    }
};

export default function DataAnalyzer() {
  const [analysisType, setAnalysisType] = useState("emissions");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [customDomains, setCustomDomains] = useState("");
  
  const [selectedCountry, setSelectedCountry] = useState("USA");
  const [selectedRegion, setSelectedRegion] = useState("Federal");
  const [activeDomains, setActiveDomains] = useState<string[]>([]);
  
  useEffect(() => {
    const countryData = domainRegistry[selectedCountry];
    if (!countryData) return;
    
    let region = selectedRegion;
    if (!countryData[region]) {
        region = Object.keys(countryData)[0];
        setSelectedRegion(region);
    }
    
    const available = countryData[region]?.[analysisType] || countryData[region]?.["general"] || [];
    setActiveDomains(available);
    setCustomDomains(available.join(", "));
  }, [selectedCountry, selectedRegion, analysisType]);

  const [expertSummary, setExpertSummary] = useState<any>(null);
  const [expertRecommendations, setExpertRecommendations] = useState<any[]>([]);
  const [expertRows, setExpertRows] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<"All" | "Violations" | "Compliant">("All");

  const filteredRows = useMemo(() => {
    if (filterStatus === "Violations") {
        return expertRows.filter(r => r.status === 'severe' || r.status === 'critical' || r.status === 'warning');
    }
    if (filterStatus === "Compliant") {
        return expertRows.filter(r => r.status === 'safe');
    }
    return expertRows;
  }, [expertRows, filterStatus]);

  const { toast } = useToast();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    if (file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setInput(`[Binary File Selected: ${file.name}]\n\nReady for analysis...`);
        toast({ title: "File loaded", description: `${file.name} securely held for processing.` });
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInput(text);
      toast({ title: "Text Preview loaded", description: `${file.name} content loaded into the input area.` });
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Could not read file.", variant: "destructive" });
    };
    reader.readAsText(file);
  }, [toast]);

  const [isStreaming, setIsStreaming] = useState(false);

  const handleAnalyze = async () => {
    if (!input.trim() && !uploadedFile) return;
    setLoading(true);
    setIsStreaming(true);
    setResult("");

    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      } else {
        formData.append("prompt", input);
      }
      formData.append("analysis_type", analysisType);
      if (customDomains.trim()) {
        formData.append("custom_domains", customDomains);
      }

      // 1. Fetch Gemini API
      fetch(`${API_BASE_URL}/ai/analyze`, {
        method: "POST",
        body: formData,
      })
      .then(res => res.json())
      .then(data => {
          setResult(data.content || "Could not format analysis data.");
      })
      .catch(e => {
          toast({ title: "Error", description: e.message || "Analysis failed", variant: "destructive" });
      })
      .finally(() => {
          setLoading(false);
      });

      // 2. Fetch SSE Streaming Scraper
      setExpertSummary(null);
      setExpertRecommendations([]);
      setExpertRows([]);
      
      const sseFormData = new FormData();
      if (uploadedFile) {
        sseFormData.append("file", uploadedFile);
      } else {
        sseFormData.append("prompt", input);
      }
      sseFormData.append("analysis_type", analysisType);
      if (customDomains.trim()) {
        sseFormData.append("custom_domains", customDomains);
      }

      try {
        const streamRes = await fetch(`${API_BASE_URL}/ai/scrape/stream`, {
            method: "POST",
            body: sseFormData,
        });
        
        const reader = streamRes.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        if (reader) {
            let buffer = "";
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                buffer = lines.pop() || ""; // Keep the last incomplete line in buffer
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const parsed = JSON.parse(line.substring(6));
                            if (parsed.error) {
                                toast({ title: "Scraper Error", description: parsed.error, variant: "destructive" });
                            } else if (parsed.packet_type === "summary") {
                                setExpertSummary(parsed);
                            } else if (parsed.packet_type === "recommendations") {
                                setExpertRecommendations(parsed.recommendations);
                            } else if (parsed.packet_type === "row") {
                                setExpertRows(prev => [...prev, parsed]);
                            } else {
                                // Fallback
                                setExpertRows(prev => [...prev, parsed]);
                            }
                        } catch (e) {
                            // Ignored JSON parse error
                        }
                    }
                }
            }
        }
      } catch (e) {
          console.error("Stream failed", e);
      } finally {
          setIsStreaming(false);
      }
      
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Request failed", variant: "destructive" });
      setLoading(false);
      setIsStreaming(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parsedData = useMemo(() => {
    if (!input.trim()) return [];
    
    const parse = (text: string, separator: string = ',') => {
      const result: string[][] = [];
      let row: string[] = [];
      let currentVal = '';
      let inQuotes = false;
      
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"' && inQuotes && nextChar === '"') {
          currentVal += '"'; i++;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === separator && !inQuotes) {
          row.push(currentVal.trim()); currentVal = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          row.push(currentVal.trim()); result.push(row); row = []; currentVal = '';
        } else {
          currentVal += char;
        }
      }
      if (currentVal || row.length > 0) {
        row.push(currentVal.trim()); result.push(row);
      }
      return result.filter(r => r.some(c => c !== ''));
    };

    const isTab = input.includes('\t') && !input.includes(',');
    return parse(input, isTab ? '\t' : ',');
  }, [input]);

  const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...parsedData];
    newData[rowIndex + 1][colIndex] = value;
    const isTab = input.includes('\t') && !input.includes(',');
    const newText = newData.map(row => row.join(isTab ? '\t' : ',')).join('\n');
    setInput(newText);
  };

  const handleExport = () => {
    if (expertRows.length === 0) return;
    const headers = ["Sample ID", "Analyte", "Value", "Unit", "Regulatory Limit", "Status", "Insight", "Source", "Excerpt"];
    const rows = expertRows.map(i => [
        `"${i.sample_id || ''}"`,
        `"${i.analyte}"`,
        i.csv_value,
        `"${i.csv_unit || ''}"`,
        `"${i.limit_val ? `${i.limit_val} ${i.limit_unit}` : 'N/A'}"`,
        `"${i.status}"`,
        `"${(i.insight || '').replace(/"/g, '""')}"`,
        `"${i.source}"`,
        `"${(i.excerpt || '').replace(/"/g, '""')}"`
    ].join(","));
    
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "EHS_Compliance_Audit_Log.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const highlightText = (text: string, keyword: string) => {
    if (!keyword || !text) return text;
    const safeKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeKeyword}|\\b\\d+(?:\\.\\d+)?\\b)`, 'gi');
    return text.split(regex).map((part, i) => {
      if (regex.test(part)) {
        return <mark key={i} className="bg-yellow-500/30 text-yellow-700 dark:text-yellow-400 font-bold px-1 rounded">{part}</mark>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Data Analyzer
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Upload or paste emissions, lab results, or observation data. AI will analyze against EPA, Cal/OSHA, and EU screening levels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {analysisTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div>
            <label className="flex items-center gap-2 cursor-pointer border border-dashed border-border rounded-lg p-4 hover:bg-accent/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload CSV, TSV, TXT, PDF, or DOCX file</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.xls,.xlsx,.pdf,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
          
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><Globe className="h-3 w-3"/> Jurisdiction (Country)</label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(domainRegistry).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1"><MapPin className="h-3 w-3"/> Region / Authority</label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger className="bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(domainRegistry[selectedCountry] || {}).map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Target Domains</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {activeDomains.map(d => (
                        <div 
                            key={d}
                            onClick={() => {
                                const active = customDomains.split(",").map(s => s.trim()).filter(s => s);
                                if (active.includes(d)) {
                                    setCustomDomains(active.filter(a => a !== d).join(", "));
                                } else {
                                    setCustomDomains([...active, d].join(", "));
                                }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                                customDomains.split(",").map(s => s.trim()).includes(d) 
                                ? 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700'
                                : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900'
                            }`}
                        >
                            {d}
                        </div>
                    ))}
                </div>
                <Input 
                  placeholder="e.g. custom.gov, additional.org" 
                  value={customDomains} 
                  onChange={(e) => setCustomDomains(e.target.value)} 
                  className="bg-white dark:bg-slate-950 h-8 text-xs"
                />
            </div>
          </div>

          <Tabs defaultValue="raw" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="raw">Raw Data</TabsTrigger>
              <TabsTrigger value="preview" disabled={parsedData.length === 0}>Data Preview (Table)</TabsTrigger>
            </TabsList>
            <TabsContent value="raw">
              <Textarea
                placeholder={`Paste your data here (CSV, tab-separated, or plain text)...\n\nExample:\nSample ID, Analyte, Result (mg/kg), Screening Level\nS-1, Lead, 280, 80\nS-2, Benzene, 0.08, 0.044...`}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  setUploadedFile(null); 
                }}
                className="min-h-[300px] font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded-md max-h-[300px] overflow-auto bg-background">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      {parsedData[0]?.map((header, i) => (
                        <TableHead key={i} className="whitespace-nowrap">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(1).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => (
                          <TableCell key={j} className="whitespace-pre-wrap min-w-[120px] p-0">
                              <input 
                                className="w-full h-full bg-transparent border-0 px-4 py-3 focus:ring-2 focus:ring-primary outline-none" 
                                value={cell} 
                                onChange={(e) => handleCellChange(i, j, e.target.value)} 
                              />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleAnalyze} disabled={loading || !input.trim()} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Analyze Data
          </Button>
        </div>

        <div className="flex flex-col gap-4 h-full">
          {result && (
            <Card className="glass-panel animate-slide-up flex-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold text-primary">Section 1. Results displayed by Gemini API</CardTitle>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none dark:prose-invert max-h-[500px] overflow-auto border-t border-border mt-2 pt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </CardContent>
            </Card>
          )}

          {(expertSummary || expertRows.length > 0) && (
            <Card className="glass-panel animate-slide-up border-slate-300 dark:border-slate-700 shadow-md mt-4 flex flex-col min-h-0 printable-area">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b">
                <div>
                  <CardTitle className="text-xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    EHS Regulatory Compliance Audit
                  </CardTitle>
                </div>
                <div className="flex gap-2 mt-4 sm:mt-0">
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8">
                      Print Audit Report
                  </Button>
                  <Button variant="default" size="sm" onClick={handleExport} className="h-8 bg-indigo-600 hover:bg-indigo-700">
                      Export Evidence Log
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 overflow-auto flex-1 py-6 px-6">
                {/* 0. Audit Metadata */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4 border-b text-sm">
                  <div>
                    <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</span>
                    <span className="font-medium">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Analyst</span>
                    <span className="font-medium">EnviroHub Automated Engine</span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</span>
                    <span className="font-medium truncate block">Target Domain Analysis ({customDomains || 'General Search'})</span>
                  </div>
                </div>

                {/* 1. Audit Scope */}
                {expertSummary && (
                  <div className="space-y-3 text-sm">
                    <h3 className="font-bold text-base border-b pb-1 border-slate-200 dark:border-slate-800 uppercase tracking-wide text-slate-600 dark:text-slate-400">1. Audit Scope</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <p><span className="font-bold">Total Records Analyzed:</span> {expertSummary.total_records}</p>
                      <p><span className="font-bold">Primary Parameters:</span> {expertSummary.parameters?.join(", ")}</p>
                    </div>
                    {expertRows.filter(r => r.dq_note).length > 0 && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-amber-800 dark:text-amber-300">
                        <span className="font-bold block mb-1">Data Quality Exceptions:</span>
                        <ul className="list-disc pl-5 space-y-1">
                          {Array.from(new Set(expertRows.filter(r => r.dq_note).map(r => r.dq_note))).map((note: any, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Regulatory Exceedance Matrix */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2 border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-base uppercase tracking-wide text-slate-600 dark:text-slate-400">2. Regulatory Exceedance Matrix</h3>
                    <div className="flex gap-2">
                        <Button size="sm" variant={filterStatus === "All" ? "default" : "outline"} onClick={() => setFilterStatus("All")} className="h-7 text-xs">Show All</Button>
                        <Button size="sm" variant={filterStatus === "Violations" ? "destructive" : "outline"} onClick={() => setFilterStatus("Violations")} className="h-7 text-xs">Violations Only</Button>
                        <Button size="sm" variant={filterStatus === "Compliant" ? "default" : "outline"} onClick={() => setFilterStatus("Compliant")} className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700">Compliant</Button>
                    </div>
                  </div>
                  <div className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700">
                        <TableRow>
                          <TableHead className="font-bold text-slate-800 dark:text-slate-200 w-[120px]">Sample ID</TableHead>
                          <TableHead className="font-bold text-slate-800 dark:text-slate-200">Analyte</TableHead>
                          <TableHead className="font-bold text-slate-800 dark:text-slate-200">Sample Value</TableHead>
                          <TableHead className="font-bold text-slate-800 dark:text-slate-200">Legal Limit</TableHead>
                          <TableHead className="font-bold text-slate-800 dark:text-slate-200 w-[180px]">Compliance Status</TableHead>
                          <TableHead className="font-bold text-slate-800 dark:text-slate-200">Regulatory Citation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRows.map((row, idx) => {
                          let badgeClass = 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300';
                          let statusText = row.status.toUpperCase();
                          
                          if (row.status === 'severe' || row.status === 'critical') {
                              badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:border-rose-900 dark:text-rose-400 font-extrabold';
                              statusText = 'VIOLATION';
                          } else if (row.status === 'safe') {
                              badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900 dark:text-emerald-400 font-bold';
                              statusText = 'COMPLIANT';
                          } else if (row.status === 'warning') {
                              badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900 dark:text-amber-400 font-bold';
                              statusText = 'INVESTIGATE';
                          } else if (row.status === 'info') {
                              badgeClass = 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 font-medium';
                              statusText = 'UNAVAILABLE';
                          }
                          
                          let severityRatio = 0;
                          if (row.limit_val && typeof row.csv_value === 'number') {
                              severityRatio = Math.min(100, Math.round((row.csv_value / row.limit_val) * 100));
                          }

                          return (
                            <TableRow key={idx} className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                              <TableCell className="font-mono text-xs">{row.sample_id}</TableCell>
                              <TableCell className="font-semibold">{row.analyte}</TableCell>
                              <TableCell className="font-mono">
                                {row.csv_value} {row.csv_unit}
                                {row.is_converted && (
                                    <span className="ml-1 inline-block bg-amber-100 text-amber-800 text-[9px] px-1 py-0.5 rounded border border-amber-300" title={row.dq_note}>(Converted)</span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono whitespace-nowrap">
                                <span className="font-bold">{row.limit_val ? `${row.limit_val} ${row.limit_unit}` : 'N/A'}</span>
                                {row.limit_type && row.limit_type !== 'Standard Limit' && (
                                    <span className="block text-[10px] text-muted-foreground uppercase">{row.limit_type}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded border text-[10px] tracking-widest ${badgeClass}`}>
                                  {statusText}
                                </span>
                                {row.limit_val > 0 && (
                                    <div className="mt-2" title={`Capacity: ${severityRatio}%`}>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                            <div className={`h-full ${severityRatio >= 100 ? 'bg-rose-500' : severityRatio > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${severityRatio}%` }} />
                                        </div>
                                        <div className="text-[9px] text-right text-muted-foreground mt-0.5">{severityRatio}%</div>
                                    </div>
                                )}
                              </TableCell>
                              <TableCell className="min-w-[150px]">
                                <div className="font-semibold text-xs text-indigo-700 dark:text-indigo-400">
                                    {row.source}
                                    {row.full_url && (
                                        <a href={row.full_url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 hover:underline">
                                            <ExternalLink className="h-3 w-3"/> Link
                                        </a>
                                    )}
                                </div>
                                <div className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={row.insight}>
                                    {row.insight}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {filteredRows.length === 0 && expertRows.length > 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                    No records match the selected filter.
                                </TableCell>
                            </TableRow>
                        )}
                        {expertRows.length === 0 && isStreaming && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                              Scanning target domains and analyzing compliance...
                            </TableCell>
                          </TableRow>
                        )}
                        {expertRows.length === 0 && !isStreaming && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                              No valid data points found to analyze in this dataset.
                            </TableCell>
                          </TableRow>
                        )}
                        {expertRows.length > 0 && expertRecommendations.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground h-16 bg-slate-50/50 dark:bg-slate-900/30">
                              <Loader2 className="h-3 w-3 animate-spin inline mr-2" />
                              <span className="text-xs">Analyzing compliance rows...</span>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 3. Verified Regulatory Citations */}
                {expertRows.some(r => r.excerpt) && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-base border-b pb-1 border-slate-200 dark:border-slate-800 uppercase tracking-wide text-slate-600 dark:text-slate-400">3. Verified Regulatory Citations</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {Array.from(new Map(expertRows.filter(r => r.excerpt).map(r => [r.analyte, r])).values()).map((row: any, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border-l-4 border-l-indigo-500 border-y border-r border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800/50 gap-2">
                            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase">{row.analyte} Regulatory Standard</span>
                            <div className="flex items-center gap-3">
                              {row.full_url && (
                                <a href={row.full_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3"/> Original Document
                                </a>
                              )}
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-200 dark:bg-slate-800 px-2 py-1">{row.source}</span>
                            </div>
                          </div>
                          <div className="prose prose-sm max-w-none dark:prose-invert font-serif text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 p-4 border rounded-md shadow-inner max-h-[350px] overflow-y-auto">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {row.excerpt}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Mandatory Corrective Actions */}
                {expertRecommendations.length > 0 && (
                    <div className="space-y-3 p-5 border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20 border-y border-r border-amber-200 dark:border-amber-900/50 shadow-sm">
                    <h3 className="font-bold text-base border-b pb-1 border-amber-200 dark:border-amber-900/50 uppercase tracking-wide text-amber-800 dark:text-amber-500">4. Mandatory Corrective Actions</h3>
                    <ul className="space-y-3">
                        {expertRecommendations.map((rec, idx) => {
                            let typeClass = "text-foreground";
                            if (rec.type === "Critical Risk") typeClass = "text-rose-600 dark:text-rose-400";
                            if (rec.type === "Safe") typeClass = "text-emerald-600 dark:text-emerald-400";
                            if (rec.type === "Corrective Data Protocol") typeClass = "text-amber-600 dark:text-amber-400";

                            return (
                                <li key={idx} className="text-sm flex gap-2 items-start">
                                    <Shield className={`h-4 w-4 mt-0.5 shrink-0 ${typeClass}`} />
                                    <div>
                                        <span className={`font-bold block ${typeClass}`}>{rec.type}:</span>
                                        <span className="text-muted-foreground">{rec.text}</span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    </div>
                )}

              </CardContent>
            </Card>
          )}

          {!result && !expertSummary && expertRows.length === 0 && (
            <div className="h-full min-h-[300px] flex items-center justify-center text-muted-foreground text-sm border border-dashed border-border rounded-lg p-8">
              <div className="text-center space-y-2">
                <BarChart3 className="h-10 w-10 mx-auto opacity-30" />
                <p>Your analysis results will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
