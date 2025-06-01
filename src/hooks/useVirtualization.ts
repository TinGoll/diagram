import { useMemo } from "react";

type UseVirtualizationReturn = {
    startIndex: number;
    endIndex: number;
}

type UseVirtualizationProps = {
    scrollLeft: number;
    containerWidth: number;
    barStep: number;
    barsLength: number;
    overscan: number;
}

export const useVirtualization = (props: UseVirtualizationProps): UseVirtualizationReturn => {
    const { scrollLeft, containerWidth, barStep, barsLength, overscan } = props;

    const barsPerView = useMemo(
        () => Math.ceil(containerWidth / barStep) || 1,
        [containerWidth, barStep]
    );

    const startIndex = useMemo(
        () => Math.max(0, Math.floor(scrollLeft / barStep) - overscan),
        [scrollLeft, barStep, overscan]
    );

    const endIndex = useMemo(
        () => Math.min(barsLength, startIndex + barsPerView + overscan * 2),
        [barsLength, startIndex, barsPerView, overscan]
    );

    return {
        startIndex,
        endIndex,
    };
}