import { useMemo } from "react";
import type { BarData } from "../TimelineChart";

type UseBarMetricsReturn = {
    maxValue: number;
    barStep: number;
}

type UseBarMetricsProps<T = unknown> = {
    bars: BarData<T>[];
    barWidth: number;
}

export const useBarMetrics = <T = unknown>(props: UseBarMetricsProps<T>): UseBarMetricsReturn => {
    const { barWidth, bars } = props;
    const maxValue = useMemo(() => {
        if (bars.length === 0) {
            return 1;
        }
        return bars.reduce((max, bar) => Math.max(max, bar.value || 0), 1);
    }, [bars]);

    const barSpacing = 2;
    const barStep = barWidth + barSpacing;
    return {
        maxValue, barStep
    }

}