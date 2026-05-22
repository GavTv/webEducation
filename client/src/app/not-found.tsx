import Link from "next/link";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import styles from "./not-found.module.css";

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <div className={styles.actions}>
        <p className={styles.lead}>Страница не найдена</p>
        <Link href={clientRoutes.classes} className={styles.link}>
          На главную
        </Link>
      </div>
    </main>
  );
}
