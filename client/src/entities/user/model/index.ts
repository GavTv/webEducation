export type UserType = {
  id: number;
  name: string;
  email: string;
  username: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserWithTokenType = {
  user: UserType;
  accessToken: string;
};

export type UserLoginData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type UserRegisterData = UserLoginData & {
  name: string;
  username: string;
};

export type UserStateType = {
  user: UserType | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
};

export const initialUserState: UserStateType = {
  user: null,
  isLoading: false,
  error: null,
  isInitialized: false,
};
