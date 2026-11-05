import styles from "./BrandLogo.module.css";

type BrandLogoProps = {
  className?: string;
};

const LOGO_ICON_SRC = "/Logo_type.png";

export function BrandLogo({ className }: BrandLogoProps) {
  return (
    <div className={className ? `${styles.brand} ${className}` : styles.brand}>
      <img
        className={styles.icon}
        src={LOGO_ICON_SRC}
        alt=""
        width={52}
        height={52}
        decoding="async"
      />
      <span className={styles.name}>My Work Chat</span>
    </div>
  );
}
