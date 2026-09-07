import { Eye } from 'lucide-react';

export default function DemoBanner() {
  return (
    <div className="flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-1.5 shrink-0">
      <Eye className="w-3.5 h-3.5 text-amber-600 shrink-0" />
      <span className="text-xs font-semibold text-amber-700">
        Demo Mode — view only. Messaging and settings changes are disabled.
      </span>
    </div>
  );
}