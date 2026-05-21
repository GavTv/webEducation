import { axiosInstance } from "@/shared/lib/axiosInstance";
import { extractApiMessage } from "@/shared/lib/extractApiMessage";
import type { ServerResponseType } from "@/shared/types";

export type ClassRoomItem = {
  id: number;
  title: string;
  description: string | null;
  color: string;
  createdBy: number;
  memberCount: number;
  hasPassword: boolean;
  isMember?: boolean;
  createdAt?: string;
};

export type ClassAccessInfo = {
  hasAccess: boolean;
  needsPassword: boolean;
  isMember: boolean;
};

export type ChatChannelItem = {
  id: number;
  title: string;
  parentRoomId: number;
  color: string;
  createdBy: number;
  createdAt?: string;
};

export type GroupChannelsResponse = {
  group: { id: number; title: string; color: string };
  channels: ChatChannelItem[];
};

export async function fetchClasses(): Promise<ClassRoomItem[]> {
  const { data } = await axiosInstance.get<
    ServerResponseType<{ classes: ClassRoomItem[] }>
  >("classes");

  if (data.statusCode !== 200 || !data.data?.classes) {
    throw new Error(data.message ?? "Не удалось загрузить классы");
  }

  return data.data.classes;
}

export async function createClass(payload: {
  title: string;
  description?: string;
  joinPassword?: string;
}): Promise<ClassRoomItem> {
  const { data } = await axiosInstance.post<
    ServerResponseType<{ class: ClassRoomItem }>
  >("classes", payload);

  if (data.statusCode !== 201 || !data.data?.class) {
    throw new Error(data.message ?? "Не удалось создать класс");
  }

  return data.data.class;
}

export async function updateClass(
  id: number,
  payload: { title?: string; description?: string },
): Promise<ClassRoomItem> {
  const { data } = await axiosInstance.patch<
    ServerResponseType<{ class: ClassRoomItem }>
  >(`classes/${id}`, payload);

  if (data.statusCode !== 200 || !data.data?.class) {
    throw new Error(data.message ?? "Не удалось обновить класс");
  }

  return data.data.class;
}

export async function deleteClass(id: number): Promise<void> {
  const { data } = await axiosInstance.delete<ServerResponseType<null>>(
    `classes/${id}`,
  );

  if (data.statusCode !== 200) {
    throw new Error(data.message ?? "Не удалось удалить класс");
  }
}

export async function setClassPassword(
  id: number,
  joinPassword: string,
): Promise<ClassRoomItem> {
  const { data } = await axiosInstance.patch<
    ServerResponseType<{ class: ClassRoomItem }>
  >(`classes/${id}/password`, { joinPassword });

  if (data.statusCode !== 200 || !data.data?.class) {
    throw new Error(data.message ?? "Не удалось установить пароль");
  }

  return data.data.class;
}

export async function fetchClassAccess(id: number): Promise<ClassAccessInfo> {
  const { data } = await axiosInstance.get<
    ServerResponseType<{ access: ClassAccessInfo }>
  >(`classes/${id}/access`);

  if (data.statusCode !== 200 || !data.data?.access) {
    throw new Error(data.message ?? "Не удалось проверить доступ");
  }

  return data.data.access;
}

export async function fetchGroupChannels(
  groupId: number,
): Promise<GroupChannelsResponse> {
  const { data } = await axiosInstance.get<
    ServerResponseType<GroupChannelsResponse>
  >(`classes/${groupId}/channels`);

  if (data.statusCode !== 200 || !data.data?.channels) {
    throw new Error(data.message ?? "Не удалось загрузить чаты группы");
  }

  return {
    group: data.data.group,
    channels: data.data.channels,
  };
}

export async function createGroupChannel(
  groupId: number,
  payload: { title: string },
): Promise<ChatChannelItem> {
  const { data } = await axiosInstance.post<
    ServerResponseType<{ channel: ChatChannelItem }>
  >(`classes/${groupId}/channels`, payload);

  if (data.statusCode !== 201 || !data.data?.channel) {
    throw new Error(data.message ?? "Не удалось создать чат");
  }

  return data.data.channel;
}

export async function deleteGroupChannel(
  groupId: number,
  channelId: number,
): Promise<void> {
  const { data } = await axiosInstance.delete<ServerResponseType<null>>(
    `classes/${groupId}/channels/${channelId}`,
  );

  if (data.statusCode !== 200) {
    throw new Error(data.message ?? "Не удалось удалить чат");
  }
}

export async function joinClass(id: number, password?: string): Promise<void> {
  try {
    const { data } = await axiosInstance.post<
      ServerResponseType<{ joined: boolean }>
    >(`classes/${id}/join`, password ? { password } : {});

    if (data.statusCode !== 200) {
      throw new Error(data.message ?? "Не удалось войти в класс");
    }
  } catch (err) {
    throw new Error(extractApiMessage(err, "Не удалось войти в класс"));
  }
}
