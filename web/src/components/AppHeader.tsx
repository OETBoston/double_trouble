import { NavLink } from "react-router-dom";
import styles from "./AppHeader.module.css";

export function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.brandRow}>
        {/* The logo itself reads "City of Boston" (with the city's red
            underline mark), so it carries that meaning on its own -- no
            separate text label needed alongside it. */}
        <img src="/primary-logo.png" alt="City of Boston" className={styles.logo} />
        <span className={styles.title}>Double Parking Reporter</span>
      </div>
      <nav className={styles.nav} aria-label="Primary">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? styles.navLinkActive : styles.navLink)}
          end
        >
          Make a Report
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
