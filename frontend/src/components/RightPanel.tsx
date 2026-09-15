import React, { useCallback, useMemo, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
    selectRightItems,
    selectRightHasMore,
    selectRightLoading,
    selectRightSearch,
    selectRightDirection,
    fetchRight,
    deselectItem,
    applyLocalDeselect,
} from '../features/items/itemsSlice';
import {
    changeRightSearch,
    changeRightDirection,
} from '../features/items/itemsActions';
import { SearchBar } from './SearchBar';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { SelectedItem } from '../types/SelectedItem';
import { RIGHT_PANEL_ID } from '../dnd/constants';
import { itemDndId } from '../dnd/ids';

interface RowProps {
    item: SelectedItem;
    onRemove: () => void;
}

function SortableRow({ item, onRemove }: RowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: itemDndId('right', item.id),
        data: { panel: 'right', itemId: item.id },
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : 'auto',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="row row--sortable"
            {...attributes}
            {...listeners}
        >
            <span className="row__drag">⋮⋮</span>
            <span className="row__id">#{item.id}</span>
            <button
                className="row__action"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                }}
                title="Убрать из выбранных"
                type="button"
            >
                ×
            </button>
        </div>
    );
}

export function RightPanel() {
    const dispatch = useAppDispatch();

    const items = useAppSelector(selectRightItems);
    const hasMore = useAppSelector(selectRightHasMore);
    const loading = useAppSelector(selectRightLoading);
    const search = useAppSelector(selectRightSearch);
    const direction = useAppSelector(selectRightDirection);

    const listRef = useRef<HTMLDivElement | null>(null);
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: RIGHT_PANEL_ID,
        data: { panel: 'right' },
    });

    const onLoadMore = useCallback(() => {
        void dispatch(fetchRight({ reset: false }));
    }, [dispatch]);

    const sentinelRef = useInfiniteScroll(
        onLoadMore,
        hasMore && !loading,
        listRef as React.RefObject<HTMLDivElement>,
    );

    const ids = useMemo(() => items.map((it) => itemDndId('right', it.id)), [items]);

    return (
        <div className="panel panel--right">
            <div className="panel__header">
                <h2>Выбранные</h2>
                <span className="panel__count">
                    {items.length}
                    {hasMore ? '+' : ''}
                </span>
            </div>

            <SearchBar
                value={search}
                direction={direction}
                onChange={(v) => dispatch(changeRightSearch(v))}
                onDirectionChange={(d) => dispatch(changeRightDirection(d))}
            />

            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <div
                    className={`panel__list ${isOver ? 'panel__list--over' : ''}`}
                    ref={(el) => {
                        listRef.current = el;
                        setDropRef(el);
                    }}
                >
                    {items.length === 0 && !loading && (
                        <div className="panel__empty">
                            Перетащите элементы сюда
                        </div>
                    )}
                    {items.map((item) => (
                        <SortableRow
                            key={item.id}
                            item={item}
                            onRemove={() => {
                                dispatch(applyLocalDeselect(item.id));
                                void dispatch(deselectItem(item.id));
                            }}
                        />
                    ))}
                    <div ref={sentinelRef} style={{ height: 1 }} />
                    {loading && <div className="panel__loading">Загрузка…</div>}
                </div>
            </SortableContext>
        </div>
    );
}
