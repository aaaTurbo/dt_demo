import type { AppDispatch, RootState } from '../../app/store';
import {
    setLeftSearch,
    setRightSearch,
    applyRemoteFilters,
    setLeftDirection,
    setRightDirection,
    fetchLeft,
    fetchRight,
} from './itemsSlice';
import { Direction } from '../../types/Direction';
import { emitFilters } from '../../socket/socket';

function normalizeSearch(value: string | undefined): string {
    if (!value) return '';
    return String(value).replace(/\D/g, '').slice(0, 9);
}

function currentFilters(getState: () => RootState) {
    const { left, right } = getState().items;
    return { left: left.search, right: right.search };
}

export const changeLeftSearch = (search: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    if (getState().items.left.search === search) return;
    dispatch(setLeftSearch(search));
    emitFilters(currentFilters(getState));
    void dispatch(fetchLeft({ reset: true }));
};

export const changeRightSearch = (search: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    if (getState().items.right.search === search) return;
    dispatch(setRightSearch(search));
    emitFilters(currentFilters(getState));
    void dispatch(fetchRight({ reset: true }));
};

export const applySocketFilters =
    (filters: { left?: string; right?: string; search?: string }) =>
    (dispatch: AppDispatch, getState: () => RootState) => {
        const state = getState().items;
        const left = normalizeSearch(filters.left ?? filters.search ?? state.left.search);
        const right = normalizeSearch(filters.right ?? filters.search ?? state.right.search);
        const leftChanged = state.left.search !== left;
        const rightChanged = state.right.search !== right;
        if (!leftChanged && !rightChanged) return;

        dispatch(applyRemoteFilters({ left, right }));
        if (leftChanged) void dispatch(fetchLeft({ reset: true }));
        if (rightChanged) void dispatch(fetchRight({ reset: true }));
    };

export const changeLeftDirection =
    (direction: Direction) => (dispatch: AppDispatch) => {
        dispatch(setLeftDirection(direction));
        void dispatch(fetchLeft({ reset: true }));
    };

export const changeRightDirection =
    (direction: Direction) => (dispatch: AppDispatch) => {
        dispatch(setRightDirection(direction));
        void dispatch(fetchRight({ reset: true }));
    };
