import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type UseScrollAndDragReturn = {
    scrollLeft: number
    isActuallyDragging: boolean
    didMoveSignificantlyRef: RefObject<boolean>
    handleMouseDown: (event: React.MouseEvent) => void
    handleScroll: () => void
}

type UseScrollAndDragProps = {
    containerRef: RefObject<HTMLDivElement | null>;
    barStep: number;
    isScrollable: boolean;
    dragThreshold: number;
};

export const useScrollAndDrag = (props: UseScrollAndDragProps): UseScrollAndDragReturn => {
    const { containerRef, barStep, isScrollable, dragThreshold } = props;

    const [scrollLeft, setScrollLeft] = useState(0);
    const [isActuallyDragging, setIsActuallyDragging] = useState(false);

    const isDraggingRef = useRef(false);
    const didMoveSignificantlyRef = useRef(false);
    const dragStartCoordsRef = useRef({ x: 0, y: 0 });
    const dragStartXRef = useRef(0);
    const scrollStartRef = useRef(0);
    const velocityRef = useRef(0);
    const animationFrame = useRef(0);
    const lastTimestamp = useRef(0);

    const snapToNearestBar = useCallback(() => {
        if (!containerRef.current) return;
        const scroll = containerRef.current.scrollLeft;
        const nearestIndex = Math.round(scroll / barStep);
        const snapTo = nearestIndex * barStep;

        containerRef.current.scrollTo({ left: snapTo, behavior: "smooth" });
    }, [barStep]);

    const applyInertia = useCallback(() => {
        const friction = 0.86;

        const step = (timestamp: number) => {
            if (!containerRef.current) return;

            const dt = timestamp - lastTimestamp.current;
            lastTimestamp.current = timestamp;

            if (Math.abs(velocityRef.current) > 0.1) {
                containerRef.current.scrollLeft += velocityRef.current;
                velocityRef.current *= Math.pow(friction, dt / 16);
                animationFrame.current = requestAnimationFrame(step);
            } else {
                snapToNearestBar();
                velocityRef.current = 0;
            }
        };

        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = requestAnimationFrame((timestamp) => {
            lastTimestamp.current = timestamp;
            step(timestamp);
        });
    }, [snapToNearestBar]);

    const handleScroll = useCallback(() => {
        if (containerRef.current) {
            setScrollLeft(containerRef.current.scrollLeft);
        }
    }, []);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent) => {
            if (!isScrollable || !containerRef.current) {
                return;
            };

            event.preventDefault();
            isDraggingRef.current = true;
            didMoveSignificantlyRef.current = false;
            setIsActuallyDragging(false);

            dragStartCoordsRef.current = { x: event.clientX, y: event.clientY };
            dragStartXRef.current = event.clientX;
            scrollStartRef.current = containerRef.current.scrollLeft;
            velocityRef.current = 0;

            cancelAnimationFrame(animationFrame.current);
            containerRef.current.classList.add("dragging");
        },
        [isScrollable]
    );

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!isDraggingRef.current || !containerRef.current || !isScrollable) {
                return;
            }
            event.preventDefault();

            const dxTotal = event.clientX - dragStartCoordsRef.current.x;

            if (!didMoveSignificantlyRef.current && Math.abs(dxTotal) > dragThreshold) {
                didMoveSignificantlyRef.current = true;
                setIsActuallyDragging(true);
            }

            if (didMoveSignificantlyRef.current) {
                const dx = event.clientX - dragStartXRef.current;
                const newScrollLeft = scrollStartRef.current - dx;

                containerRef.current.scrollLeft = newScrollLeft;
                velocityRef.current = -(event.clientX - dragStartXRef.current) / 2;
                dragStartXRef.current = event.clientX;
                scrollStartRef.current = newScrollLeft;
            }
        },
        [isScrollable, dragThreshold]
    );

    const handleMouseUp = useCallback(() => {
        if (!isDraggingRef.current || !isScrollable || !containerRef.current) {
            return;
        }

        const wasSignificantDrag = didMoveSignificantlyRef.current;
        isDraggingRef.current = false;
        setIsActuallyDragging(false);

        containerRef.current.classList.remove("dragging");

        if (wasSignificantDrag) {
            if (Math.abs(velocityRef.current) > 0.5) {
                applyInertia();
            } else {
                snapToNearestBar();
                velocityRef.current = 0;
            }
        }
    }, [isScrollable, applyInertia, snapToNearestBar]);

    useEffect(() => {
        if (isScrollable) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            cancelAnimationFrame(animationFrame.current);
        };
    }, [isScrollable, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (containerRef.current) {
            setScrollLeft(containerRef.current.scrollLeft);
        }
    }, []);

    return {
        scrollLeft,
        isActuallyDragging,
        didMoveSignificantlyRef,
        handleMouseDown,
        handleScroll,
    };


}
