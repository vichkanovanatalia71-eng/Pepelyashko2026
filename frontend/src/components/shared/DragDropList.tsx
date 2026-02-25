import { useState, useRef, useCallback } from "react";
import { GripVertical } from "lucide-react";

interface DragDropListProps<T> {
  items: T[];
  keyExtractor: (item: T) => string | number;
  onReorder: (reordered: T[]) => void;
  renderItem: (item: T, index: number, dragHandleProps: DragHandleProps) => React.ReactNode;
  className?: string;
}

interface DragHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  className: string;
  role: string;
  "aria-label": string;
  tabIndex: number;
}

export function DragDropList<T>({
  items,
  keyExtractor,
  onReorder,
  renderItem,
  className = "",
}: DragDropListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const handleDragStart = useCallback(
    (idx: number) => {
      setDragIndex(idx);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, idx: number) => {
      e.preventDefault();
      if (dragIndex === null || dragIndex === idx) return;
      setOverIndex(idx);
    },
    [dragIndex]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (dragIndex === null || overIndex === null || dragIndex === overIndex) {
        setDragIndex(null);
        setOverIndex(null);
        return;
      }

      const reordered = [...items];
      const [removed] = reordered.splice(dragIndex, 1);
      reordered.splice(overIndex, 0, removed);
      onReorder(reordered);
      setDragIndex(null);
      setOverIndex(null);
    },
    [items, dragIndex, overIndex, onReorder]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  return (
    <div className={`space-y-1 ${className}`}>
      {items.map((item, idx) => {
        const isDragging = idx === dragIndex;
        const isOver = idx === overIndex;

        const dragHandleProps: DragHandleProps = {
          onMouseDown: () => handleDragStart(idx),
          onTouchStart: () => handleDragStart(idx),
          className:
            "cursor-grab active:cursor-grabbing text-gray-600 hover:text-gray-400 transition-colors p-1 -ml-1 touch-none select-none",
          role: "button",
          "aria-label": "Перетягнути для зміни порядку",
          tabIndex: 0,
        };

        return (
          <div
            key={keyExtractor(item)}
            ref={isDragging ? dragNode : undefined}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={`transition-all duration-200 rounded-xl
                       ${isDragging ? "opacity-40 scale-[0.97]" : "opacity-100"}
                       ${isOver ? "ring-2 ring-accent-400/40 ring-offset-1 ring-offset-transparent" : ""}`}
          >
            {renderItem(item, idx, dragHandleProps)}
          </div>
        );
      })}
    </div>
  );
}

export function DragHandle(props: DragHandleProps) {
  return (
    <span {...props}>
      <GripVertical size={16} />
    </span>
  );
}
