import type { DealRecord, DealTemperature } from "@/lib/crm-db";

export type LeadScoreBand = "baixo" | "medio" | "alto" | "muito_alto";

export interface LeadScoreResult {
  score: number;
  band: LeadScoreBand;
  suggestedTemperature: DealTemperature;
}

const stageWeights: Record<DealRecord["stage"], number> = {
  sem_contato: 5,
  em_contato: 15,
  diagnostico: 25,
  proposta_enviada: 35,
  negociacao: 45,
  fechado_ganho: 50,
  fechado_perdido: 0,
};

const temperatureWeights: Record<DealTemperature, number> = {
  frio: 5,
  morno: 12,
  quente: 20,
  em_negociacao: 24,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const calculateLeadScore = (deal: DealRecord): LeadScoreResult => {
  let score = 0;

  score += stageWeights[deal.stage] ?? 0;
  score += temperatureWeights[deal.temperature] ?? 0;

  if (deal.value >= 100000) score += 10;
  else if (deal.value >= 50000) score += 7;
  else if (deal.value >= 20000) score += 4;
  else if (deal.value > 0) score += 2;

  if (deal.leadEmail) score += 4;
  if (deal.leadPhone) score += 4;
  if (deal.leadRole) score += 2;
  if (deal.owner && deal.owner.toLowerCase() !== "sem responsável") score += 3;
  if (deal.source) score += 3;
  if (deal.nextAction) score += 4;
  if (deal.followUpDate) score += 3;
  if (deal.expectedClose) score += 3;
  if (deal.segment) score += 2;

  if (deal.employees !== null && deal.employees > 0) {
    if (deal.employees >= 100) score += 5;
    else if (deal.employees >= 30) score += 3;
    else score += 1;
  }

  if (deal.annualRevenue !== null && deal.annualRevenue > 0) {
    if (deal.annualRevenue >= 10000000) score += 6;
    else if (deal.annualRevenue >= 2000000) score += 4;
    else if (deal.annualRevenue >= 500000) score += 2;
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);

  if (normalizedScore >= 80) {
    return { score: normalizedScore, band: "muito_alto", suggestedTemperature: "em_negociacao" };
  }

  if (normalizedScore >= 60) {
    return { score: normalizedScore, band: "alto", suggestedTemperature: "quente" };
  }

  if (normalizedScore >= 35) {
    return { score: normalizedScore, band: "medio", suggestedTemperature: "morno" };
  }

  return { score: normalizedScore, band: "baixo", suggestedTemperature: "frio" };
};

export const getLeadScoreLabel = (band: LeadScoreBand) => {
  switch (band) {
    case "muito_alto":
      return "Muito alto";
    case "alto":
      return "Alto";
    case "medio":
      return "Médio";
    default:
      return "Baixo";
  }
};

export const getLeadScoreTone = (band: LeadScoreBand) => {
  switch (band) {
    case "muito_alto":
      return "bg-success/15 text-success";
    case "alto":
      return "bg-primary/15 text-primary";
    case "medio":
      return "bg-warning/15 text-warning";
    default:
      return "bg-muted text-muted-foreground";
  }
};
