"use client";

import { useAppSelector } from "@/shared/hooks/useReduxHooks";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Lock, MessageSquareReply, Search, Star } from "lucide-react";
import { ChatMessageInput } from "./ChatMessageInput";
import {
  createGroupChannel,
  deleteGroupChannel,
  fetchClassAccess,
  fetchClasses,
  fetchChannelMessages,
  fetchGroupChannels,
  joinClass,
  sendChannelMessage,
  type ChatChannelItem,
  type ClassRoomItem,
} from "@/shared/lib/classesApi";
import {
  createChatSocket,
  emitClearRoom,
  emitJoinRoom,
  type ChannelHistoryPayload,
  type MessageNewPayload,
  type RoomClearedPayload,
  type RoomHistoryPayload,
  type SocketErrorPayload,
} from "@/shared/lib/chatSocket";
import { ConfirmModal } from "@/shared/ui/ConfirmModal/ConfirmModal";
import { serverMessageToUi, type UiChatMessage } from "@/shared/lib/mapChatMessage";
import { authPath, clientRoutes } from "@/shared/consts/clientRoutes";
import { getAvatarSrc } from "@/shared/lib/getAvatarSrc";
import { UserAvatar } from "@/shared/ui/UserAvatar/UserAvatar";
import { getNameInitials } from "@/shared/lib/getNameInitials";
import { AppBackButton } from "@/widgets/appShell/AppBackButton";
import { AppNav } from "@/widgets/appShell/AppNav";
import { AppProfileChip } from "@/widgets/appShell/AppProfileChip";
import { BrandLogo } from "@/widgets/appShell/BrandLogo";
import { MobileBottomNav } from "@/widgets/appShell/MobileBottomNav";
import { sendBotAiMessage as requestBotAiReply } from "@/shared/lib/botAiApi";
import { aiAgents, findAiAgent, type AiAgentId } from "@/shared/lib/aiAgents";
import { canManageClasses, isAdmin } from "@/shared/lib/permissions";
import "./page.css";

const MOBILE_BP = "(max-width: 900px)";
const BOT_AI_OPEN_STORAGE_KEY = "webEducation:botAiOpen";
const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";

type BotAiMessage = UiChatMessage & {
  isError?: boolean;
};

type ChatRoom = {
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

function classToChatRoom(item: ClassRoomItem): ChatRoom {
  const letter = item.title.trim().charAt(0).toUpperCase() || "#";
  return {
    id: item.id,
    title: item.title,
    icon: letter,
    iconClass: item.color || "purple",
    locked: item.hasPassword,
    author: "Группа",
    message: item.description?.trim() || "Учебная группа",
    time: "",
    onlineLabel: `${item.memberCount} участников`,
  };
}

function channelToChatRoom(
  channel: ChatChannelItem,
  group?: ClassRoomItem | null,
): ChatRoom {
  const letter = channel.title.trim().charAt(0).toUpperCase() || "#";
  return {
    id: channel.id,
    title: channel.title,
    icon: letter,
    iconClass: channel.color || group?.color || "purple",
    author: group?.title ?? "Группа",
    message: "Чат внутри группы",
    time: "",
    onlineLabel: group ? `${group.memberCount} участников` : "Чат",
  };
}

const CHAT_UI_STORAGE_VERSION = "3";

function applyHistory(
  roomId: number,
  messages: RoomHistoryPayload["messages"],
  myUserId: number | undefined,
): Record<number, UiChatMessage[]> {
  return {
    [roomId]: messages.map((m) => serverMessageToUi(m, myUserId)),
  };
}

const botAiStartMessages: BotAiMessage[] = [
  {
    id: "bot-start",
    author: "@botAi",
    text: "Привет! Я @botAi — помогаю с программированием и учёбой, но могу и немного поболтать. Спроси про код, ошибки или просто поздоровайся.",
    time: "сейчас",
    isBot: true,
  },
];

function ChatPageContent() {
  const router = useRouter();
  const user = useAppSelector((state) => state.user.user);
  const isInitialized = useAppSelector((state) => state.user.isInitialized);
  const userName = user?.name?.trim() || "";
  const nameParts = userName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || "Пользователь";
  const lastName = nameParts[1] || "";
  const avatarInitials = getNameInitials(firstName, lastName, user?.name);
  const avatarSrc = getAvatarSrc(user?.avatarUrl, user?.avatarUrl);
  const canManageChat = canManageClasses(user?.role);
  const showAdminLink = isAdmin(user?.role);

  const searchParams = useSearchParams();
  const requestedAgentId = searchParams.get("agent");
  const [memberClasses, setMemberClasses] = useState<ClassRoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [socketError, setSocketError] = useState(false);
  const groupRooms = useMemo(
    () => memberClasses.map(classToChatRoom),
    [memberClasses],
  );
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupChannels, setGroupChannels] = useState<ChatChannelItem[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [messagesByRoomId, setMessagesByRoomId] = useState<
    Record<number, UiChatMessage[]>
  >({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageSending, setMessageSending] = useState(false);
  const [historyRetry, setHistoryRetry] = useState(0);

  const messagesWrapRef = useRef<HTMLDivElement>(null);
  const lastScrolledRoomRef = useRef<number | null>(null);
  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);
  const selectedChannelIdRef = useRef(selectedChannelId);

  const [botAiOpen, setBotAiOpen] = useState(false);
  const [activeAgentId, setActiveAgentId] = useState<AiAgentId>("coder");
  const [botAiDraft, setBotAiDraft] = useState("");
  const [botAiLoading, setBotAiLoading] = useState(false);
  const [clearChatOpen, setClearChatOpen] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [clearChatError, setClearChatError] = useState<string | null>(null);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const [deletingChat, setDeletingChat] = useState(false);
  const [deleteChatError, setDeleteChatError] = useState<string | null>(null);
  const [createChatOpen, setCreateChatOpen] = useState(false);
  const [createChatTitle, setCreateChatTitle] = useState("");
  const [createChatLoading, setCreateChatLoading] = useState(false);
  const [createChatError, setCreateChatError] = useState<string | null>(null);
  const [botAiMessages, setBotAiMessages] = useState<BotAiMessage[]>(() => {
    if (typeof window === "undefined") return botAiStartMessages;

    try {
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (!savedMessages) return botAiStartMessages;

      const parsedMessages = JSON.parse(savedMessages) as BotAiMessage[];

      if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
        const legacyDemo = parsedMessages.some(
          (m) =>
            m.id === "bot-1" ||
            m.id === "user-1" ||
            m.id === "bot-2" ||
            m.author === "Вадим",
        );

        if (!legacyDemo) {
          return parsedMessages;
        }

        window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
      }

      return botAiStartMessages;
    } catch {
      window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);

      return botAiStartMessages;
    }
  });



  useEffect(() => {
    try {
      const versionKey = "webEducation:chatUiVersion";
      const savedVersion = window.localStorage.getItem(versionKey);

      if (savedVersion !== CHAT_UI_STORAGE_VERSION) {
        window.localStorage.removeItem(BOT_AI_OPEN_STORAGE_KEY);
        window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
        window.localStorage.setItem(versionKey, CHAT_UI_STORAGE_VERSION);
        return;
      }

      const savedOpen = window.localStorage.getItem(BOT_AI_OPEN_STORAGE_KEY);
      const savedMessages = window.localStorage.getItem(
        BOT_AI_MESSAGES_STORAGE_KEY,
      );

      if (savedOpen === "true") {
        setBotAiOpen(true);
      }

      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages) as BotAiMessage[];
        const legacyDemo = parsedMessages.some(
          (m) =>
            m.id === "bot-1" ||
            m.id === "user-1" ||
            m.id === "bot-2" ||
            m.author === "Вадим",
        );

        if (legacyDemo) {
          window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
          setBotAiMessages(botAiStartMessages);
          return;
        }

        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setBotAiMessages(parsedMessages);
        }
      }
    } catch {
      window.localStorage.removeItem(BOT_AI_OPEN_STORAGE_KEY);
      window.localStorage.removeItem(BOT_AI_MESSAGES_STORAGE_KEY);
    }
  }, []);

  const selectedGroup = useMemo(
    () => memberClasses.find((item) => item.id === selectedGroupId) ?? null,
    [memberClasses, selectedGroupId],
  );

  const selectedGroupRoom = useMemo(
    () => groupRooms.find((room) => room.id === selectedGroupId) ?? null,
    [groupRooms, selectedGroupId],
  );

  const channelRooms = useMemo(
    () => groupChannels.map((ch) => channelToChatRoom(ch, selectedGroup)),
    [groupChannels, selectedGroup],
  );

  const selectedChannel = useMemo(
    () => channelRooms.find((room) => room.id === selectedChannelId) ?? null,
    [channelRooms, selectedChannelId],
  );

  const activeAgent = findAiAgent(activeAgentId);

  useEffect(() => {
    if (!requestedAgentId) return;
    const agent = aiAgents.find((item) => item.id === requestedAgentId);
    if (!agent) {
      router.replace(clientRoutes.chat);
      return;
    }

    setActiveAgentId(agent.id);
    setBotAiOpen(true);
    setSelectedChannelId(null);
    setBotAiMessages((messages) =>
      messages.length === 1 && messages[0]?.id === "bot-start"
        ? [{ ...botAiStartMessages[0], author: agent.name, text: agent.greeting }]
        : messages,
    );
    window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");
  }, [requestedAgentId, router]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupRooms;
    return groupRooms.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q),
    );
  }, [groupRooms, searchQuery]);

  const filteredChannels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return channelRooms;
    return channelRooms.filter((r) => r.title.toLowerCase().includes(q));
  }, [channelRooms, searchQuery]);

  const threadMessages = useMemo(() => {
    if (botAiOpen) return botAiMessages;
    if (selectedChannelId) return messagesByRoomId[selectedChannelId] ?? [];
    return [];
  }, [botAiOpen, botAiMessages, selectedChannelId, messagesByRoomId]);

  const isRealChat = selectedChannelId != null && selectedChannelId > 0;
  const hasActiveThread = botAiOpen || isRealChat;

  const threadEmptyHint = botAiOpen
    ? null
    : !selectedGroupId
      ? "Выберите группу слева, затем чат внутри неё"
      : !selectedChannelId
        ? "Выберите чат в списке по центру"
        : null;
  const canClearActiveChat = !botAiOpen && isRealChat && canManageChat;

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  useEffect(() => {
    if (!user || !selectedGroupId || !selectedChannelId || botAiOpen) return;

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    void fetchChannelMessages(selectedGroupId, selectedChannelId)
      .then((messages) => {
        if (cancelled) return;
        const loaded = messages.map((message) =>
          serverMessageToUi(message, user.id),
        );
        setMessagesByRoomId((previous) => {
          const current = previous[selectedChannelId] ?? [];
          const ids = new Set(loaded.map((message) => message.id));
          return {
            ...previous,
            [selectedChannelId]: [
              ...loaded,
              ...current.filter((message) => !ids.has(message.id)),
            ],
          };
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setHistoryError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить сообщения",
        );
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, selectedGroupId, selectedChannelId, botAiOpen, historyRetry]);

  const loadGroupChannels = useCallback(async (groupId: number) => {
    setChannelsLoading(true);
    try {
      const { channels } = await fetchGroupChannels(groupId);
      setGroupChannels(channels);
      return channels;
    } catch {
      setGroupChannels([]);
      return [];
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupChannels([]);
      setSelectedChannelId(null);
      return;
    }

    let cancelled = false;

    void loadGroupChannels(selectedGroupId).then((channels) => {
      if (cancelled) return;

      const channelIdParam = searchParams.get("channelId");
      const preferredId = channelIdParam ? Number(channelIdParam) : NaN;
      const preferred = channels.find((ch) => ch.id === preferredId);
      const nextId = preferred?.id ?? channels[0]?.id ?? null;

      setSelectedChannelId(nextId);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedGroupId, loadGroupChannels, searchParams]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace(authPath("login"));
    }
  }, [isInitialized, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setRoomsLoading(true);
    void fetchClasses()
      .then((list) => {
        if (cancelled) return;
        setMemberClasses(list.filter((c) => c.isMember));
      })
      .catch(() => {
        if (!cancelled) setMemberClasses([]);
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });




  return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const socket = createChatSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setWsConnected(true);
      setSocketError(false);
    };
    const onDisconnect = () => setWsConnected(false);
    const onConnectError = () => {
      setWsConnected(false);
      setSocketError(true);
    };

    const onHistory = (payload: RoomHistoryPayload | ChannelHistoryPayload) => {
      const roomId =
        "roomId" in payload && payload.roomId
          ? payload.roomId
          : "channelId" in payload
            ? payload.channelId
            : 0;
      if (!roomId) return;
      setHistoryError(null);
      setMessagesByRoomId((prev) => ({
        ...prev,
        ...applyHistory(roomId, payload.messages, user.id),
      }));
    };

    const onMessageNew = (payload: MessageNewPayload) => {
      const msg = payload.message;
      if (!msg?.roomId) return;
      const ui = serverMessageToUi(msg, user.id);
      setMessagesByRoomId((prev) => {
        const list = prev[msg.roomId] ?? [];
        if (list.some((m) => m.id === ui.id)) return prev;
        return { ...prev, [msg.roomId]: [...list, ui] };
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("room:history", onHistory);
    socket.on("channel:history", onHistory);
    const onRoomCleared = (payload: RoomClearedPayload) => {
      const roomId = payload?.roomId;
      if (!roomId) return;
      setMessagesByRoomId((prev) => ({ ...prev, [roomId]: [] }));
    };

    socket.on("message:new", onMessageNew);
    socket.on("room:cleared", onRoomCleared);
    socket.on("ws:ready", onConnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("room:history", onHistory);
      socket.off("channel:history", onHistory);
      socket.off("message:new", onMessageNew);
      socket.off("room:cleared", onRoomCleared);
      socket.off("ws:ready", onConnect);
      socket.disconnect();
      socketRef.current = null;
      setWsConnected(false);
    };
  }, [user]);

  useEffect(() => {
    if (!wsConnected || !user || botAiOpen || !selectedChannelId) return;
    const socket = socketRef.current;
    if (!socket) return;
    emitJoinRoom(socket, selectedChannelId);
  }, [selectedChannelId, wsConnected, user, botAiOpen]);

  useEffect(() => {
    if (
      !user ||
      !selectedGroupId ||
      !selectedChannelId ||
      wsConnected ||
      botAiOpen
    ) {
      return;
    }

    let cancelled = false;
    let timer: number;

    const syncMessages = async () => {
      try {
        const messages = await fetchChannelMessages(
          selectedGroupId,
          selectedChannelId,
        );
        if (cancelled) return;

        const loaded = messages.map((message) =>
          serverMessageToUi(message, user.id),
        );
        setMessagesByRoomId((previous) => {
          const current = previous[selectedChannelId] ?? [];
          const ids = new Set(current.map((message) => message.id));
          const freshMessages = loaded.filter(
            (message) => !ids.has(message.id),
          );
          if (freshMessages.length === 0) return previous;
          return {
            ...previous,
            [selectedChannelId]: [...current, ...freshMessages],
          };
        });
      } catch {
        if (!cancelled) setSocketError(true);
      }

      if (!cancelled) {
        timer = window.setTimeout(syncMessages, 2500);
      }
    };

    timer = window.setTimeout(syncMessages, 2500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user, selectedGroupId, selectedChannelId, wsConnected, botAiOpen]);

  const displayAuthorName = useMemo(() => {
    if (!userName) return firstName;
    return firstName;
  }, [firstName, userName]);

  useEffect(() => {
    const roomChanged = lastScrolledRoomRef.current !== selectedChannelId;
    lastScrolledRoomRef.current = selectedChannelId;

    const behavior = roomChanged ? "auto" : "smooth";

    const id = requestAnimationFrame(() => {
      const messagesWrap = messagesWrapRef.current;
      if (!messagesWrap) return;

      messagesWrap.scrollTo({
        top: messagesWrap.scrollHeight,
        behavior,
      });
    });

    return () => cancelAnimationFrame(id);
  }, [botAiOpen, botAiMessages, botAiLoading, threadMessages, selectedChannelId]);

  useEffect(() => {
    const classId = searchParams.get("classId");

    if (!classId) return;

    const id = Number(classId);

    if (!Number.isFinite(id)) return;
    if (memberClasses.some((c) => c.id === id)) {
      setSelectedGroupId(id);
      setBotAiOpen(false);

      const mq = window.matchMedia(MOBILE_BP);

    }
  }, [searchParams, memberClasses]);

  useEffect(() => {
    const classId = searchParams.get("classId");

    if (!user || !classId) return;

    const id = Number(classId);

    if (!Number.isFinite(id)) return;

    let cancelled = false;

    async function checkClassAccess() {
      try {
        const access = await fetchClassAccess(id);

        if (cancelled) return;

        if (access.hasAccess && !access.needsPassword) {
          if (!access.isMember) {
            await joinClass(id);
          }

          return;
        }

        if (!access.hasAccess) {
          router.replace(clientRoutes.classes);
        }
      } catch {
        if (!cancelled) {
          router.replace(clientRoutes.classes);
        }
      }
    }

    checkClassAccess();

  

  return () => {
      cancelled = true;
    };
  }, [user, searchParams, router]);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BP);

    const sync = () => {
      if (!mq.matches) {
        setMobileThreadOpen(false);
      }
    };

    mq.addEventListener("change", sync);

  

  return () => {
      mq.removeEventListener("change", sync);
    };
  }, []);

  const selectGroup = useCallback((id: number) => {
    setBotAiOpen(false);
    setSelectedGroupId(id);
    setSelectedChannelId(null);
    setMobileThreadOpen(false);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
    }

  }, []);

  const selectChannel = useCallback((id: number) => {
    setBotAiOpen(false);
    setSelectedChannelId(id);
    setMessageError(null);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
    }

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);

  const closeMobileThread = useCallback(() => {
    setMobileThreadOpen(false);

    if (botAiOpen) {
      setBotAiOpen(false);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
      }
    }
  }, [botAiOpen]);

  const closeMobileChannels = useCallback(() => {
    setSelectedGroupId(null);
    setSelectedChannelId(null);
    setMobileThreadOpen(false);
  }, []);

  const openBotChat = useCallback(() => {
    setBotAiOpen(true);
    setSelectedChannelId(null);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");
    }

    if (typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches) {
      setMobileThreadOpen(true);
    }
  }, []);

  const chooseAiAgent = useCallback(
    (agentId: AiAgentId) => {
      const agent = findAiAgent(agentId);
      setActiveAgentId(agent.id);
      setBotAiOpen(true);
      setSelectedChannelId(null);
      setMessageError(null);
      setBotAiMessages((messages) =>
        messages.length === 1 && messages[0]?.id === "bot-start"
          ? [{ ...botAiStartMessages[0], author: agent.name, text: agent.greeting }]
          : messages,
      );
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");
      router.replace(`${clientRoutes.chat}?agent=${agent.id}`);
    },
    [router],
  );

  const clearBotAiChat = useCallback(() => {
    setBotAiMessages(botAiStartMessages);
    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(botAiStartMessages),
    );
  }, []);

  const formatTime = () => {
    const d = new Date();
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const sendMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = draft.trim();

      if (!text || !selectedChannelId || !selectedGroupId || messageSending) return;

      setMessageSending(true);
      setMessageError(null);
      try {
        const message = await sendChannelMessage(
          selectedGroupId,
          selectedChannelId,
          text,
        );
        const uiMessage = serverMessageToUi(message, user?.id);
        setMessagesByRoomId((previous) => {
          const current = previous[selectedChannelId] ?? [];
          if (current.some((item) => item.id === uiMessage.id)) return previous;
          return {
            ...previous,
            [selectedChannelId]: [...current, uiMessage],
          };
        });
        setDraft("");
      } catch (error) {
        setMessageError(
          error instanceof Error
            ? error.message
            : "Не удалось отправить сообщение",
        );
      } finally {
        setMessageSending(false);
      }
    },
    [draft, selectedChannelId, selectedGroupId, messageSending, user],
  );










  const saveBotAiMessages = useCallback((messages: BotAiMessage[]) => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      BOT_AI_MESSAGES_STORAGE_KEY,
      JSON.stringify(messages),
    );
  }, []);

  const handleOpenClearChat = useCallback(() => {
    setClearChatError(null);
    setClearChatOpen(true);
  }, []);

  const handleCloseClearChat = useCallback(() => {
    if (clearingChat) return;
    setClearChatError(null);
    setClearChatOpen(false);
  }, [clearingChat]);

  const handleConfirmClearChat = useCallback(() => {
    if (botAiOpen) {
      setBotAiMessages(botAiStartMessages);
      saveBotAiMessages(botAiStartMessages);
      setClearChatOpen(false);
      return;
    }

    if (!isRealChat || !selectedChannelId) return;
    const socket = socketRef.current;
    if (!socket || !wsConnected) {
      setClearChatError("Нет подключения к чату");
      return;
    }

    setClearingChat(true);
    setClearChatError(null);
    emitClearRoom(socket, selectedChannelId, (res) => {
      setClearingChat(false);
      if (res?.status === "ok") {
        setMessagesByRoomId((prev) => ({ ...prev, [selectedChannelId]: [] }));
        setClearChatOpen(false);
        return;
      }
      const err = res as SocketErrorPayload;
      setClearChatError(err?.message ?? "Не удалось очистить чат");
    });
  }, [
    botAiOpen,
    isRealChat,
    selectedChannelId,
    saveBotAiMessages,
    wsConnected,
  ]);

  const addBotAiMessage = useCallback(
    (message: BotAiMessage) => {
      setBotAiMessages((prev) => {
        const next = [...prev, message];

        saveBotAiMessages(next);

        return next;
      });
    },
    [saveBotAiMessages],
  );

  const sendBotAiMessage = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = botAiDraft.trim();

      if (!text || botAiLoading) return;

      addBotAiMessage({
        id: `botai-user-${Date.now()}`,
        author: "Вы",
        text,
        time: formatTime(),
        isMine: true,
      });

      setBotAiDraft("");
      setBotAiLoading(true);

      try {
        const data = await requestBotAiReply(text, activeAgentId);

        addBotAiMessage({
          id: `botai-answer-${Date.now()}`,
          author: activeAgent.name,
          text: data.answer || "Не получилось получить ответ от AI.",
          time: formatTime(),
          isBot: true,
          isError: Boolean(data.error),
        });
      } finally {
        setBotAiLoading(false);
      }
    },
    [addBotAiMessage, activeAgent.name, activeAgentId, botAiDraft, botAiLoading],
  );

  const runChatHelper = useCallback(
    async (agentId: "reply" | "summary") => {
      if (botAiLoading || threadMessages.length === 0) return;

      const context = threadMessages
        .slice(-10)
        .map((message) => `${message.author}: ${message.text.slice(0, 220)}`)
        .join("\n")
        .slice(-2800);
      const isReply = agentId === "reply";
      const prompt = isReply
        ? "Подготовь черновик ответа на последние сообщения в переданном контексте. Учитывай тон переписки, не выдумывай факты."
        : "Сделай краткую выжимку переписки: основные темы, решения и задачи со сроками, если они есть. Не выдумывай детали.";
      const agent = findAiAgent(agentId);

      setActiveAgentId(agentId);
      setBotAiOpen(true);
      setSelectedChannelId(null);
      setMobileThreadOpen(true);
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");
      addBotAiMessage({
        id: `botai-user-${Date.now()}`,
        author: "Вы",
        text: isReply
          ? "Подготовь черновик ответа по последним сообщениям выбранного чата."
          : "Сделай выжимку последних сообщений выбранного чата.",
        time: formatTime(),
        isMine: true,
      });
      setBotAiLoading(true);

      try {
        const data = await requestBotAiReply(prompt, agentId, context);
        addBotAiMessage({
          id: `botai-answer-${Date.now()}`,
          author: agent.name,
          text: data.answer || "Не получилось получить ответ от AI.",
          time: formatTime(),
          isBot: true,
          isError: Boolean(data.error),
        });
      } finally {
        setBotAiLoading(false);
      }
    },
    [addBotAiMessage, botAiLoading, threadMessages],
  );


  const handleOpenCreateChat = useCallback(() => {
    if (!selectedGroupId) {
      setCreateChatError("Сначала выберите группу слева");
      setCreateChatOpen(true);
      return;
    }

    setCreateChatError(null);
    setCreateChatTitle("");
    setCreateChatOpen(true);
  }, [selectedGroupId]);

  const handleCloseCreateChat = useCallback(() => {
    if (createChatLoading) return;

    setCreateChatError(null);
    setCreateChatOpen(false);
  }, [createChatLoading]);


  const handleOpenDeleteChat = useCallback(() => {
    setDeleteChatError(null);
    setDeleteChatOpen(true);
  }, []);

  const handleCloseDeleteChat = useCallback(() => {
    if (deletingChat) return;

    setDeleteChatError(null);
    setDeleteChatOpen(false);
  }, [deletingChat]);




  const handleCreateChatSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const title = createChatTitle.trim();

      if (!title) {
        setCreateChatError("Введите название чата");
        return;
      }

      setCreateChatLoading(true);
      setCreateChatError(null);

      if (!selectedGroupId) {
        setCreateChatError("Сначала выберите группу");
        setCreateChatLoading(false);
        return;
      }

      try {
        const created = await createGroupChannel(selectedGroupId, { title });

        setGroupChannels((prev) => [...prev, created]);
        setSelectedChannelId(created.id);
        setBotAiOpen(false);
        setMobileThreadOpen(true);
        setCreateChatOpen(false);
      } catch (error) {
        setCreateChatError(
          error instanceof Error ? error.message : "Не удалось создать чат",
        );
      } finally {
        setCreateChatLoading(false);
      }
    },
    [createChatTitle, selectedGroupId],
  );

  const handleConfirmDeleteChat = useCallback(async () => {
    if (!isRealChat || !selectedGroupId || !selectedChannelId) return;

    setDeletingChat(true);
    setDeleteChatError(null);

    try {
      await deleteGroupChannel(selectedGroupId, selectedChannelId);

      const remaining = groupChannels.filter(
        (ch) => ch.id !== selectedChannelId,
      );

      setGroupChannels(remaining);
      setSelectedChannelId(remaining[0]?.id ?? null);

      setMessagesByRoomId((prev) => {
        const next = { ...prev };
        delete next[selectedChannelId];
        return next;
      });

      setDeleteChatOpen(false);
      setMobileThreadOpen(false);

    } catch (error) {
      setDeleteChatError(
        error instanceof Error ? error.message : "Не удалось удалить чат",
      );
    } finally {
      setDeletingChat(false);
    }
  }, [groupChannels, isRealChat, selectedChannelId, selectedGroupId]);

  const clearChatTitle = botAiOpen
    ? "Очистить чат с @botAi?"
    : `Очистить чат «${selectedChannel?.title ?? "чат"}»?`;

  const deleteChatTitle = `Удалить чат «${selectedChannel?.title ?? "чат"}»?`;

  return (
    <main className="educhat-page app-page classes-page app-page--with-tabbar">
      {clearChatOpen ? (
        <ConfirmModal
          title={clearChatTitle}
          lines={[
            "Все сообщения в этом чате будут удалены безвозвратно. Участники увидят пустую переписку.",
          ]}
          confirmLabel="Очистить"
          cancelLabel="Отмена"
          onConfirm={handleConfirmClearChat}
          onCancel={handleCloseClearChat}
          isBusy={clearingChat}
          errorMessage={clearChatError}
        />
      ) : null}

      {deleteChatOpen ? (
        <ConfirmModal
          title={deleteChatTitle}
          lines={[
            "Удалится только этот чат внутри группы.",
            "Сама группа и другие чаты останутся.",
          ]}
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          onConfirm={handleConfirmDeleteChat}
          onCancel={handleCloseDeleteChat}
          isBusy={deletingChat}
          errorMessage={deleteChatError}
        />
      ) : null}

      {createChatOpen ? (
        <div className="create-chat-modal-backdrop" role="presentation">
          <form className="create-chat-modal" onSubmit={handleCreateChatSubmit}>
            <h2>Создать чат</h2>

            <label>
              <span>Название</span>
              <input
                value={createChatTitle}
                onChange={(event) => setCreateChatTitle(event.target.value)}
                placeholder="Например: Домашка, Вопросы"
                autoFocus
              />
            </label>

            {selectedGroup ? (
              <p className="create-chat-group-hint">
                Группа: <strong>{selectedGroup.title}</strong>
              </p>
            ) : null}

            {createChatError ? (
              <p className="create-chat-error">{createChatError}</p>
            ) : null}

            <div className="create-chat-actions">
              <button
                type="button"
                className="create-chat-cancel"
                onClick={handleCloseCreateChat}
                disabled={createChatLoading}
              >
                Отмена
              </button>

              <button
                type="submit"
                className="create-chat-submit"
                disabled={createChatLoading || !createChatTitle.trim()}
              >
                {createChatLoading ? "Создаю..." : "Создать"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <section className="desktop-shell app-shell">
        <aside className="classes-sidebar app-sidebar">
          <BrandLogo />

          <AppNav active="classes" showAdminLink={showAdminLink} />

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>

            <div>
              <h3>Безопасное обучение</h3>
              <p>Группы могут быть защищены паролем</p>
            </div>
          </div>
        </aside>

        <div
          className={`chat-columns${
            selectedGroupId ? " chat-columns--in-group" : ""
          }${mobileThreadOpen ? " chat-columns--thread" : ""}`}
        >
          <section className="chat-panel">
            <header className="chat-list-header app-content-header">
              <div className="chat-list-header-main">
                <div>
                  <h1>Чаты</h1>
                  <p className="app-header-subtitle app-only-desktop">
                    Выберите группу, затем чат внутри неё
                  </p>
                </div>
              </div>

              <AppProfileChip
                firstName={firstName}
                avatarSrc={avatarSrc}
                avatarInitials={avatarInitials}
                href={clientRoutes.profile}
              />
            </header>

            <div className="chat-toolbar">
              <label className="chat-search">
                <Search size={20} strokeWidth={2} aria-hidden />
                <input
                  type="search"
                  placeholder="Поиск по группам"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </label>
            </div>

            <div className="rooms">
              <button
                type="button"
                className={`room-card bot-ai-room-card bot-ai-room-card--groups${
                  botAiOpen ? " bot-ai-room-card--active selected" : ""
                }`}
                onClick={openBotChat}
              >
                <div className="room-icon purple">🤖</div>
                <div className="room-info">
                  <h3>
                    @botAi
                    <Star
                      className="room-star"
                      size={14}
                      fill="currentColor"
                      aria-hidden
                    />
                  </h3>
                  <p>AI-помощник — всегда доступен</p>
                </div>
              </button>

              {roomsLoading ? (
                <p className="chat-hint">Загрузка групп…</p>
              ) : null}
              {!roomsLoading && filteredGroups.length === 0 ? (
                <p className="chat-hint">
                  Нет групп для чата. Войдите в группу на странице «Группы».
                </p>
              ) : null}
              {filteredGroups.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`room-card${
                    !botAiOpen && room.id === selectedGroupId ? " selected" : ""
                  }`}
                  onClick={() => selectGroup(room.id)}
                >
                  <div className={`room-icon ${room.iconClass}`}>
                    {room.icon}
                  </div>

                  <div className="room-info">
                    <h3>
                      {room.title}
                      {room.starred ? (
                        <Star
                          className="room-star"
                          size={14}
                          fill="currentColor"
                          aria-hidden
                        />
                      ) : null}
                      {room.locked ? (
                        <Lock
                          className="room-lock"
                          size={14}
                          strokeWidth={2}
                          aria-hidden
                        />
                      ) : null}
                    </h3>

                    <p>
                      {room.author}: {room.message}
                    </p>
                  </div>

                  <div className="room-meta">
                    <span>{room.time}</span>
                    {room.unread ? <b>{room.unread}</b> : null}
                  </div>
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`bot-card${botAiOpen ? " bot-card--active" : ""}`}
              onClick={openBotChat}
              aria-label="Открыть чат с @botAi"
            >
              <div className="bot-avatar">🤖</div>

              <div>
                <h3>@botAi</h3>
                <p>Ваш AI-помощник. Задавайте вопросы!</p>
              </div>
              <span className="bot-card-action">Написать</span>
            </button>
          </section>

          <section className="channels-panel">
            <header className="channels-panel-header">
              <AppBackButton
                className="thread-back-btn channels-panel-back"
                onClick={closeMobileChannels}
                ariaLabel="К списку групп"
              />
              <div>
                <h2>{selectedGroupRoom?.title ?? "Чаты группы"}</h2>
              </div>
              {canManageChat && selectedGroupId ? (
                <button
                  type="button"
                  className="chat-create-btn channels-panel-create channels-panel-create--desktop"
                  onClick={handleOpenCreateChat}
                >
                  + Чат
                </button>
              ) : null}
            </header>

            <button
              type="button"
              className={`room-card bot-ai-room-card bot-ai-room-card--pinned${
                botAiOpen ? " bot-ai-room-card--active selected" : ""
              }`}
              onClick={openBotChat}
            >
              <div className="room-icon purple">🤖</div>
              <div className="room-info">
                <h3>
                  @botAi
                  <Star
                    className="room-star"
                    size={14}
                    fill="currentColor"
                    aria-hidden
                  />
                </h3>
                <p>AI-помощник — всегда доступен</p>
              </div>
            </button>

            <div className="rooms channels-list">
              {!selectedGroupId ? (
                <p className="chat-hint">Сначала выберите группу слева</p>
              ) : null}
              {selectedGroupId && channelsLoading ? (
                <p className="chat-hint">Загрузка чатов…</p>
              ) : null}
              {selectedGroupId &&
              !channelsLoading &&
              filteredChannels.length === 0 ? (
                <p className="chat-hint">В группе пока нет чатов</p>
              ) : null}
              {filteredChannels.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  className={`room-card${
                    !botAiOpen && room.id === selectedChannelId ? " selected" : ""
                  }`}
                  onClick={() => selectChannel(room.id)}
                >
                  <div className={`room-icon ${room.iconClass}`}>{room.icon}</div>
                  <div className="room-info">
                    <h3>{room.title}</h3>
                    <p>{room.message}</p>
                  </div>
                </button>
              ))}
            </div>

            {canManageChat && selectedGroupId ? (
              <div className="channels-panel-footer">
                <button
                  type="button"
                  className="chat-create-btn channels-panel-create channels-panel-create--mobile"
                  onClick={handleOpenCreateChat}
                >
                  + Чат
                </button>
              </div>
            ) : null}
          </section>

          <aside className="thread-panel">
            <header className="thread-header">
              <AppBackButton
                className="thread-back-btn"
                onClick={closeMobileThread}
                ariaLabel="К списку чатов"
              />
              <div
                className={`thread-avatar ${botAiOpen ? "purple" : selectedChannel?.iconClass ?? "purple"}`}
              >
                {botAiOpen ? "🤖" : selectedChannel?.icon ?? "#"}
              </div>
              <div className="thread-header-text">
                <h2>
                  {botAiOpen
                    ? `@botAi · ${activeAgent.shortName}`
                    : selectedChannel?.title ?? "Чат"}
                </h2>
                <p>
                  <span
                    className={`chat-online-dot${
                      isRealChat && !wsConnected
                        ? socketError
                          ? " chat-online-dot--error"
                          : " chat-online-dot--pending"
                        : ""
                    }`}
                    aria-hidden
                  />
                  {botAiOpen
                    ? activeAgent.description
                    : isRealChat
                      ? wsConnected
                        ? selectedGroupRoom?.onlineLabel ?? "Подключено"
                        : socketError
                          ? "Чат доступен · переподключение…"
                          : "Подключение…"
                      : selectedGroupRoom
                        ? `Группа: ${selectedGroupRoom.title}`
                        : "Выберите чат в группе"}
                </p>
                {isRealChat && socketError ? (
                  <button
                    type="button"
                    className="chat-reconnect-btn"
                    onClick={() => socketRef.current?.connect()}
                  >
                    Переподключить чат
                  </button>
                ) : null}
              </div>
              {canClearActiveChat || (isRealChat && canManageChat) ? (
                <div className="thread-header-actions">
                  {canClearActiveChat ? (
                    <button
                      type="button"
                      className="thread-clear-btn"
                      disabled={clearingChat || (isRealChat && !wsConnected)}
                      onClick={handleOpenClearChat}
                    >
                      Очистить
                    </button>
                  ) : null}

                  {isRealChat && canManageChat ? (
                    <button
                      type="button"
                      className="thread-delete-btn"
                      onClick={handleOpenDeleteChat}
                      disabled={deletingChat}
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
              ) : null}
            </header>

            {botAiOpen ? (
              <nav className="ai-agent-switcher" aria-label="AI-помощники">
                {aiAgents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    className={`ai-agent-pill${
                      agent.id === activeAgentId ? " ai-agent-pill--active" : ""
                    }`}
                    aria-pressed={agent.id === activeAgentId}
                    onClick={() => chooseAiAgent(agent.id)}
                  >
                    {agent.shortName}
                  </button>
                ))}
              </nav>
            ) : null}

            {isRealChat && !botAiOpen && threadMessages.length > 0 ? (
              <div className="chat-ai-actions" aria-label="Действия AI по переписке">
                <span>Последние сообщения будут переданы AI. Ответ откроется в личном чате:</span>
                <button type="button" onClick={() => runChatHelper("reply")} disabled={botAiLoading}>
                  <MessageSquareReply size={15} aria-hidden />
                  Подготовить ответ
                </button>
                <button type="button" onClick={() => runChatHelper("summary")} disabled={botAiLoading}>
                  <ListChecks size={15} aria-hidden />
                  Сделать выжимку
                </button>
              </div>
            ) : null}

            <div ref={messagesWrapRef} className="messages-wrap">
              {threadEmptyHint ? (
                <p className="chat-thread-empty">{threadEmptyHint}</p>
              ) : (
                <div className="chat-date-pill">Сегодня</div>
              )}
              {isRealChat && historyLoading && threadMessages.length === 0 ? (
                <p className="chat-thread-state">Загружаем переписку…</p>
              ) : null}
              {isRealChat && historyError ? (
                <div className="chat-thread-state chat-thread-state--error" role="alert">
                  <span>{historyError}</span>
                  <button
                    type="button"
                    onClick={() => setHistoryRetry((attempt) => attempt + 1)}
                  >
                    Загрузить ещё раз
                  </button>
                </div>
              ) : null}
              {threadMessages.map((message) => (
                <article
                  key={message.id}
                  className={`message-row${message.isMine ? " message-row--mine" : ""}${
                    message.isBot ? " message-row--bot" : ""
                  }`}
                >
                  {!message.isMine ? (
                    <div
                      className={`message-avatar ${message.avatarUrl && !botAiOpen && !message.isBot ? "message-avatar--user" : selectedChannel?.iconClass ?? "purple"}`}
                      aria-hidden
                    >
                      {botAiOpen || message.isBot ? (
                        "🤖"
                      ) : message.avatarUrl ? (
                        <UserAvatar
                          src={getAvatarSrc(message.avatarUrl, message.avatarUrl)}
                          fallback={message.author.charAt(0)}
                        />
                      ) : (
                        message.author.charAt(0)
                      )}
                    </div>
                  ) : null}
                  <div
                    className={`message-bubble${message.isMine ? " message-bubble--mine" : ""}${
                      message.isBot ? " message-bubble--bot" : ""
                    }`}
                  >
                    <span className="message-author">{message.author}</span>
                    <div className="message-body">
                      <p>{message.text}</p>
                      <footer className="message-footer">
                        <time>{message.time ?? ""}</time>
                      </footer>
                    </div>
                  </div>
                  {message.isMine ? (
                    <div className="message-avatar message-avatar--user" aria-hidden>
                      <UserAvatar
                        src={avatarSrc}
                        fallback={avatarInitials}
                      />
                    </div>
                  ) : null}
                </article>
              ))}
              {botAiOpen && botAiLoading ? (
                <article className="message-row message-row--bot">
                  <div className="message-avatar purple" aria-hidden>
                    🤖
                  </div>
                  <div className="message-bubble message-bubble--bot">
                    <span className="message-author">@botAi</span>
                    <div className="message-body">
                      <p>Печатает...</p>
                      <footer className="message-footer">
                        <time />
                      </footer>
                    </div>
                  </div>
                </article>
              ) : null}
              <div className="messages-end" aria-hidden />
            </div>

            <ChatMessageInput
              value={botAiOpen ? botAiDraft : draft}
              onChange={botAiOpen ? setBotAiDraft : setDraft}
              onSubmit={botAiOpen ? sendBotAiMessage : sendMessage}
              disabled={
                !hasActiveThread ||
                (botAiOpen ? botAiLoading : messageSending)
              }
              placeholder={
                !hasActiveThread
                  ? "Сначала выберите чат"
                  : botAiOpen
                    ? "Сообщение @botAi..."
                    : messageSending
                      ? "Отправляем сообщение…"
                      : "Напишите сообщение..."
              }
            />
            {messageError ? (
              <p className="chat-action-error" role="alert">
                {messageError}
              </p>
            ) : null}
          </aside>
        </div>
      </section>

      <MobileBottomNav active="chat" showAdminLink={showAdminLink} />
    </main>
  );
}

function ChatFallback() {
  return (
    <main className="educhat-page educhat-page--loading" role="status" aria-live="polite">
      <section className="desktop-shell desktop-shell--loading">
        <div className="chat-loading-card">
          <span className="chat-loading-indicator" aria-hidden="true" />
          <p>Подключаем чаты…</p>
          <span>Это может занять несколько секунд.</span>
        </div>
      </section>
    </main>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}
