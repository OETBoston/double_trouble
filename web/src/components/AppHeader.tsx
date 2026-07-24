import { NavLink } from "react-router-dom";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        <span className={styles.cityTag} aria-hidden="true">
          CITY OF BOSTON
        </span>
        <span className={styles.title}>Double Parking Reporter</span>
      </div>
      <nav className={styles.nav} aria-label="Primary">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
          end
        >
          Report
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
        >
          Dashboard
        </NavLink>
      </nav>
    </header>
  );
}
