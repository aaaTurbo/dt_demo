import {ListQuery} from "../types/ListQuery";
import {ListPage} from "../types/ListPage";
import {SelectedItem} from "../types/SelectedItem";
import {StateResponse} from "../types/StateResponse";

const BASE = '/api/v1/item';

function qs(params: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : '';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

export const api = {
    listItems: (q: ListQuery) =>
        request<ListPage<number>>(`/${qs(q as Record<string, unknown>)}`),

    listSelected: (q: ListQuery) =>
        request<ListPage<SelectedItem>>(`/selected${qs(q as Record<string, unknown>)}`),

    getState: (limit = 20) =>
        request<StateResponse>(`/state${qs({ limit })}`),

    addItem: (id: number) =>
        request<{ accepted: true; id: number }>('/', {
            method: 'POST',
            body: JSON.stringify({ id }),
        }),

    selectItem: (id: number, isSelected: boolean) =>
        request<{ accepted: true }>(`/${id}/select`, {
            method: 'POST',
            body: JSON.stringify({ isSelected }),
        }),

    reorderItem: (id: number, sortWeight: number) =>
        request<{ accepted: true }>(`/${id}/reorder`, {
            method: 'POST',
            body: JSON.stringify({ sortWeight }),
        }),
};