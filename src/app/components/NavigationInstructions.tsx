export default function NavigationInstructions() {
  return (
    <div className="mt-1 italic text-xs text-gray-500">
      Press <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Shitf</kbd>{" "}
      + <kbd className="px-1 py-0.5 bg-gray-100 border rounded">←</kbd> /{" "}
      <kbd className="px-1 py-0.5 bg-gray-100 border rounded">→</kbd> to
      navigate
    </div>
  );
}
