import { MoreHorizontal } from 'lucide-react';
import { TaskCard } from './TaskCard';

interface BoardColumnProps {
  title: string;
  count: number;
  subtitle?: string;
  color: string;
  tasks: {
    title: string;
    date: string;
    points: number;
    duration: string;
    type: string;
    image: string;
  }[];
}

export function BoardColumn({
  title,
  count,
  subtitle,
  color,
  tasks,
}: BoardColumnProps) {
  return (
    <div className="w-[300px] shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-4 rounded-full ${color}`} />
          <h2 className="font-medium">
            {title} <span className="ml-1 text-gray-500">{count}</span>
          </h2>
          {subtitle && (
            <span className="text-xs text-gray-500">({subtitle})</span>
          )}
        </div>
        <button className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <TaskCard key={i} {...task} />
        ))}
      </div>
    </div>
  );
}
