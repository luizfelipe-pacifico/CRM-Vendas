import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import Clients from "@/pages/Clients";
import Pipeline from "@/pages/Pipeline";
import Activities from "@/pages/Activities";
import Settings from "@/pages/Settings";
import Analytics from "@/pages/Analytics";
import BusinessImprovements from "@/pages/BusinessImprovements";
import Feedback from "@/pages/Feedback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/atividades" element={<Activities />} />
              <Route path="/analises" element={<Analytics />} />
              <Route path="/melhorias" element={<BusinessImprovements />} />
              <Route path="/feedback" element={<Feedback />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
