import { axiosInstance, setAccessToken } from "@/shared/lib/axiosInstance";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type {
  UserLoginData,
  UserRegisterData,
  UserType,
  UserWithTokenType,
} from "../model";
import type { ServerResponseType } from "@/shared/types";
import { AxiosError } from "axios";

const USER_THUNK_NAMES = {
  REGISTER: "user/register",
  LOGIN: "user/login",
  LOGIN_OAUTH: "user/loginOAuth",
  REFRESH: "user/refresh",
  LOGOUT: "user/logout",
  DELETE_ACCOUNT: "user/deleteAccount",
  UPDATE_PROFILE: "user/updateProfile",
} as const;

const USER_API_URLS = {
  REGISTER: "auth/register",
  LOGIN: "auth/login",
  LOGIN_OAUTH: "auth/oauth",
  REFRESH: "auth/refresh",
  LOGOUT: "auth/logout",
  DELETE_ACCOUNT: "auth/me",
  UPDATE_PROFILE: "auth/me",
} as const;

export const refreshTokenThunk = createAsyncThunk<
  UserType,
  void,
  { rejectValue: string }
>(USER_THUNK_NAMES.REFRESH, async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.REFRESH);

    if (data.statusCode === 200 && data.data?.user) {
      setAccessToken(data.data.accessToken ?? "");
      return data.data.user;
    }

    return rejectWithValue(data.message ?? "Ошибка при обновлении токена");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;
    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при обновлении токена",
    );
  }
});

export const registerThunk = createAsyncThunk<
  UserType,
  UserRegisterData,
  { rejectValue: string }
>(USER_THUNK_NAMES.REGISTER, async (userData, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.REGISTER, userData);

    if (data.statusCode === 201 && data.data?.user) {
      setAccessToken(data.data.accessToken ?? "");
      return data.data.user;
    }
    return rejectWithValue(data.message ?? "Ошибка при регистрации");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;
    return rejectWithValue(d?.error ?? d?.message ?? "Ошибка при регистрации");
  }
});

export const loginThunk = createAsyncThunk<
  UserType,
  UserLoginData,
  { rejectValue: string }
>(USER_THUNK_NAMES.LOGIN, async (userData, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.LOGIN, userData);

    if (data.statusCode === 200 && data.data?.user) {
      setAccessToken(data.data.accessToken ?? "");
      return data.data.user;
    }
    return rejectWithValue(data.message ?? "Ошибка при входе в приложение");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;
    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при входе в приложение",
    );
  }
});

export const loginWithOAuthThunk = createAsyncThunk<
  UserType,
  { provider: "google" | "github"; accessToken: string; rememberMe: boolean },
  { rejectValue: string }
>(USER_THUNK_NAMES.LOGIN_OAUTH, async (payload, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.LOGIN_OAUTH, {
      provider: payload.provider,
      accessToken: payload.accessToken,
      rememberMe: payload.rememberMe,
    });

    if (data.statusCode === 200 && data.data?.user) {
      setAccessToken(data.data.accessToken ?? "");
      return data.data.user;
    }
    return rejectWithValue(data.message ?? "Ошибка при входе через соцсеть");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;
    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при входе через соцсеть",
    );
  }
});

export const logoutThunk = createAsyncThunk<
  null,
  void,
  { rejectValue: string }
>(USER_THUNK_NAMES.LOGOUT, async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post<ServerResponseType<null>>(
      USER_API_URLS.LOGOUT,
    );

    if (data.statusCode === 200) {
      setAccessToken("");
      return null;
    }
    return rejectWithValue(data.message ?? "Ошибка при выходе из приложения");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;
    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при выходе из приложения",
    );
  }
});



export const updateProfileThunk = createAsyncThunk<
  UserType,
  { name: string; avatar?: File | null },
  { rejectValue: string }
>(USER_THUNK_NAMES.UPDATE_PROFILE, async (payload, { rejectWithValue }) => {
  try {
    const formData = new FormData();

    formData.append("name", payload.name);

    if (payload.avatar) {
      formData.append("avatar", payload.avatar);
    }

    const { data } = await axiosInstance.patch<
      ServerResponseType<UserWithTokenType>
    >(USER_API_URLS.UPDATE_PROFILE, formData);

    if (data.statusCode === 200 && data.data?.user) {
      setAccessToken(data.data.accessToken ?? "");
      return data.data.user;
    }

    return rejectWithValue(data.message ?? "Ошибка при обновлении профиля");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;

    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при обновлении профиля",
    );
  }
});

export const deleteAccountThunk = createAsyncThunk<
  null,
  void,
  { rejectValue: string }
>(USER_THUNK_NAMES.DELETE_ACCOUNT, async (_, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.delete<ServerResponseType<null>>(
      USER_API_URLS.DELETE_ACCOUNT,
    );

    if (data.statusCode === 200) {
      setAccessToken("");
      return null;
    }
    return rejectWithValue(data.message ?? "Ошибка при удалении аккаунта");
  } catch (error) {
    const d = (error as AxiosError<ServerResponseType<null>>).response?.data;
    return rejectWithValue(
      d?.error ?? d?.message ?? "Ошибка при удалении аккаунта",
    );
  }
});
