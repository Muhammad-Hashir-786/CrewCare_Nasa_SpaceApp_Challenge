interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
        gap: 12,
        textAlign: "center",
      }}
    >
      {icon && (
        <div style={{ fontSize: 32, color: "var(--cc-text-muted)", opacity: 0.6 }}>{icon}</div>
      )}
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--cc-text-secondary)" }}>
        {title}
      </p>
      {description && (
        <p style={{ margin: 0, fontSize: 13, color: "var(--cc-text-muted)", maxWidth: 320 }}>
          {description}
        </p>
      )}
    </div>
  );
}
