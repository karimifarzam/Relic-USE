import { Trash2 } from 'lucide-react';

interface TaskCardProps {
  title: string;
  date: string;
  points: number;
  duration: string;
  type: string;
  image: string;
}

export function TaskCard({
  title,
  date,
  points,
  duration,
  type,
  image,
}: TaskCardProps) {
  return (
    <div className="mb-3 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="relative">
        <img
          src={image}
          alt={title}
          className="w-full h-[200px] object-cover rounded-t-lg"
        />
        <button
          type="button"
          className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-lg hover:bg-white"
        >
          <Trash2 className="h-4 w-4 text-gray-600" />
        </button>
      </div>
      <div className="p-3 space-y-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{points} pts</span>
          <span>•</span>
          <span>{duration}</span>
          <span>•</span>
          <span>{type}</span>
        </div>
      </div>
    </div>
  );
}
