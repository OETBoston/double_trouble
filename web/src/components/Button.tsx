import { ButtonHTMLAttributes, forwardRef } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", fullWidth, className, ...rest },
  ref
) {
  const variantClass =
    variant === "primary"
      ? styles.primary
      : variant === "secondary"
        ? styles.secondary
        : styles.ghost;
  return (
    <button
      ref={ref}
      className={[styles.button, variantClass, fullWidth ? styles.fullWidth : "", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
});
