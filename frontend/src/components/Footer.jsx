export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--color-border-tertiary)",
      padding: "16px 24px",
      textAlign: "center",
      fontSize: "13px",
      color: "var(--color-text-secondary)",
      marginTop: "auto",
    }}>
      <span>© {new Date().getFullYear()} StockSense &mdash; Made by </span>
      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
        Shubham Sood
      </span>
    </footer>
  );
}
