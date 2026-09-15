import {
    createSlice,
    createAsyncThunk,
    createSelector,
    PayloadAction,
} from '@reduxjs/toolkit';
import { api } from '../../api/client';
import type { RootState } from '../../app/store';
import { Direction } from '../../types/Direction';
import { SelectedItem } from '../../types/SelectedItem';
import { ListPage } from '../../types/ListPage';
import { ItemsAddedEvent } from '../../types/ws/ItemsAddEvent';
import { ItemsSelectionChangedEvent } from '../../types/ws/ItemsSelectionChangedEvent';
import { ItemsReorderedEvent } from '../../types/ws/ItemsReorderEvent';

interface ListState<T> {
    items: T[];
    cursor: number | null;
    hasMore: boolean;
    loading: boolean;
    search: string;
    direction: Direction;
    generation: number;
}

interface ItemsState {
    left: ListState<number>;
    right: ListState<SelectedItem>;
    selectedIds: number[];
    revision: number;
    initialized: boolean;
    error: string | null;
}

export const PAGE_SIZE = 20;

const initialLeft: ListState<number> = {
    items: [],
    cursor: null,
    hasMore: true,
    loading: false,
    search: '',
    direction: 'asc',
    generation: 0,
};

const initialRight: ListState<SelectedItem> = {
    items: [],
    cursor: null,
    hasMore: true,
    loading: false,
    search: '',
    direction: 'asc',
    generation: 0,
};

const initialState: ItemsState = {
    left: initialLeft,
    right: initialRight,
    selectedIds: [],
    revision: 0,
    initialized: false,
    error: null,
};

export function asId(value: unknown): number {
    return Number(value);
}

export function matchesSearch(id: number, search: string): boolean {
    if (!search) return true;
    return String(id).startsWith(search);
}

function sortIds(ids: number[], dir: Direction): number[] {
    return [...ids].sort((a, b) => (dir === 'asc' ? a - b : b - a));
}

function sortSelected(items: SelectedItem[], dir: Direction): SelectedItem[] {
    return [...items].sort((a, b) => {
        const d = a.sortWeight - b.sortWeight;
        return dir === 'asc' ? d : -d;
    });
}

function dedupIds(arr: number[]): number[] {
    const seen = new Set<number>();
    const out: number[] = [];
    for (const raw of arr) {
        const id = asId(raw);
        if (!Number.isFinite(id) || seen.has(id)) continue;
        seen.add(id);
        out.push(id);
    }
    return out;
}

function dedupSelected(items: SelectedItem[]): SelectedItem[] {
    const m = new Map<number, SelectedItem>();
    for (const it of items) {
        const id = asId(it.id);
        if (!Number.isFinite(id)) continue;
        m.set(id, { id, sortWeight: Number(it.sortWeight) || 0 });
    }
    return Array.from(m.values());
}

function resetList<T>(list: ListState<T>) {
    list.items = [];
    list.cursor = null;
    list.hasMore = true;
    list.generation += 1;
}

function belongsInLoadedLeft(
    id: number,
    items: number[],
    dir: Direction,
    hasMore: boolean,
): boolean {
    if (items.length === 0) return true;
    const last = items[items.length - 1];
    const afterLast = dir === 'asc' ? id > last : id < last;
    return !(afterLast && hasMore);
}

function belongsInLoadedRight(
    item: SelectedItem,
    items: SelectedItem[],
    dir: Direction,
    hasMore: boolean,
): boolean {
    if (items.length === 0) return true;
    const last = items[items.length - 1].sortWeight;
    const afterLast = dir === 'asc' ? item.sortWeight > last : item.sortWeight < last;
    return !(afterLast && hasMore);
}

function selectedIdSet(state: ItemsState): Set<number> {
    const ids = new Set<number>(state.selectedIds.map(asId));
    for (const it of state.right.items) ids.add(asId(it.id));
    return ids;
}

function rememberSelected(state: ItemsState, ids: unknown[]) {
    const set = selectedIdSet(state);
    for (const raw of ids) {
        const id = asId(raw);
        if (Number.isFinite(id)) set.add(id);
    }
    state.selectedIds = Array.from(set);
}

function forgetSelected(state: ItemsState, ids: unknown[]) {
    const drop = new Set(ids.map(asId).filter(Number.isFinite));
    state.selectedIds = state.selectedIds.filter((id) => !drop.has(asId(id)));
}

function insertLeft(state: ItemsState, rawId: unknown) {
    const id = asId(rawId);
    if (!Number.isFinite(id)) return;
    if (selectedIdSet(state).has(id)) return;
    if (!matchesSearch(id, state.left.search)) return;

    const existing = new Set(state.left.items.map(asId));
    if (existing.has(id)) return;
    if (!belongsInLoadedLeft(id, state.left.items, state.left.direction, state.left.hasMore)) {
        return;
    }
    existing.add(id);
    state.left.items = sortIds(
        [...existing].filter(Number.isFinite),
        state.left.direction,
    );
}

function insertRight(state: ItemsState, raw: unknown) {
    const src = raw as SelectedItem;
    const id = asId(src?.id);
    if (!Number.isFinite(id)) return;
    const item: SelectedItem = {
        id,
        sortWeight: Number(src.sortWeight) || Date.now(),
    };

    rememberSelected(state, [id]);

    const idx = state.right.items.findIndex((it) => asId(it.id) === id);
    if (idx !== -1) {
        state.right.items[idx].sortWeight = item.sortWeight;
        state.right.items = sortSelected(state.right.items, state.right.direction);
        return;
    }
    if (!matchesSearch(id, state.right.search)) return;
    if (!belongsInLoadedRight(item, state.right.items, state.right.direction, state.right.hasMore)) {
        return;
    }
    state.right.items = sortSelected(
        dedupSelected([...state.right.items, item]),
        state.right.direction,
    );
}

function removeLeft(state: ItemsState, rawId: unknown) {
    const id = asId(rawId);
    state.left.items = state.left.items.filter((x) => asId(x) !== id);
}

function removeRight(state: ItemsState, rawId: unknown) {
    const id = asId(rawId);
    state.right.items = state.right.items.filter((it) => asId(it.id) !== id);
}

export const bootstrap = createAsyncThunk<
    {
        left: ListPage<number>;
        right: ListPage<SelectedItem>;
        revision: number;
        leftSearch: string;
        rightSearch: string;
    },
    void,
    { state: RootState }
>(
    'items/bootstrap',
    async (_, { getState }) => {
        const { left, right } = getState().items;
        const leftSearch = left.search;
        const rightSearch = right.search;
        const [leftPage, rightPage] = await Promise.all([
            api.listItems({
                limit: PAGE_SIZE,
                direction: left.direction,
                search: leftSearch || undefined,
            }),
            api.listSelected({
                limit: PAGE_SIZE,
                direction: right.direction,
                search: rightSearch || undefined,
            }),
        ]);
        return {
            left: leftPage,
            right: rightPage,
            revision: Math.max(leftPage.revision, rightPage.revision),
            leftSearch,
            rightSearch,
        };
    },
);

export const fetchLeft = createAsyncThunk<
    {
        page: ListPage<number>;
        reset: boolean;
        search: string;
        direction: Direction;
        generation: number;
    } | null,
    { reset: boolean },
    { state: RootState }
>(
    'items/fetchLeft',
    async ({ reset }, { getState }) => {
        const { cursor, direction, search, generation } = getState().items.left;
        const page = await api.listItems({
            limit: PAGE_SIZE,
            ...(reset || cursor == null ? {} : { cursor }),
            direction,
            search: search || undefined,
        });
        return { page, reset, search, direction, generation };
    },
    {
        condition: ({ reset }, { getState }) => {
            const st = getState().items.left;
            if (reset) return true;
            return !st.loading && st.hasMore;
        },
    },
);

export const fetchRight = createAsyncThunk<
    {
        page: ListPage<SelectedItem>;
        reset: boolean;
        search: string;
        direction: Direction;
        generation: number;
    } | null,
    { reset: boolean },
    { state: RootState }
>(
    'items/fetchRight',
    async ({ reset }, { getState }) => {
        const { cursor, direction, search, generation } = getState().items.right;
        const page = await api.listSelected({
            limit: PAGE_SIZE,
            ...(reset || cursor == null ? {} : { cursor }),
            direction,
            search: search || undefined,
        });
        return { page, reset, search, direction, generation };
    },
    {
        condition: ({ reset }, { getState }) => {
            const st = getState().items.right;
            if (reset) return true;
            return !st.loading && st.hasMore;
        },
    },
);

export const addItem = createAsyncThunk<number, number>(
    'items/addItem',
    async (id, { rejectWithValue }) => {
        try {
            await api.addItem(id);
            return id;
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    },
);

export const selectItem = createAsyncThunk<number, number>(
    'items/selectItem',
    async (id, { rejectWithValue }) => {
        try {
            await api.selectItem(id, true);
            return id;
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    },
);

export const deselectItem = createAsyncThunk<number, number>(
    'items/deselectItem',
    async (id, { rejectWithValue }) => {
        try {
            await api.selectItem(id, false);
            return id;
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    },
);

export const reorderItem = createAsyncThunk<
    { id: number; sortWeight: number },
    { id: number; sortWeight: number }
>(
    'items/reorderItem',
    async ({ id, sortWeight }, { rejectWithValue }) => {
        try {
            await api.reorderItem(id, sortWeight);
            return { id, sortWeight };
        } catch (err) {
            return rejectWithValue((err as Error).message);
        }
    },
);

const itemsSlice = createSlice({
    name: 'items',
    initialState,
    reducers: {
        setSearch(state, action: PayloadAction<string>) {
            const search = action.payload;
            if (state.left.search === search && state.right.search === search) return;
            state.left.search = search;
            state.right.search = search;
            resetList(state.left);
            resetList(state.right);
        },
        applyRemoteFilters(
            state,
            action: PayloadAction<{ left: string; right: string }>,
        ) {
            const left = action.payload?.left ?? '';
            const right = action.payload?.right ?? '';
            if (state.left.search !== left) {
                state.left.search = left;
                resetList(state.left);
            }
            if (state.right.search !== right) {
                state.right.search = right;
                resetList(state.right);
            }
        },
        setLeftSearch(state, action: PayloadAction<string>) {
            state.left.search = action.payload;
            resetList(state.left);
        },
        setLeftDirection(state, action: PayloadAction<Direction>) {
            state.left.direction = action.payload;
            resetList(state.left);
        },
        setRightSearch(state, action: PayloadAction<string>) {
            state.right.search = action.payload;
            resetList(state.right);
        },
        setRightDirection(state, action: PayloadAction<Direction>) {
            state.right.direction = action.payload;
            resetList(state.right);
        },
        clearError(state) {
            state.error = null;
        },

        applyLocalSelect(state, action: PayloadAction<number>) {
            const id = asId(action.payload);
            rememberSelected(state, [id]);
            removeLeft(state, id);
            insertRight(state, { id, sortWeight: Date.now() });
        },
        applyLocalDeselect(state, action: PayloadAction<number>) {
            const id = asId(action.payload);
            removeRight(state, id);
            forgetSelected(state, [id]);
            insertLeft(state, id);
        },
        applyLocalReorder(
            state,
            action: PayloadAction<{ id: number; sortWeight: number }>,
        ) {
            insertRight(state, action.payload);
        },

        onAdded(state, action: PayloadAction<ItemsAddedEvent>) {
            const { ids, revision } = action.payload;
            if (revision < state.revision) return;
            state.revision = Math.max(state.revision, revision);

            for (const id of ids ?? []) {
                insertLeft(state, id);
            }
        },

        onSelectionChanged(
            state,
            action: PayloadAction<ItemsSelectionChangedEvent>,
        ) {
            const { revision } = action.payload;
            if (revision < state.revision) return;
            state.revision = Math.max(state.revision, revision);

            const selected = Array.isArray(action.payload.selected)
                ? action.payload.selected
                : [];
            const deselected = Array.isArray(action.payload.deselected)
                ? action.payload.deselected
                : [];

            for (const item of selected) {
                rememberSelected(state, [item.id]);
                removeLeft(state, item.id);
                insertRight(state, item);
            }
            for (const id of deselected) {
                removeRight(state, id);
                forgetSelected(state, [id]);
                insertLeft(state, id);
            }
        },

        onReordered(state, action: PayloadAction<ItemsReorderedEvent>) {
            const { items, revision } = action.payload;
            if (revision < state.revision) return;
            state.revision = Math.max(state.revision, revision);

            for (const item of items ?? []) {
                insertRight(state, item);
            }
        },
    },

    extraReducers: (builder) => {
        builder
            .addCase(bootstrap.pending, (state) => {
                state.error = null;
            })
            .addCase(bootstrap.fulfilled, (state, action) => {
                const { left, right, revision, leftSearch, rightSearch } = action.payload;
                const selected = dedupSelected(right.items ?? []);
                const selectedSet = selectedIdSet(state);
                for (const it of selected) selectedSet.add(asId(it.id));

                if (leftSearch === state.left.search) {
                    const incomingLeft = sortIds(
                        dedupIds(left.items ?? []).filter((id) => !selectedSet.has(id)),
                        state.left.direction,
                    );
                    state.left.items = state.left.items.length
                        ? sortIds(
                              dedupIds([...incomingLeft, ...state.left.items]).filter(
                                  (id) => !selectedSet.has(id),
                              ),
                              state.left.direction,
                          )
                        : incomingLeft;
                    state.left.cursor = left.nextCursor;
                    state.left.hasMore = left.nextCursor !== null;
                    state.left.loading = false;
                }

                if (rightSearch === state.right.search) {
                    state.right.items = state.right.items.length
                        ? sortSelected(
                              dedupSelected([...selected, ...state.right.items]),
                              state.right.direction,
                          )
                        : selected;
                    rememberSelected(state, state.right.items.map((it) => it.id));
                    state.right.cursor = right.nextCursor;
                    state.right.hasMore = right.nextCursor !== null;
                    state.right.loading = false;
                }

                state.revision = Math.max(state.revision, revision);
                state.initialized = true;
            })
            .addCase(bootstrap.rejected, (state, action) => {
                state.error = action.error.message ?? 'bootstrap failed';
            });

        builder
            .addCase(fetchLeft.pending, (state, action) => {
                if (action.meta.arg.reset) {
                    state.left.loading = true;
                } else {
                    state.left.loading = true;
                }
            })
            .addCase(fetchLeft.fulfilled, (state, action) => {
                state.left.loading = false;
                if (!action.payload) return;

                const { page, reset, search, direction, generation } = action.payload;
                if (
                    search !== state.left.search ||
                    direction !== state.left.direction ||
                    generation !== state.left.generation
                ) {
                    return;
                }

                if (!reset && page.revision < state.revision && state.left.items.length > 0) {
                    return;
                }

                const incoming = dedupIds(page.items);
                const selected = selectedIdSet(state);
                const merged = sortIds(
                    (reset ? incoming : dedupIds([...state.left.items, ...incoming])).filter(
                        (id) => !selected.has(id),
                    ),
                    state.left.direction,
                );

                state.left.items = merged;
                state.left.cursor = page.nextCursor;
                state.left.hasMore = page.nextCursor !== null;
                state.revision = Math.max(state.revision, page.revision);
            })
            .addCase(fetchLeft.rejected, (state, action) => {
                state.left.loading = false;
                state.left.hasMore = true;
                state.error = action.error.message ?? 'fetchLeft failed';
            });

        builder
            .addCase(fetchRight.pending, (state) => {
                state.right.loading = true;
            })
            .addCase(fetchRight.fulfilled, (state, action) => {
                state.right.loading = false;
                if (!action.payload) return;

                const { page, reset, search, direction, generation } = action.payload;
                if (
                    search !== state.right.search ||
                    direction !== state.right.direction ||
                    generation !== state.right.generation
                ) {
                    return;
                }

                if (!reset && page.revision < state.revision && state.right.items.length > 0) {
                    return;
                }

                state.right.items = reset
                    ? dedupSelected(page.items)
                    : dedupSelected([...state.right.items, ...page.items]);
                rememberSelected(state, state.right.items.map((it) => it.id));
                state.right.cursor = page.nextCursor;
                state.right.hasMore = page.nextCursor !== null;
                state.revision = Math.max(state.revision, page.revision);
            })
            .addCase(fetchRight.rejected, (state, action) => {
                state.right.loading = false;
                state.right.hasMore = true;
                state.error = action.error.message ?? 'fetchRight failed';
            });

        builder
            .addCase(addItem.fulfilled, (state, action) => {
                insertLeft(state, action.payload);
            })
            .addCase(addItem.rejected, (state, action) => {
                state.error =
                    (action.payload as string) ?? action.error.message ?? 'addItem failed';
            })
            .addCase(selectItem.rejected, (state, action) => {
                const id = asId(action.meta.arg);
                removeRight(state, id);
                forgetSelected(state, [id]);
                insertLeft(state, id);
                state.error =
                    (action.payload as string) ?? action.error.message ?? 'selectItem failed';
            })
            .addCase(deselectItem.rejected, (state, action) => {
                const id = asId(action.meta.arg);
                rememberSelected(state, [id]);
                removeLeft(state, id);
                insertRight(state, { id, sortWeight: Date.now() });
                state.error =
                    (action.payload as string) ??
                    action.error.message ??
                    'deselectItem failed';
            })
            .addCase(reorderItem.pending, (state, action) => {
                insertRight(state, action.meta.arg);
            })
            .addCase(reorderItem.rejected, (state, action) => {
                state.error =
                    (action.payload as string) ??
                    action.error.message ??
                    'reorderItem failed';
            });
    },
});

export const {
    setSearch,
    applyRemoteFilters,
    setLeftSearch,
    setLeftDirection,
    setRightSearch,
    setRightDirection,
    clearError,
    applyLocalSelect,
    applyLocalDeselect,
    applyLocalReorder,
    onAdded,
    onSelectionChanged,
    onReordered,
} = itemsSlice.actions;

export const selectLeft = (s: RootState) => s.items.left;
export const selectRight = (s: RootState) => s.items.right;
export const selectRevision = (s: RootState) => s.items.revision;
export const selectInitialized = (s: RootState) => s.items.initialized;
export const selectError = (s: RootState) => s.items.error;
export const selectSharedSearch = (s: RootState) => s.items.left.search;

export const selectSelectedIds = (s: RootState) => s.items.selectedIds;

export const selectLeftItems = createSelector(
    [selectLeft, selectRight, selectSelectedIds],
    (l, r, selectedIds) => {
        const selected = new Set(selectedIds.map(asId));
        for (const it of r.items) selected.add(asId(it.id));
        return dedupIds(l.items).filter(
            (id) => !selected.has(id) && matchesSearch(id, l.search),
        );
    },
);
export const selectLeftHasMore = createSelector([selectLeft], (l) => l.hasMore);
export const selectLeftLoading = createSelector([selectLeft], (l) => l.loading);
export const selectLeftSearch = createSelector([selectLeft], (l) => l.search);
export const selectLeftDirection = createSelector([selectLeft], (l) => l.direction);

export const selectRightItems = createSelector([selectRight], (r) =>
    dedupSelected(r.items).filter((it) => matchesSearch(asId(it.id), r.search)),
);
export const selectRightHasMore = createSelector([selectRight], (r) => r.hasMore);
export const selectRightLoading = createSelector([selectRight], (r) => r.loading);
export const selectRightSearch = createSelector([selectRight], (r) => r.search);
export const selectRightDirection = createSelector([selectRight], (r) => r.direction);

export default itemsSlice.reducer;
