"use client";

import { usePathname } from "next/navigation";

type ApplicationLayoutProps = {
  children: React.ReactNode;
};

export default function ApplicationLayout({
  children,
}: ApplicationLayoutProps) {
  const pathname = usePathname();
  const hideChrome = pathname === "/";

  if (hideChrome) {
    return <>{children}</>;
  }

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
