import AuthSessionProvider from "@/application/AuthSessionProvider";
import HomeGate from "./HomeGate";

/**
 * «/» — вход / регистрация (если нет пользователя в store) или заглушка после входа.
 */
export default function HomePage() {
  return (
    <AuthSessionProvider>
      <HomeGate />
    </AuthSessionProvider>
  );
}
