import { Icon } from "@iconify/react/dist/iconify.js";

export default function AETitleInfo({ aeTitle }: { aeTitle: string }) {
  return (
    <div className="flex gap-3 bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3 text-sm text-cyan-700">
      <Icon icon="solar:info-circle-linear" fontSize={18} className="flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold mb-1">Technician configuration:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>
            IP: <span className="font-mono">137.66.1.186</span>
          </li>
          <li>
            PORT: <span className="font-mono">11112</span>
          </li>
          <li>
            AE Title: <span className="font-mono">{aeTitle}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
