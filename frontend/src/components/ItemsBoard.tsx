import { useState, type ReactNode } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    PointerSensor,
    closestCorners,
    pointerWithin,
    useSensor,
    useSensors,
    CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { store } from '../app/store';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
    applyLocalDeselect,
    applyLocalSelect,
    deselectItem,
    reorderItem,
    selectItem,
    selectLeftItems,
    selectRightDirection,
    selectRightItems,
} from '../features/items/itemsSlice';
import { LEFT_PANEL_ID, RIGHT_PANEL_ID } from '../dnd/constants';
import { computeNewWeight } from '../dnd/computeNewWeight';
import { itemDndId, parseItemDndId, parsePanel } from '../dnd/ids';

const collisionDetection: CollisionDetection = (args) => {
    const pointerHits = pointerWithin(args);
    if (pointerHits.length > 0) {
        const items = pointerHits.filter(
            (h) => h.id !== LEFT_PANEL_ID && h.id !== RIGHT_PANEL_ID,
        );
        return items.length > 0 ? items : pointerHits;
    }
    return closestCorners(args);
};

export function ItemsBoard({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
    const leftItems = useAppSelector(selectLeftItems);
    const rightItems = useAppSelector(selectRightItems);
    const rightDirection = useAppSelector(selectRightDirection);
    const [activeId, setActiveId] = useState<number | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const parsedActive = parseItemDndId(String(active.id));
        const activeIdNum =
            parsedActive?.id ??
            (Number.isFinite(Number(active.data.current?.itemId))
                ? Number(active.data.current?.itemId)
                : NaN);
        if (!Number.isFinite(activeIdNum)) return;

        const from =
            parsedActive?.panel ??
            parsePanel(active.id, active.data.current?.panel) ??
            (leftItems.includes(activeIdNum)
                ? 'left'
                : rightItems.some((it) => it.id === activeIdNum)
                  ? 'right'
                  : null);

        const to = parsePanel(over.id, over.data.current?.panel);

        if (!from || !to) return;

        if (from === 'left' && to === 'right') {
            dispatch(applyLocalSelect(activeIdNum));
            void dispatch(selectItem(activeIdNum));

            const overItem = parseItemDndId(String(over.id));
            if (overItem?.panel === 'right') {
                const currentRight = store.getState().items.right.items;
                const oldIndex = currentRight.findIndex((it) => it.id === activeIdNum);
                const newIndex = currentRight.findIndex((it) => it.id === overItem.id);
                if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                    const reordered = arrayMove(currentRight, oldIndex, newIndex);
                    const newWeight = computeNewWeight(
                        reordered,
                        newIndex,
                        store.getState().items.right.direction,
                    );
                    if (newWeight != null) {
                        void dispatch(
                            reorderItem({ id: activeIdNum, sortWeight: newWeight }),
                        );
                    }
                }
            }
            return;
        }

        if (from === 'right' && to === 'left') {
            dispatch(applyLocalDeselect(activeIdNum));
            void dispatch(deselectItem(activeIdNum));
            return;
        }

        if (from === 'right' && to === 'right') {
            if (over.id === RIGHT_PANEL_ID || active.id === over.id) return;

            const overItem = parseItemDndId(String(over.id));
            const overId = overItem?.id ?? Number(over.data.current?.itemId);
            if (!Number.isFinite(overId)) return;

            const oldIndex = rightItems.findIndex((it) => it.id === activeIdNum);
            const newIndex = rightItems.findIndex((it) => it.id === overId);
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

            const reordered = arrayMove(rightItems, oldIndex, newIndex);
            const newWeight = computeNewWeight(reordered, newIndex, rightDirection);
            if (newWeight === null) return;

            void dispatch(
                reorderItem({ id: activeIdNum, sortWeight: newWeight }),
            );
        }
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={(e) => {
                const parsed = parseItemDndId(String(e.active.id));
                const id = parsed?.id ?? Number(e.active.data.current?.itemId);
                setActiveId(Number.isFinite(id) ? id : null);
            }}
            onDragCancel={() => setActiveId(null)}
            onDragEnd={handleDragEnd}
        >
            <div className="board">{children}</div>
            <DragOverlay>
                {activeId != null ? (
                    <div className="row row--overlay">
                        <span className="row__drag">⋮⋮</span>
                        <span className="row__id">#{activeId}</span>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

export { itemDndId };
