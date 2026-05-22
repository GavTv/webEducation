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
import { Lock, Search, Star } from "lucide-react";
import { ChatMessageInput } from "./ChatMessageInput";
import {
  createGroupChannel,
  deleteGroupChannel,
  fetchClassAccess,
  fetchClasses,
  fetchGroupChannels,
  joinClass,
  type ChatChannelItem,
  type ClassRoomItem,
} from "@/shared/lib/classesApi";
import {
  createChatSocket,
  emitClearRoom,
  emitJoinRoom,
  emitSendMessage,
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
import { canManageClasses, isAdmin } from "@/shared/lib/permissions";
import "./page.css";

const MOBILE_BP = "(max-width: 900px)";
const BOT_AI_OPEN_STORAGE_KEY = "webEducation:botAiOpen";
const BOT_AI_MESSAGES_STORAGE_KEY = "webEducation:botAiMessages";

function buildChatUrl(classId?: number | null, channelId?: number | null) {
  const params = new URLSearchParams();
  if (classId != null) params.set("classId", String(classId));
  if (channelId != null) params.set("channelId", String(channelId));
  const query = params.toString();
  return query ? `${clientRoutes.chat}?${query}` : clientRoutes.chat;
}

function isMobileChatView() {
  return (
    typeof window !== "undefined" && window.matchMedia(MOBILE_BP).matches
  );
}

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
  const [memberClasses, setMemberClasses] = useState<ClassRoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastScrolledRoomRef = useRef<number | null>(null);
  const socketRef = useRef<ReturnType<typeof createChatSocket> | null>(null);
  const selectedChannelIdRef = useRef(selectedChannelId);
  /** Пока true — не подставлять channelId из URL (ручной выбор группы). */
  const skipUrlChannelSyncRef = useRef(false);

  const [botAiOpen, setBotAiOpen] = useState(false);
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

  const syncChatUrl = useCallback(
    (classId?: number | null, channelId?: number | null) => {
      router.replace(buildChatUrl(classId, channelId), { scroll: false });
    },
    [router],
  );

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

    void loadGroupChannels(selectedGroupId);
  }, [selectedGroupId, loadGroupChannels]);

  useEffect(() => {
    if (!selectedGroupId || channelsLoading) return;

    if (skipUrlChannelSyncRef.current) {
      skipUrlChannelSyncRef.current = false;
      return;
    }

    const channelIdParam = searchParams.get("channelId");
    if (!channelIdParam) {
      setSelectedChannelId(null);
      setMobileThreadOpen(false);
      return;
    }

    const preferredId = Number(channelIdParam);
    if (!Number.isFinite(preferredId)) return;

    const preferred = groupChannels.find((ch) => ch.id === preferredId);
    if (!preferred) return;

    setSelectedChannelId(preferred.id);
    if (isMobileChatView()) {
      setMobileThreadOpen(true);
    }
  }, [searchParams, selectedGroupId, groupChannels, channelsLoading]);

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
      setMessagesByRoomId({});
    };
    const onDisconnect = () => setWsConnected(false);

    const onHistory = (payload: RoomHistoryPayload | ChannelHistoryPayload) => {
      const roomId =
        "roomId" in payload && payload.roomId
          ? payload.roomId
          : "channelId" in payload
            ? payload.channelId
            : 0;
      if (!roomId) return;
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

  const displayAuthorName = useMemo(() => {
    if (!userName) return firstName;
    return firstName;
  }, [firstName, userName]);

  useEffect(() => {
    const roomChanged = lastScrolledRoomRef.current !== selectedChannelId;
    lastScrolledRoomRef.current = selectedChannelId;

    const behavior = roomChanged ? "auto" : "smooth";

    const id = requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
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

  const selectGroup = useCallback(
    (id: number) => {
      skipUrlChannelSyncRef.current = true;
      setBotAiOpen(false);
      setSelectedGroupId(id);
      setSelectedChannelId(null);
      setMobileThreadOpen(false);
      syncChatUrl(id, null);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
      }
    },
    [syncChatUrl],
  );

  const selectChannel = useCallback(
    (id: number) => {
      setBotAiOpen(false);
      setSelectedChannelId(id);
      setMobileThreadOpen(isMobileChatView());

      if (selectedGroupId != null) {
        syncChatUrl(selectedGroupId, id);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
      }
    },
    [selectedGroupId, syncChatUrl],
  );

  const closeMobileThread = useCallback(() => {
    setMobileThreadOpen(false);

    if (botAiOpen) {
      setBotAiOpen(false);

      if (typeof window !== "undefined") {
        window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "false");
      }
    }

    if (selectedGroupId != null && !botAiOpen) {
      skipUrlChannelSyncRef.current = true;
      setSelectedChannelId(null);
      syncChatUrl(selectedGroupId, null);
    }
  }, [botAiOpen, selectedGroupId, syncChatUrl]);

  const closeMobileChannels = useCallback(() => {
    setSelectedGroupId(null);
    setSelectedChannelId(null);
    setMobileThreadOpen(false);
    syncChatUrl(null, null);
  }, [syncChatUrl]);

  const openBotChat = useCallback(() => {
    skipUrlChannelSyncRef.current = true;
    setBotAiOpen(true);
    setSelectedChannelId(null);
    setMobileThreadOpen(isMobileChatView());

    if (selectedGroupId != null) {
      syncChatUrl(selectedGroupId, null);
    }

    if (typeof window !== "undefined") {
      window.localStorage.setItem(BOT_AI_OPEN_STORAGE_KEY, "true");
    }
  }, [selectedGroupId, syncChatUrl]);

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
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const text = draft.trim();

      if (!text || !selectedChannelId) return;

      const socket = socketRef.current;
      if (!socket?.connected) return;

      emitSendMessage(socket, selectedChannelId, text);
      setDraft("");
    },
    [draft, selectedChannelId],
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
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text }),
        });

        const data = await response.json().catch(() => null);

        addBotAiMessage({
          id: `botai-answer-${Date.now()}`,
          author: "@botAi",
          text: data?.answer || "Не получилось получить ответ от AI.",
          time: formatTime(),
          isBot: true,
          isError: !response.ok,
        });
      } catch {
        addBotAiMessage({
          id: `botai-error-${Date.now()}`,
          author: "@botAi",
          text: "Ошибка соединения с AI route.",
          time: formatTime(),
          isBot: true,
          isError: true,
        });
      } finally {
        setBotAiLoading(false);
      }
    },
    [addBotAiMessage, botAiDraft, botAiLoading],
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
        setMobileThreadOpen(isMobileChatView());
        syncChatUrl(selectedGroupId, created.id);
        setCreateChatOpen(false);
      } catch (error) {
        setCreateChatError(
          error instanceof Error ? error.message : "Не удалось создать чат",
        );
      } finally {
        setCreateChatLoading(false);
      }
    },
    [createChatTitle, selectedGroupId, syncChatUrl],
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
      skipUrlChannelSyncRef.current = true;
      setSelectedChannelId(null);
      setMobileThreadOpen(false);
      syncChatUrl(selectedGroupId, null);

      setMessagesByRoomId((prev) => {
        const next = { ...prev };
        delete next[selectedChannelId];
        return next;
      });

      setDeleteChatOpen(false);
    } catch (error) {
      setDeleteChatError(
        error instanceof Error ? error.message : "Не удалось удалить чат",
      );
    } finally {
      setDeletingChat(false);
    }
  }, [groupChannels, isRealChat, selectedChannelId, selectedGroupId, syncChatUrl]);

  const clearChatTitle = botAiOpen
    ? "Очистить чат с @botAi?"
    : `Очистить чат «${selectedChannel?.title ?? "чат"}»?`;

  const deleteChatTitle = `Удалить чат «${selectedChannel?.title ?? "чат"}»?`;

  return (
    <main
      className={`educhat-page app-page classes-page app-page--with-tabbar${
        mobileThreadOpen || selectedGroupId || botAiOpen
          ? " app-page--hide-tabbar"
          : ""
      }`}
    >
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

          <AppNav active="chat" showAdminLink={showAdminLink} />

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
          }${botAiOpen && !selectedGroupId ? " chat-columns--bot-open" : ""}${
            mobileThreadOpen ? " chat-columns--thread" : ""
          }`}
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

              <button
                type="button"
                className={`room-card bot-ai-room-card bot-ai-room-card--channels${
                  botAiOpen ? " bot-ai-room-card--active selected" : ""
                }`}
                onClick={openBotChat}
                aria-label="Открыть чат с @botAi"
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
                <h2>{botAiOpen ? "@botAi" : selectedChannel?.title ?? "Чат"}</h2>
                <p>
                  <span className="chat-online-dot" aria-hidden />
                  {botAiOpen
                    ? "AI-помощник: код, учёба и немного общения"
                    : isRealChat
                      ? wsConnected
                        ? selectedGroupRoom?.onlineLabel ?? "Подключено"
                        : "Подключение…"
                      : selectedGroupRoom
                        ? `Группа: ${selectedGroupRoom.title}`
                        : "Выберите чат в группе"}
                </p>
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

            <div className="messages-wrap">
              {threadEmptyHint ? (
                <p className="chat-thread-empty">{threadEmptyHint}</p>
              ) : (
                <div className="chat-date-pill">Сегодня</div>
              )}
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
              <div ref={messagesEndRef} className="messages-end" aria-hidden />
            </div>

            <ChatMessageInput
              value={botAiOpen ? botAiDraft : draft}
              onChange={botAiOpen ? setBotAiDraft : setDraft}
              onSubmit={botAiOpen ? sendBotAiMessage : sendMessage}
              disabled={
                !hasActiveThread ||
                (botAiOpen ? botAiLoading : isRealChat && !wsConnected)
              }
              placeholder={
                !hasActiveThread
                  ? "Сначала выберите чат"
                  : botAiOpen
                    ? "Сообщение @botAi..."
                    : isRealChat && !wsConnected
                      ? "Подключение к чату…"
                      : "Напишите сообщение..."
              }
            />
          </aside>
        </div>
      </section>

      <MobileBottomNav active="chat" showAdminLink={showAdminLink} />
    </main>
  );
}

function ChatFallback() {


  return (
    <main className="educhat-page educhat-page--loading">
      <section className="desktop-shell desktop-shell--loading" />
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
