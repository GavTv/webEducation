import Link from "next/link";
import { clientRoutes } from "@/shared/consts/clientRoutes";

export default function NotFoundPage() {
  return (
    <main className="app-main">
      <div className="app-container">
        <h1 className="app-title">404</h1>
        <p className="app-lead">Страница не найдена.</p>
        <p className="app-meta">
          <Link href={clientRoutes.home}>На главную</Link>
        </p>
      </div>
    </main>
  );
}
