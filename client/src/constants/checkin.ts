import type { Appetite, Mood } from "../api/checkins";

/**
 * Labels and option lists for the weekly check-in wizard, shared between the
 * wizard, the read-only detail screen and their tests. Keys mirror the server's
 * CheckIn fields and enums.
 */
export const YES_NO_QUESTIONS: Record<string, string> = {
  skinIssues: "Alguma mancha ou vermelhidão na pele?",
  bowelRegular: "Intestino funcionou todos os dias?",
  sleepWell: "Noites tranquilas de sono",
  unstableGait: "Marcha mais instável que o habitual?",
  chokingIncident: "Tossiu ou engasgou ao comer/beber?",
  breathShortness: "Houve falta de ar / cianose durante o engasgo?",
  hydrationGoal: "Bebeu a meta de água diária?",
  medsOnTime: "Tomou todos os remédios no horário sem recusa?",
  sunExposure: "Conseguiu tomar sol ou sair do quarto?",
  selfExpression: "Conseguiu expressar o que queria / sentia?",
  stimulation:
    "Foi feito estímulo (conversa, música, fisioterapia, atividade física, etc.)?",
  dailyBath: "Banho realizado todos os dias?",
  oralHygiene: "Dentes/prótese escovados após as refeições?",
  groomedNails: "Unhas, barba e cabelos limpos e aparados?",
};

export const WEEKLY_EVENTS: {
  key: string;
  label: string;
  critical: boolean;
}[] = [
  { key: "fever", label: "Febre", critical: true },
  {
    key: "breathing_difficulty",
    label: "Falta de ar (dispneia)",
    critical: true,
  },
  { key: "fall_with_injury", label: "Queda com lesão", critical: true },
  { key: "active_bleeding", label: "Sangramento ativo", critical: true },
  {
    key: "acute_confusion",
    label: "Confusão aguda / mudança súbita",
    critical: true,
  },
  { key: "pain", label: "Dor", critical: false },
  { key: "cough", label: "Tosse", critical: false },
  { key: "fall_without_injury", label: "Queda sem lesão", critical: false },
];

export const APPETITE_OPTIONS: { value: Appetite; label: string }[] = [
  { value: "good", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "bad", label: "Ruim" },
];

export const MOOD_OPTIONS: {
  value: Mood;
  icon: string;
  color: string;
  label: string;
}[] = [
  {
    value: "very_happy",
    icon: "emoticon-excited-outline",
    color: "#7CA43C",
    label: "Muito feliz",
  },
  {
    value: "happy",
    icon: "emoticon-happy-outline",
    color: "#E2B93B",
    label: "Feliz",
  },
  {
    value: "neutral",
    icon: "emoticon-neutral-outline",
    color: "#242533",
    label: "Neutro",
  },
  {
    value: "sad",
    icon: "emoticon-sad-outline",
    color: "#ED7D2B",
    label: "Triste",
  },
  {
    value: "very_sad",
    icon: "emoticon-dead-outline",
    color: "#8C7BE7",
    label: "Muito triste",
  },
];

export const VITALS: { key: string; label: string; placeholder: string }[] = [
  { key: "pressure", label: "Pressão", placeholder: "120/80" },
  { key: "saturation", label: "Saturação", placeholder: "96%" },
  { key: "glycemia", label: "Glicemia", placeholder: "110" },
  {
    key: "calfCircumference",
    label: "Perímetro Panturrilha Esquerda",
    placeholder: "110",
  },
];

export const LOGISTICS: { key: string; label: string }[] = [
  { key: "needsMedications", label: "Medicamentos" },
  { key: "needsHygiene", label: "Higiene (fraldas, pomadas, lenços)" },
  { key: "needsFood", label: "Alimentação / Suplementos" },
];

export const STEPS: { title: string; subtitle: string }[] = [
  { title: "Domínio saúde", subtitle: "Saúde e sinais vitais" },
  {
    title: "Domínio alimentação e medicamentos",
    subtitle: "Alimentação e Medicação",
  },
  { title: "Domínio comportamental", subtitle: "Comportamento e estímulo" },
  { title: "Domínio Higiene", subtitle: "Higiene semanal" },
  {
    title: "Estoque e Logística",
    subtitle: "O que precisa comprar essa semana?",
  },
];

/**
 * Returns the display label for a mood value, e.g. for history summaries.
 */
export function moodLabel(mood: Mood): string {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.label ?? mood;
}
