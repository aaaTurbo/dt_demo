import {SelectedItem} from "./SelectedItem";

export interface StateResponse {
    left: { items: number[]; nextCursor: number | null };
    right: { items: SelectedItem[]; nextCursor: number | null };
    revision: number;
}