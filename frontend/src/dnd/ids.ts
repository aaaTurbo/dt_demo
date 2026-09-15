import { LEFT_PANEL_ID, RIGHT_PANEL_ID } from './constants';

export type PanelSide = 'left' | 'right';

export function itemDndId(panel: PanelSide, id: number): string {
    return `${panel}:${id}`;
}

export function parseItemDndId(
    id: string | number,
): { panel: PanelSide; id: number } | null {
    if (typeof id !== 'string') return null;
    const sep = id.indexOf(':');
    if (sep === -1) return null;
    const panel = id.slice(0, sep);
    const num = Number(id.slice(sep + 1));
    if ((panel !== 'left' && panel !== 'right') || !Number.isFinite(num)) {
        return null;
    }
    return { panel, id: num };
}

export function parsePanel(
    overId: string | number,
    dataPanel?: unknown,
): PanelSide | null {
    if (dataPanel === 'left' || dataPanel === 'right') return dataPanel;
    if (overId === LEFT_PANEL_ID) return 'left';
    if (overId === RIGHT_PANEL_ID) return 'right';
    const parsed = parseItemDndId(overId);
    return parsed?.panel ?? null;
}
