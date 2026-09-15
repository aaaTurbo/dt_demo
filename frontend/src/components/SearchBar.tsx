import { useEffect, useRef, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { Direction } from '../types/Direction';

interface Props {
    value: string;
    direction: Direction;
    onChange: (v: string) => void;
    onDirectionChange: (d: Direction) => void;
    placeholder?: string;
}

export function SearchBar({
    value,
    direction,
    onChange,
    onDirectionChange,
    placeholder,
}: Props) {
    const [local, setLocal] = useState(value);
    const debounced = useDebounce(local, 300);
    const lastEmitted = useRef(value);

    useEffect(() => {
        setLocal(value);
        lastEmitted.current = value;
    }, [value]);

    useEffect(() => {
        if (debounced === lastEmitted.current) return;
        lastEmitted.current = debounced;
        onChange(debounced);
    }, [debounced]);

    return (
        <div className="search-bar">
            <input
                className="search-bar__input"
                type="text"
                inputMode="numeric"
                placeholder={placeholder ?? 'Поиск по ID (префикс)'}
                value={local}
                onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
            />
            <button
                className="search-bar__dir"
                onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
                title={direction === 'asc' ? 'По возрастанию' : 'По убыванию'}
                type="button"
            >
                {direction === 'asc' ? '↑' : '↓'}
            </button>
        </div>
    );
}
