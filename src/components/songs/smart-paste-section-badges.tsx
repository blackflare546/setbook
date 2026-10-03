"use client";

import { useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import {
  duplicateArrangementSection,
  removeArrangementSection,
  renameArrangementSection,
  reorderArrangement,
  SECTION_TYPE_OPTIONS,
  type ArrangedSection,
  type SectionArrangement,
} from "@/core/parser/section-arrangement";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function SortableSectionBadge({
  item,
  expanded,
  isDropTarget,
  suppressClick,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
}: {
  item: ArrangedSection;
  expanded: boolean;
  isDropTarget: boolean;
  suppressClick: () => boolean;
  onToggle: () => void;
  onChange: (typeIndex: number) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <Badge
      ref={setNodeRef}
      data-testid={`section-badge-${item.section.title}`}
      data-drop-target={isDropTarget || undefined}
      className={cn(
        "gap-1 p-1",
        expanded && "w-full flex-wrap rounded-xl sm:w-auto",
        isDragging && "z-10 opacity-50",
        isDropTarget && "ring-2 ring-indigo-500 ring-offset-2",
      )}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button
        type="button"
        className="flex min-h-9 min-w-0 touch-none items-center gap-1 rounded-full px-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        aria-label={`${item.section.title} section. Drag to reorder or click to edit.`}
        aria-expanded={expanded}
        onClick={() => {
          if (!suppressClick()) onToggle();
        }}
        {...attributes}
        {...listeners}
      >
        <GripVertical
          aria-hidden="true"
          className="shrink-0 opacity-60"
          size={15}
        />
        <span className="truncate">{item.section.title}</span>
      </button>
      {expanded && (
        <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center gap-1.5">
          <select
            aria-label={`Change ${item.section.title} section type`}
            className="h-10 min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white px-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-800 dark:bg-slate-950 dark:text-slate-100 sm:w-36 sm:flex-none"
            value={SECTION_TYPE_OPTIONS.findIndex(
              (option) => option.type === item.section.type,
            )}
            onChange={(event) => onChange(Number(event.target.value))}
          >
            {SECTION_TYPE_OPTIONS.map((option, index) => (
              <option key={option.type} value={index}>
                {option.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label={`Remove ${item.section.title}`}
            className="flex h-10 min-w-10 items-center justify-center rounded-lg text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300 dark:hover:bg-rose-950"
            onClick={onRemove}
          >
            <X size={17} />
          </button>
          <button
            type="button"
            aria-label={`Duplicate ${item.section.title}`}
            className="flex h-10 min-w-10 items-center justify-center rounded-lg text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-300 dark:hover:bg-indigo-900"
            onClick={onDuplicate}
          >
            <Plus size={17} />
          </button>
        </div>
      )}
    </Badge>
  );
}

export function SmartPasteSectionBadges({
  arrangement,
  onChange,
}: {
  arrangement: SectionArrangement;
  onChange: (arrangement: SectionArrangement) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const suppressClickId = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (!arrangement.sections.length) return null;

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    suppressClickId.current = id;
    setActiveId(id);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const active = String(event.active.id);
    const over = event.over ? String(event.over.id) : null;
    setActiveId(null);
    setOverId(null);
    if (over && active !== over)
      onChange(reorderArrangement(arrangement, active, over));
    window.setTimeout(() => {
      if (suppressClickId.current === active) suppressClickId.current = null;
    }, 0);
  }

  function handleDragCancel() {
    suppressClickId.current = null;
    setActiveId(null);
    setOverId(null);
  }

  return (
    <div className="mb-4" aria-label="Song section arrangement">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Sections</p>
        <p className="text-xs text-slate-500">Drag to rearrange</p>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={arrangement.sections.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <div
            data-testid="section-badge-list"
            className="flex max-w-full flex-wrap items-start gap-2 overflow-visible rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950"
          >
            {arrangement.sections.map((item) => (
              <SortableSectionBadge
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                isDropTarget={Boolean(
                  activeId && overId === item.id && activeId !== item.id,
                )}
                suppressClick={() => suppressClickId.current === item.id}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === item.id ? null : item.id,
                  )
                }
                onChange={(typeIndex) => {
                  const option = SECTION_TYPE_OPTIONS[typeIndex];
                  if (option) {
                    onChange(
                      renameArrangementSection(
                        arrangement,
                        item.id,
                        option.type,
                        option.title,
                      ),
                    );
                  }
                }}
                onRemove={() => {
                  setExpandedId(null);
                  onChange(removeArrangementSection(arrangement, item.id));
                }}
                onDuplicate={() =>
                  onChange(duplicateArrangementSection(arrangement, item.id))
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
