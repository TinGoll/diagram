import styled from "@emotion/styled";
import { debounce } from "es-toolkit";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FC,
} from "react";

export type BarData<T = unknown> = {
  id: string;
  value: number;
  color: string;
  meta?: T;
};

type Props<T = unknown> = {
  bars: BarData<T>[];
  value?: string;
  maxHeight?: number;
  barWidth?: number;
  minBarHeight?: number;
  overscan?: number;
  selectedColor?: string;
  dragThreshold?: number;
  onBarClick?: (id: string, bar: BarData<T>) => void;
  getBarHighlightColor?: (bar: BarData) => string;
};

const Wrapper = styled.div<{ isScrollable: boolean }>`
  overflow-x: scroll;
  overflow-y: hidden;
  user-select: none;
  cursor: ${({ isScrollable }) => (isScrollable ? "grab" : "default")};
  height: 100%;

  &.dragging {
    cursor: ${({ isScrollable }) => (isScrollable ? "grabbing" : "default")};
  }

  &:focus {
    outline: none;
  }

  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const Inner = styled.div<{ width: number }>`
  position: relative;
  height: 100%;
  width: ${({ width }) => width}px;
`;

const Bar = styled.div<{
  height: number;
  left: number;
  color: string;
  barWidth: number;
  hitboxWidth: number;
  isContainerActuallyDragging: boolean;
}>`
  position: absolute;
  bottom: 0;
  left: ${({ left }) => left}px;
  width: ${({ barWidth }) => barWidth}px;
  height: ${({ height }) => height}px;
  background-color: ${({ color }) => color};
  border-radius: ${({ barWidth, height }) => Math.min(barWidth, height) / 2}px;
  cursor: ${({ isContainerActuallyDragging }) => (isContainerActuallyDragging ? "grabbing" : "pointer")};

  &:hover {
    opacity: 0.8;
  }
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: ${({ hitboxWidth }) => `${hitboxWidth}px`};
    height: 100%;
    cursor: inherit;
  }
`;

export const TimelineChart: FC<Props> = ({
  bars,
  value: externalValue,
  maxHeight = 36,
  barWidth = 5,
  minBarHeight = 12,
  overscan = 10,
  selectedColor = "#0BA5BE",
  dragThreshold = 5,
  onBarClick,
  getBarHighlightColor,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(
    null
  );
  const selectedId = externalValue ?? internalSelectedId;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);
  const [isActuallyDragging, setIsActuallyDragging] = useState(false); 

  const maxValue = useMemo(() => {
    if (bars.length === 0) return 1;
    return bars.reduce((max, bar) => Math.max(max, bar.value || 0), 1);
  }, [bars]);

  const barSpacing = 2;
  const barStep = barWidth + barSpacing;
  const totalWidth = bars.length * barStep;

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
    animationFrame.current = requestAnimationFrame((ts) => {
      lastTimestamp.current = ts;
      step(ts);
    });
  }, [snapToNearestBar]);

  const onScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollLeft(containerRef.current.scrollLeft);
    }
  }, []);

  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const current = containerRef.current;
      setContainerWidth(current.offsetWidth);
      setIsScrollable(current.scrollWidth > current.clientWidth);
    }
  }, []);

  const debouncedUpdateContainerWidth = useMemo(
    () => debounce(updateContainerWidth, 50),
    [updateContainerWidth]
  );

  useEffect(() => {
    updateContainerWidth();
    window.addEventListener("resize", debouncedUpdateContainerWidth);
    return () => {
      window.removeEventListener("resize", debouncedUpdateContainerWidth);
      debouncedUpdateContainerWidth.cancel?.();
    };
  }, [debouncedUpdateContainerWidth, updateContainerWidth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isScrollable) {
        return;
      }

      e.preventDefault();

      isDraggingRef.current = true;
      didMoveSignificantlyRef.current = false;
      dragStartCoordsRef.current = { x: e.clientX, y: e.clientY };

      dragStartXRef.current = e.clientX;
      scrollStartRef.current = containerRef.current?.scrollLeft || 0;
      velocityRef.current = 0;

      cancelAnimationFrame(animationFrame.current);
      if (containerRef.current) {
        containerRef.current.classList.add("dragging");
      }
    },
    [isScrollable]
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current || !isScrollable) {
        return;
      }

      const dxTotal = e.clientX - dragStartCoordsRef.current.x;

      e.preventDefault();

      if (!didMoveSignificantlyRef.current) {
        if (Math.abs(dxTotal) > dragThreshold) {
          didMoveSignificantlyRef.current = true;
          setIsActuallyDragging(true);
        }
      }

      if (didMoveSignificantlyRef.current) {
        const dx = e.clientX - dragStartXRef.current;
        const newScrollLeft = scrollStartRef.current - dx;

        containerRef.current.scrollLeft = newScrollLeft;
        velocityRef.current = -(e.clientX - dragStartXRef.current) / 2;
        dragStartXRef.current = e.clientX;
        scrollStartRef.current = newScrollLeft;
      }
    },
    [isScrollable]
  ); // Добавили isScrollable

  const onMouseUp = useCallback(() => {
    if (!isDraggingRef.current || !isScrollable) {
      return;
    }

    const wasSignificantDrag = didMoveSignificantlyRef.current;
    isDraggingRef.current = false;
    setIsActuallyDragging(false); 

    if (containerRef.current) {
      containerRef.current.classList.remove("dragging");
    }

    if (wasSignificantDrag) {
      if (Math.abs(velocityRef.current) > 0.5) {
        applyInertia();
      } else {
        snapToNearestBar();
        velocityRef.current = 0;
      }
    }
  }, [applyInertia, isScrollable, snapToNearestBar]);

  useEffect(() => {
    if (isScrollable) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(animationFrame.current);
    };
  }, [onMouseMove, onMouseUp, applyInertia, isScrollable]);

  const barsPerView = Math.ceil(containerWidth / barStep) || 1;
  const startIndex = Math.max(0, Math.floor(scrollLeft / barStep) - overscan);
  const endIndex = Math.min(
    bars.length,
    startIndex + barsPerView + overscan * 2
  );

  const handleClick = (bar: BarData) => {
    if (didMoveSignificantlyRef.current) {
      return;
    }

    if (externalValue === undefined) {
      setInternalSelectedId(bar.id);
    }
    onBarClick?.(bar.id, bar);
  };

  return (
    <Wrapper
      ref={containerRef}
      onScroll={onScroll}
      onMouseDown={onMouseDown}
      style={{ height: `${maxHeight}px` }}
      isScrollable={isScrollable}
    >
      <Inner width={totalWidth}>
        {bars.slice(startIndex, endIndex).map((bar, i) => {
          const index = startIndex + i;
          let barHeight = (bar.value / maxValue) * maxHeight;
          if (bar.value > 0) {
            barHeight = Math.max(barHeight, minBarHeight);
          } else {
            barHeight = 0;
          }
          const isSelected = bar.id === selectedId;
          const color = isSelected
            ? getBarHighlightColor?.(bar) ?? selectedColor
            : bar.color;
          const left = index * barStep;

          return (
            <Bar
              key={bar.id}
              left={left}
              barWidth={barWidth}
              hitboxWidth={barStep}
              height={barHeight}
              color={color}
              onClick={() => handleClick(bar)}
              title={`ID: ${bar.id}, Value: ${bar.value}`}
              isContainerActuallyDragging={isActuallyDragging}
            />
          );
        })}
      </Inner>
    </Wrapper>
  );
};
