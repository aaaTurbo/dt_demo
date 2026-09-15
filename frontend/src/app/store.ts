import { configureStore } from '@reduxjs/toolkit';
import itemsReducer from '../features/items/itemsSlice';

export const store = configureStore({
    reducer: {
        items: itemsReducer,
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;