"use client";

interface CategoryBadgeProps {
  category?: string | null;
  color?: string | null;
}

// Category pill shared by every table. Uses the category's own color when set,
// otherwise the neutral navy tones of the data tables.
export default function CategoryBadge({ category, color }: CategoryBadgeProps) {
  if (!category || category === "other") return <span>—</span>;

  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: color ? `${color}20` : "var(--color-navy-100)",
        color: color ?? "var(--color-navy-700)",
      }}
    >
      {category}
    </span>
  );
}
