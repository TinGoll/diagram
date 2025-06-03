import { animate, useMotionValue, type PanInfo } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type UseScrollAndDragReturn = {
    x: ReturnType<typeof useMotionValue<number>>;
    handleDragStart: () => void;
    handleDrag: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    handleDragEnd: (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => void;
    currentScrollX: number;
}

type UseScrollAndDragProps = {
    barStep: number;
    totalWidth: number;
    containerWidth: number;
    isScrollable: boolean;
    dragThreshold: number;
    initialScrollIndex?: number;
};

export const useScrollAndDrag = (props: UseScrollAndDragProps): UseScrollAndDragReturn => {
    const {
        barStep,
        totalWidth,
        containerWidth,
        isScrollable,
        dragThreshold,
        initialScrollIndex = 0,
    } = props;

    const calculateInitialX = useCallback(() => {
        return -Math.min(
            Math.max(0, initialScrollIndex * barStep),
            Math.max(0, totalWidth - containerWidth)
        );
    }, [initialScrollIndex, barStep, totalWidth, containerWidth]);

    const x = useMotionValue(calculateInitialX());
    const [currentScrollX, setCurrentScrollX] = useState(-x.get());

    const didMoveSignificantlyRef = useRef(false);
    const isDraggingOptimizationRef = useRef(false);

    useEffect(() => {
        const unsubscribeX = x.on("change", (latestX) => {
            setCurrentScrollX(-latestX);
        });

        setCurrentScrollX(-calculateInitialX());

        return () => {
            unsubscribeX();
        };
    }, [x, calculateInitialX]);


    const handleDragStart = useCallback(() => {
        if (!isScrollable) return;
        x.stop();
        didMoveSignificantlyRef.current = false;
        isDraggingOptimizationRef.current = true;
    }, [isScrollable, x]);

    const handleDrag = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (!isScrollable || !isDraggingOptimizationRef.current || didMoveSignificantlyRef.current) {
                return;
            }
            const movedDistance = Math.sqrt(info.offset.x ** 2 + info.offset.y ** 2);
            if (movedDistance > dragThreshold) {
                didMoveSignificantlyRef.current = true;
            }
        },
        [isScrollable, dragThreshold]
    );

    const handleDragEnd = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent) => {
            isDraggingOptimizationRef.current = false;
            if (!isScrollable) return;
        },
        [isScrollable]
    );

    useEffect(() => {
        const newInitialX = calculateInitialX();
        if (x.get() !== newInitialX) {
            animate(x, newInitialX, { type: "spring", stiffness: 300, damping: 30 });
        }
    }, [initialScrollIndex, calculateInitialX, x]);

    return {
        x,
        handleDragStart,
        handleDrag,
        handleDragEnd,
        currentScrollX,
    };
}
