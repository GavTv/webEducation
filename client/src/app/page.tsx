import { clientRoutes } from "@/shared/consts/clientRoutes";

export default function HomePage() {
  return (
    <main className="app-main">
      <div className="app-container">
        <h1 className="app-title">Главная</h1>
        <p className="app-lead">
          Оболочка Next + TypeScript. Дальше — вёрстка и страницы в{" "}
          <code>src/app</code>, общий каркас — в{" "}
          <code>src/application/ApplicationLayout.tsx</code>.
        </p>
        <p className="app-meta">
          Пример константы маршрута: <code>{clientRoutes.home}</code>
        </p>
      </div>
    </main>
  );
}
