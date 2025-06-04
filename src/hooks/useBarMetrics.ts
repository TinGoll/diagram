import { useMemo } from "react";
import type { BarData } from "../types";

type UseBarMetricsReturn = {
    maxValue: number;
    barStep: number;
};

type UseBarMetricsProps<T> = {
    bars: BarData<T>[];
    barWidth: number;
    barSpacing: number;
};

export const useBarMetrics = <T>(
    props: UseBarMetricsProps<T>,
): UseBarMetricsReturn => {
    const { bars, barWidth, barSpacing } = props;
    const maxValue = useMemo(() => {
        if (bars.length === 0) {
            return 1;
        }

        return bars.reduce((max, bar) => Math.max(max, bar.value || 0), 1);
    }, [bars]);

    const barStep = barWidth + barSpacing;

    return {
        maxValue,
        barStep,
    };
};