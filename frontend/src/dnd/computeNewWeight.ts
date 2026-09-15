import { SelectedItem } from '../types/SelectedItem';
import { Direction } from '../types/Direction';

export function computeNewWeight(
    reordered: SelectedItem[],
    newIndex: number,
    direction: Direction,
): number | null {
    const moved = reordered[newIndex];
    if (!moved) return null;

    const prev = reordered[newIndex - 1] ?? null;
    const next = reordered[newIndex + 1] ?? null;

    if (!prev && next) {
        const weights = reordered.map((it) => it.sortWeight);
        return direction === 'asc'
            ? Math.min(...weights) - 1
            : Math.max(...weights) + 1;
    }
    if (prev && !next) {
        const weights = reordered.map((it) => it.sortWeight);
        return direction === 'asc'
            ? Math.max(...weights) + 1
            : Math.min(...weights) - 1;
    }
    if (prev && next) {
        return (prev.sortWeight + next.sortWeight) / 2;
    }
    return null;
}
