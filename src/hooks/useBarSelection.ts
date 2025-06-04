import { useCallback, useState } from 'react';
import type { BarData } from '../types';

type UseBarSelectionReturn<T> = {
    selectedId: string | null;
    handleBarClick: (bar: BarData<T>) => void;
};

type UseBarSelectionProps<T> = {
    externalValue?: string;
    // didMoveSignificantlyRef: RefObject<boolean>; // Удалено
    onBarClick?: (id: string, bar: BarData<T>) => void;
};

export const useBarSelection = <T>(
    props: UseBarSelectionProps<T>,
): UseBarSelectionReturn<T> => {
    const { externalValue, onBarClick } = props;

    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
        null,
    );
    const selectedId = externalValue ?? internalSelectedId;

    const handleBarClick = useCallback(
        (bar: BarData<T>) => {
            // Проверка на didMoveSignificantlyRef больше не нужна,
            // так как onTap из framer-motion вызывается только если не было значительного перетаскивания.
            if (externalValue === undefined) {
                setInternalSelectedId(bar.id);
            }
            onBarClick?.(bar.id, bar);
        },
        [externalValue, onBarClick],
    );

    return {
        selectedId,
        handleBarClick,
    };
};