export const aiAgents = [
  {
    id: "coder",
    name: "Наставник по коду",
    shortName: "Код",
    description: "Разберёт ошибку и объяснит решение понятными шагами.",
    greeting: "Покажи код или ошибку — разберём вместе, шаг за шагом.",
  },
  {
    id: "study",
    name: "Учебный навигатор",
    shortName: "Учёба",
    description: "Составит план подготовки, объяснит тему и устроит мини-проверку.",
    greeting: "Расскажи, что изучаешь и к какому сроку. Составим понятный план.",
  },
  {
    id: "writer",
    name: "Помощник по текстам",
    shortName: "Тексты",
    description: "Поможет структурировать письмо, резюме или учебный текст.",
    greeting: "Пришли черновик или опиши задачу — помогу собрать сильный текст.",
  },
  {
    id: "career",
    name: "Карьерный навигатор",
    shortName: "Карьера",
    description: "Подготовит к собеседованию и поможет наметить следующие шаги.",
    greeting: "Расскажи о своей цели и опыте — подумаем над следующим шагом.",
  },
] as const;

export type AiAgentId = (typeof aiAgents)[number]["id"];

export function findAiAgent(id: string | null | undefined) {
  return aiAgents.find((agent) => agent.id === id) ?? aiAgents[0];
}
