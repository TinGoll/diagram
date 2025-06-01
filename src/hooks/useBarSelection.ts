import { useCallback, useState, type RefObject } from "react";
import type { BarData } from "../TimelineChart";

type UseBarSelectionReturn<T = unknown> = {
    selectedId: string | null;
    handleBarClick: (bar: BarData<T>) => void
}

type UseBarSelectionProps<T = unknown> = {
    externalValue?: string;
    onBarClick?: (id: string, bar: BarData<T>) => void;
    didMoveSignificantlyRef: RefObject<boolean>;
}

export const useBarSelection = <T = unknown>(props: UseBarSelectionProps<T>): UseBarSelectionReturn<T> => {
    const { externalValue, onBarClick, didMoveSignificantlyRef } = props;

    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
    const selectedId = externalValue ?? internalSelectedId;

    const handleBarClick = useCallback(
        (bar: BarData<T>) => {
            if (didMoveSignificantlyRef.current) {
                return;
            }

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

