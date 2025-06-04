export default function DotsLoading() {
  return (
    <div className="flex gap-1 items-center dark:invert">
      <span className="sr-only">Loading...</span>
      <div className="h-1 w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="h-1 w-1 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="h-1 w-1 bg-cyan-400 rounded-full animate-bounce"></div>
    </div>
  );
}
