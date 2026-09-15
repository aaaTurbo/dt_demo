import {SelectedItem} from "../SelectedItem";

export interface ItemsSelectionChangedEvent {
    selected: SelectedItem[];
    deselected: number[];
    revision: number;
}