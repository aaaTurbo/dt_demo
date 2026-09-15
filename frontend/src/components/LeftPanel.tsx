import { useCallback, useRef } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
    selectLeftItems,
    selectLeftHasMore,
    selectLeftLoading,
    selectLeftSearch,
    selectLeftDirection,
    fetchLeft,
    selectItem,
    applyLocalSelect,
} from '../features/items/itemsSlice';
import {
    changeLeftSearch,
    changeLeftDirection,
} from '../features/items/itemsActions';
import { SearchBar } from './SearchBar';
import { AddItemForm } from './AddItemForm';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { LEFT_PANEL_ID } from '../dnd/constants';
import { itemDndId } from '../dnd/ids';

function DraggableLeftRow({ id }: { id: number }) {
    const dispatch = useAppDispatch();
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: itemDndId('left', id),
        data: { panel: 'left', itemId: id },
    });

    return (
        <div
            ref={setNodeRef}
            className={`row row--clickable ${isDragging ? 'row--dragging' : ''}`}
            style={{ opacity: isDragging ? 0.4 : 1 }}
            {...attributes}
            {...listeners}
            onClick={() => {
                dispatch(applyLocalSelect(id));
                void dispatch(selectItem(id));
            }}
        >
            <span className="row__drag">⋮⋮</span>
            <span className="row__id">#{id}</span>
            <span className="row__hint">→</span>
        </div>
    );
}

export function LeftPanel() {
    const dispatch = useAppDispatch();

    const items = useAppSelector(selectLeftItems);
    const hasMore = useAppSelector(selectLeftHasMore);
    const loading = useAppSelector(selectLeftLoading);
    const search = useAppSelector(selectLeftSearch);
    const direction = useAppSelector(selectLeftDirection);

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: LEFT_PANEL_ID,
        data: { panel: 'left' },
    });

    const onLoadMore = useCallback(() => {
        void dispatch(fetchLeft({ reset: false }));
    }, [dispatch]);

    const sentinelRef = useInfiniteScroll(
        onLoadMore,
        hasMore && !loading,
        scrollRef as React.RefObject<HTMLDivElement>,
    );

    return (
        <div className="panel panel--left">
            <div className="panel__header">
                <h2>Доступные</h2>
                <span className="panel__count">
                    {items.length}
                    {hasMore ? '+' : ''}
                </span>
            </div>

            <SearchBar
                value={search}
                direction={direction}
                onChange={(v) => dispatch(changeLeftSearch(v))}
                onDirectionChange={(d) => dispatch(changeLeftDirection(d))}
            />

            <AddItemForm />

            <div
                className={`panel__list ${isOver ? 'panel__list--over' : ''}`}
                ref={(el) => {
                    scrollRef.current = el;
                    setDropRef(el);
                }}
            >
                {items.length === 0 && !loading && (
                    <div className="panel__empty">Нет элементов</div>
                )}
                {items.map((id) => (
                    <DraggableLeftRow key={id} id={id} />
                ))}
                <div ref={sentinelRef} style={{ height: 1 }} />
                {loading && <div className="panel__loading">Загрузка…</div>}
            </div>
        </div>
    );
}
