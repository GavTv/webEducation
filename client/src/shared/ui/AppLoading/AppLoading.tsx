import styles from "./AppLoading.module.css";

type AppLoadingProps = {
  label?: string;
};

export function AppLoading({ label = "Загружаем приложение…" }: AppLoadingProps) {
  return (
    <main className={styles.page} role="status" aria-live="polite">
      <section className={styles.card}>
        <span className={styles.indicator} aria-hidden="true" />
        <strong>My Work Chat</strong>
        <p>{label}</p>
      </section>
    </main>
  );
}
