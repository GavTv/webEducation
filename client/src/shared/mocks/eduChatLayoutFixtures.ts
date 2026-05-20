/**
 * Временные данные только для вёрстки страницы `/chat`.
 * Удалить или заменить на ответ API (`/api/messenger/...`), когда бэкенд будет подключён к UI.
 */

export type EduChatRoomFixture = {
  id: number;
  title: string;
  icon: string;
  iconClass: string;
  locked?: boolean;
  author: string;
  message: string;
  time: string;
  unread?: number;
  onlineLabel?: string;
  starred?: boolean;
};

export const eduChatRoomFixtures: EduChatRoomFixture[] = [
  {
    id: 1,
    title: "Общий чат",
    icon: "#",
    iconClass: "purple",
    author: "Мария",
    message: "Всем привет!",
    time: "14:32",
    unread: 5,
    onlineLabel: "24 участника онлайн",
  },
  {
    id: 2,
    title: "Основной канал",
    icon: "O",
    iconClass: "blue",
    locked: true,
    author: "Алексей",
    message: "Домашнее задание на завтра",
    time: "13:15",
    unread: 2,
    onlineLabel: "12 участников онлайн",
  },
  {
    id: 3,
    title: "Lectures",
    icon: "L",
    iconClass: "green",
    locked: true,
    author: "Иван",
    message: "Спасибо!",
    time: "Вчера",
    onlineLabel: "8 участников онлайн",
  },
  {
    id: 4,
    title: "Random",
    icon: "R",
    iconClass: "orange",
    author: "Мария",
    message: "New words",
    time: "Вчера",
    onlineLabel: "15 участников онлайн",
  },
  {
    id: 5,
    title: "Day-off",
    icon: "</>",
    iconClass: "violet",
    author: "Алексей",
    message: "Файл",
    time: "Вчера",
    onlineLabel: "6 участников онлайн",
  },

];
