import { createSlice } from "@reduxjs/toolkit";
import { initialUserState } from "../model";
import {
  deleteAccountThunk,
  loginThunk,
  loginWithOAuthThunk,
  logoutThunk,
  refreshTokenThunk,
  registerThunk,
} from "../api/UserApiThunk";

const userSlice = createSlice({
  name: "user",
  initialState: initialUserState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearAuthSuccessToast: (state) => {
      state.authSuccessToast = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(refreshTokenThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });
    builder.addCase(refreshTokenThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = action.payload;
      state.error = null;
    });
    builder.addCase(refreshTokenThunk.rejected, (state) => {
      state.isLoading = false;
      state.isInitialized = true;
    });

    builder.addCase(registerThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });
    builder.addCase(registerThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = action.payload;
      state.error = null;
      state.authSuccessToast = "Регистрация прошла успешно";
    });
    builder.addCase(registerThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при регистрации";
    });

    builder.addCase(loginThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });
    builder.addCase(loginThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = action.payload;
      state.error = null;
      state.authSuccessToast = "Вы успешно вошли";
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при входе в приложение";
    });

    builder.addCase(loginWithOAuthThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });
    builder.addCase(loginWithOAuthThunk.fulfilled, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = action.payload;
      state.error = null;
      state.authSuccessToast = "Вы успешно вошли";
    });
    builder.addCase(loginWithOAuthThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при входе через соцсеть";
    });

    builder.addCase(logoutThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = null;
      state.error = null;
      state.authSuccessToast = null;
    });
    builder.addCase(logoutThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при выходе из приложения";
    });

    builder.addCase(deleteAccountThunk.pending, (state) => {
      state.error = null;
      state.isLoading = true;
    });
    builder.addCase(deleteAccountThunk.fulfilled, (state) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = null;
      state.error = null;
      state.authSuccessToast = null;
    });
    builder.addCase(deleteAccountThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при удалении аккаунта";
    });
  },
});

export const { setUser, setError, clearAuthSuccessToast } = userSlice.actions;
export const userReducer = userSlice.reducer;
