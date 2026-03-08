"use client";

interface UniqueLoadingProps {
  variant?: "morph";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function UniqueLoading({
  variant = "morph",
  size = "md",
  className = "",
}: UniqueLoadingProps) {
  const containerSizes = {
    sm: { width: "4rem", height: "4rem" },
    md: { width: "6rem", height: "6rem" },
    lg: { width: "8rem", height: "8rem" },
  };

  if (variant === "morph") {
    return (
      <div 
        className={className} 
        style={{ 
          position: "relative", 
          ...containerSizes[size], 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="morph-dot"
              style={{
                position: "absolute",
                width: "1rem",
                height: "1rem",
                background: "var(--text-primary)", /* Adapts to light/dark automatically */
                animation: `morph-${i} 2s infinite ease-in-out`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return null;
}
