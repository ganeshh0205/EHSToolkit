import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index";
import Regulations from "./pages/Regulations";
import Funding from "./pages/Funding";
import Reports from "./pages/Reports";
import DataAnalyzer from "./pages/DataAnalyzer";
import HygienePlanner from "./pages/HygienePlanner";
import Assistant from "./pages/Assistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/regulations" element={<Regulations />} />
            <Route path="/funding" element={<Funding />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/data-analyzer" element={<DataAnalyzer />} />
            <Route path="/hygiene-planner" element={<HygienePlanner />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
