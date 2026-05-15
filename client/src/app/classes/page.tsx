import Link from "next/link";
import "./page.css";

const classes = [
  {
    id: 1,
    title: "1 класс",
    description: "Учебный чат для 1 класса",
    students: 24,
    color: "purple",
  },
  {
    id: 2,
    title: "2 класс",
    description: "Учебный чат для 2 класса",
    students: 27,
    color: "blue",
  },
  {
    id: 3,
    title: "3 класс",
    description: "Учебный чат для 3 класса",
    students: 30,
    color: "green",
  },
];

export default function ClassesPage() {
  return (
    <main className="classes-page">
      <section className="classes-shell">
        <aside className="classes-sidebar">
          <div className="brand">
            <div className="brand-icon">
              <span>✦</span>
            </div>
            <span className="brand-name">EduChat</span>
          </div>

          <nav className="sidebar-nav">
            <Link className="nav-link active" href="/classes">
              <span className="nav-icon">●</span>
              Классы
            </Link>

            <Link className="nav-link" href="/profile">
              <span className="nav-icon">♙</span>
              Профиль
            </Link>
          </nav>

          <div className="sidebar-info">
            <div className="shield-mini">🛡</div>
            <div>
              <h3>Безопасное обучение</h3>
              <p>Все классы защищены паролем.</p>
            </div>
          </div>
        </aside>

        <section className="classes-content">
          <header className="classes-header">
            <div>
              <p className="eyebrow">Учебная платформа</p>
              <h1>Добро пожаловать, Иван! 👋</h1>
              <p>Выберите класс, чтобы начать общение</p>
            </div>

            <div className="profile-card">
              <div className="profile-avatar">И</div>
              <div>
                <strong>Иван</strong>
                <span>Онлайн</span>
              </div>
            </div>
          </header>

          <div className="classes-top">
            <div>
              <h2>Ваши классы</h2>
              <p>Доступные учебные чаты</p>
            </div>

            <button type="button" className="add-button">
              + Добавить класс
            </button>
          </div>

          <div className="classes-grid">
            {classes.map((classItem) => (
              <Link
                href={`/chat?classId=${classItem.id}`}
                className="class-card"
                key={classItem.id}
              >
                <div className={`class-icon ${classItem.color}`}>
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 5.5C4 4.67 4.67 4 5.5 4H9C10.66 4 12 5.34 12 7V20C12 18.34 10.66 17 9 17H5.5C4.67 17 4 16.33 4 15.5V5.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 5.5C20 4.67 19.33 4 18.5 4H15C13.34 4 12 5.34 12 7V20C12 18.34 13.34 17 15 17H18.5C19.33 17 20 16.33 20 15.5V5.5Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="class-info">
                  <h3>{classItem.title}</h3>
                  <p>{classItem.description}</p>
                  <span>Участников: {classItem.students}</span>
                </div>

                <div className="class-meta">
                  <div className="password-label">
                    <span>🔒</span>
                    Требуется пароль
                  </div>
                  <span className="arrow">›</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
