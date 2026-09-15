export interface ListPage<T> {
    items: T[];
    nextCursor: number | null;
    revision: number;
}