import { createSlice } from "@reduxjs/toolkit";
import { initialUserState } from "../model";
import {
  loginThunk,
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
    });
    builder.addCase(loginThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при входе в приложение";
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
    });
    builder.addCase(logoutThunk.rejected, (state, action) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.error = action.payload ?? "Ошибка при выходе из приложения";
    });
  },
});

export const { setUser, setError } = userSlice.actions;
export const userReducer = userSlice.reducer;
