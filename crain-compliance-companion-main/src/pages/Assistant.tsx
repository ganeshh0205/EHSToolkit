import { useState, useRef, useEffect } from "react";
import { MessageSquare, Send, Loader2, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { askGeneral } from "@/lib/enviroApi";

type Msg = { role: "user" | "assistant"; content: string; sources?: string[] };

function buildAssistantPrompt(history: Msg[], latestUserText: string) {
  const recent = history.slice(-8).map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`);
  return [
    "You are an environmental compliance and funding assistant.",
    "Use the recent conversation context when relevant.",
    "",
    ...recent,
    `User: ${latestUserText}`,
    "Assistant:",
  ].join("\n");
}

export default function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const resp = await askGeneral(buildAssistantPrompt(history, text));
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: resp.answer || "No response received.",
          sources: resp.sources || [],
        },
      ]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] animate-fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-accent-foreground" />
          AI Assistant
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your environmental consulting buddy. Ask about regulations, compliance, site assessments, or anything else.
        </p>
      </div>

      <div className="flex-1 overflow-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-3">
            <Leaf className="h-12 w-12 text-primary/30" />
            <p className="text-sm max-w-md">
              Ask me about environmental regulations, compliance strategies, lab result interpretation, or anything related to your consulting work.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  {!!msg.sources?.length && (
                    <div className="not-prose mt-3 border-t border-border/60 pt-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sources</p>
                      <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {msg.sources.map((source) => (
                          <li key={source}>
                            <a href={source} target="_blank" rel="noreferrer" className="underline underline-offset-2 break-all">
                              {source}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 pt-2 border-t border-border">
        <Textarea
          placeholder="Ask about regulations, compliance, funding..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="resize-none min-h-[44px] max-h-[120px]"
          rows={1}
        />
        <Button onClick={send} disabled={loading} size="icon" className="shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
