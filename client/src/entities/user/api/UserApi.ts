import { axiosInstance, refreshSession } from "@/shared/lib/axiosInstance";
import type { ServerResponseType } from "@/shared/types";
import type {
  UserLoginData,
  UserRegisterData,
  UserWithTokenType,
} from "../model";

const USER_API_URLS = {
  REGISTER: "auth/register",
  LOGIN: "auth/login",
  LOGIN_OAUTH: "auth/oauth",
  REFRESH: "auth/refresh",
  LOGOUT: "auth/logout",
  DELETE_ACCOUNT: "auth/me",
  UPDATE_PROFILE: "auth/me",
} as const;

export type UserOAuthLoginData = {
  provider: "google" | "github";
  accessToken: string;
  rememberMe: boolean;
};

export type UserUpdateProfileData = {
  name: string;
  phone?: string;
  avatar?: File | null;
};

export default class UserApi {
  static async refresh() {
    const data = await refreshSession<ServerResponseType<UserWithTokenType>>();

    if (!data || data.statusCode !== 200 || !data.data?.user) {
      return {
        statusCode: 401,
        message: "Сессия не найдена",
        data: null,
        error: "Сессия не найдена",
      } as ServerResponseType<UserWithTokenType>;
    }

    return data;
  }

  static async register(userData: UserRegisterData) {
    const { data } = await axiosInstance.post<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.REGISTER, userData);

    return data;
  }

  static async login(userData: UserLoginData) {
    const { data } = await axiosInstance.post<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.LOGIN, userData);

    return data;
  }

  static async loginWithOAuth(payload: UserOAuthLoginData) {
    const { data } = await axiosInstance.post<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.LOGIN_OAUTH, payload);

    return data;
  }

  static async logout() {
    const { data } = await axiosInstance.post<ServerResponseType<null>>(
      USER_API_URLS.LOGOUT,
    );

    return data;
  }

  static async updateProfile(payload: UserUpdateProfileData) {
    const formData = new FormData();

    formData.append("name", payload.name);
    formData.append("phone", payload.phone?.trim() ?? "");

    if (payload.avatar) {
      formData.append("avatar", payload.avatar);
    }

    const { data } = await axiosInstance.patch<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.UPDATE_PROFILE, formData);

    return data;
  }

  static async deleteAccount() {
    const { data } = await axiosInstance.delete<ServerResponseType<null>>(
      USER_API_URLS.DELETE_ACCOUNT,
    );

    return data;
  }
}
