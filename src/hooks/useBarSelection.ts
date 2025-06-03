import { useCallback, useState } from "react";
import type { BarData } from "../TimelineChart";

type UseBarSelectionReturn<T = unknown> = {
    selectedId: string | null;
    handleBarClick: (bar: BarData<T>) => void
}

type UseBarSelectionProps<T = unknown> = {
    externalValue?: string;
    onBarClick?: (id: string, bar: BarData<T>) => void;
}

export const useBarSelection = <T = unknown>(props: UseBarSelectionProps<T>): UseBarSelectionReturn<T> => {
    const { externalValue, onBarClick } = props;

    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
    const selectedId = externalValue !== undefined ? externalValue : internalSelectedId;

    const handleBarClick = useCallback(
        (bar: BarData<T>) => {
            if (externalValue === undefined) {
                setInternalSelectedId(bar.id);
            }
            onBarClick?.(bar.id, bar);
        },
        [externalValue, onBarClick]
    );

    return {
        selectedId,
        handleBarClick,
    };
}

