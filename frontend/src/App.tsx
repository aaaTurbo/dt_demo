import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './app/hooks';
import {
  bootstrap,
  onAdded,
  onSelectionChanged,
  onReordered,
  selectInitialized,
  selectError,
  clearError,
} from './features/items/itemsSlice';
import { applySocketFilters } from './features/items/itemsActions';
import { connectSocket, disconnectSocket } from './socket/socket';
import { LeftPanel } from './components/LeftPanel';
import { RightPanel } from './components/RightPanel';
import { ItemsBoard } from './components/ItemsBoard';

export default function App() {
  const dispatch = useAppDispatch();
  const initialized = useAppSelector(selectInitialized);
  const error = useAppSelector(selectError);

  useEffect(() => {
    const socket = connectSocket({
      onAdded: (e) => dispatch(onAdded(e)),
      onSelectionChanged: (e) => dispatch(onSelectionChanged(e)),
      onReordered: (e) => dispatch(onReordered(e)),
      onFilters: (e) => dispatch(applySocketFilters(e ?? { left: '', right: '' })),
    });

    void dispatch(bootstrap());

    const onReconnect = () => {
      void dispatch(bootstrap());
    };
    socket.io.on('reconnect', onReconnect);

    return () => {
      socket.io.off('reconnect', onReconnect);
      disconnectSocket();
    };
  }, [dispatch]);

  if (!initialized) return <div className="boot">Загрузка состояния…</div>;

  return (
    <div className="app">
      {error && (
        <div className="toast" onClick={() => dispatch(clearError())}>
          {error} <span className="toast__close">×</span>
        </div>
      )}
      <ItemsBoard>
        <LeftPanel />
        <RightPanel />
      </ItemsBoard>
    </div>
  );
}