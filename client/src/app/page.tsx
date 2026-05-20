import AuthSessionProvider from "@/application/AuthSessionProvider";
import HomeGate from "./HomeGate";

/**
 * «/» — редирект: авторизован → классы, иначе → `/auth?mode=login`.
 */
export default function HomePage() {
  return (
    <AuthSessionProvider>
      <HomeGate />
    </AuthSessionProvider>
  );
}
