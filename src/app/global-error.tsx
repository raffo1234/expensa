"use client";
export default function GlobalError({ error }: { error: Error }) {
  return (
    <div style={{ padding: 20, fontFamily: "monospace", fontSize: 12 }}>
      <h2>Error</h2>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {error.message}
        {"\n"}
        {error.stack}
      </pre>
    </div>
  );
}
