import { io, Socket } from 'socket.io-client';
import {ItemsAddedEvent} from "../types/ws/ItemsAddEvent";
import {ItemsSelectionChangedEvent} from "../types/ws/ItemsSelectionChangedEvent";
import {ItemsReorderedEvent} from "../types/ws/ItemsReorderEvent";
import {ItemsFiltersEvent} from "../types/ws/ItemsFiltersEvent";

export interface WsHandlers {
    onAdded: (e: ItemsAddedEvent) => void;
    onSelectionChanged: (e: ItemsSelectionChangedEvent) => void;
    onReordered: (e: ItemsReorderedEvent) => void;
    onFilters: (e: ItemsFiltersEvent) => void;
}

let socket: Socket | null = null;

function bindHandlers(target: Socket, handlers: WsHandlers): void {
    target.removeAllListeners('items:added');
    target.removeAllListeners('items:selection-changed');
    target.removeAllListeners('items:reordered');
    target.removeAllListeners('items:filters');
    target.off('connect', requestFilters);

    target.on('items:added', handlers.onAdded);
    target.on('items:selection-changed', handlers.onSelectionChanged);
    target.on('items:reordered', handlers.onReordered);
    target.on('items:filters', handlers.onFilters);
    target.on('connect', requestFilters);
}

function requestFilters(): void {
    socket?.emit('items:filters:get');
}

export function connectSocket(handlers: WsHandlers): Socket {
    if (socket) {
        bindHandlers(socket, handlers);
        if (socket.connected) requestFilters();
        return socket;
    }

    socket = io('', {
        path: '/ws/',
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });

    bindHandlers(socket, handlers);

    socket.on('connect', () => console.log('[ws] connected', socket?.id));
    socket.on('disconnect', (reason) => console.warn('[ws] disconnected:', reason));
    socket.on('connect_error', (err) => console.error('[ws] connect_error:', err.message));

    socket.onAny((event, ...args) => {
        if (event.startsWith('items:')) console.log('[ws]', event, args);
    });

    socket.connect();
    return socket;
}

export function emitFilters(filters: ItemsFiltersEvent): void {
    socket?.emit('items:filters', {
        left: filters.left ?? '',
        right: filters.right ?? '',
    });
}

export function disconnectSocket(): void {
    if (!socket) return;
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
}
