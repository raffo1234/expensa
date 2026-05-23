"use client";

interface CategoryBadgeProps {
  category?: string | null;
  color?: string | null;
}

export default function CategoryBadge({ category, color }: CategoryBadgeProps) {
  if (!category || category === "other") return <span className="text-gray-300 text-xs">—</span>;

  const bg = color ? `${color}18` : "#f3f4f6";
  const text = color ?? "#374151";

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      {category}
    </span>
  );
}
