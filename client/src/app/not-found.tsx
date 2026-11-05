import Link from "next/link";
import Image from "next/image";
import { clientRoutes } from "@/shared/consts/clientRoutes";
import styles from "./not-found.module.css";

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <div className={styles.visual} aria-hidden>
        <Image
          src="/404-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className={styles.image}
        />
        <p className={styles.code}>404</p>
      </div>

      <div className={styles.actions}>
        <p className={styles.lead}>Такой страницы нет — проверьте адрес</p>
        <Link href={clientRoutes.classes} className={styles.link}>
          На главную
        </Link>
      </div>
    </main>
  );
}
