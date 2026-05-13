type ApplicationLayoutProps = {
  children: React.ReactNode;
};

/**
 * Общая оболочка страниц (шапка / контент / подвал).
 * Сюда позже можно вынести навигацию и т.п.
 */
export default function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  return (
    <>
      <header className="app-header">
        <div className="app-container">
          <p className="app-placeholder">шапка — верстай здесь</p>
        </div>
      </header>
      {children}
      <footer className="app-footer">
        <div className="app-container">
          <p className="app-placeholder">подвал — верстай здесь</p>
        </div>
      </footer>
    </>
  );
}
