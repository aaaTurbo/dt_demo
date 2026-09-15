import { useEffect, useRef, RefObject } from 'react';

export function useInfiniteScroll(
    onLoadMore: () => void,
    enabled: boolean,
    rootRef?: RefObject<HTMLElement>,
): RefObject<HTMLDivElement | null> {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const loadingLock = useRef(false);

    useEffect(() => {
        if (!enabled) {
            loadingLock.current = false;
            return;
        }
        const el = sentinelRef.current;
        if (!el) return;

        const root = rootRef?.current ?? null;

        const trigger = () => {
            if (loadingLock.current) return;
            loadingLock.current = true;
            onLoadMore();
        };

        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) trigger();
            },
            {
                root,
                rootMargin: '200px 0px',
                threshold: 0,
            },
        );
        obs.observe(el);

        const rect = el.getBoundingClientRect();
        const rootRect = root
            ? root.getBoundingClientRect()
            : { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };

        const visible =
            rect.top < rootRect.bottom + 200 &&
            rect.bottom > rootRect.top - 200;

        if (visible) trigger();

        return () => {
            obs.disconnect();
            loadingLock.current = false;
        };
    }, [enabled, onLoadMore, rootRef]);

    return sentinelRef;
}
