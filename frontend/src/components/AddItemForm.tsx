import { FormEvent, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { addItem, selectError, clearError } from '../features/items/itemsSlice';

export function AddItemForm() {
    const [value, setValue] = useState('');
    const dispatch = useAppDispatch();
    const error = useAppSelector(selectError);

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        const id = Number(value);
        if (!Number.isInteger(id) || id <= 0) return;

        dispatch(clearError());
        await dispatch(addItem(id));
        setValue('');
    }

    return (
        <form className="add-form" onSubmit={onSubmit}>
            <input
                className="add-form__input"
                type="text"
                inputMode="numeric"
                placeholder="Новый ID"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 9))}
            />
            <button className="add-form__btn" type="submit" disabled={!value}>
                Добавить
            </button>
            {error && <div className="add-form__error">{error}</div>}
        </form>
    );
}