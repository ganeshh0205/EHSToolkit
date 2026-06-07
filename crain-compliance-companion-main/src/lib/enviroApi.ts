type AiEndpointResponse = {
  answer?: string;
  sources?: string[];
  model?: string;
  detail?: string;
};

export type AiResponse = {
  answer: string;
  sources: string[];
  model?: string;
};

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = (RAW_API_BASE_URL || "https://envirohubpro-backend.onrender.com").replace(/\/$/, "");

async function postPrompt(path: string, prompt: string): Promise<AiResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = (await response.json().catch(() => ({}))) as AiEndpointResponse;

  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }

  return {
    answer: data.answer || "No results found.",
    sources: data.sources || [],
    model: data.model,
  };
}

export function askRegulations(prompt: string) {
  return postPrompt("/ai/regulations", prompt);
}

export function askFunding(prompt: string) {
  return postPrompt("/ai/funding", prompt);
}

export function askGeneral(prompt: string) {
  return postPrompt("/ai/general", prompt);
}