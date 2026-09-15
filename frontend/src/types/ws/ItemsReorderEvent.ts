import {SelectedItem} from "../SelectedItem";

export interface ItemsReorderedEvent {
    items: SelectedItem[];
    revision: number;
}