import styled from "@emotion/styled";
import { useCallback, useEffect, useRef, useState, type FC } from "react";

export type BarData<T = unknown> = {
  id: string;
  value: number;
  color: string;
  meta?: T;
};

type Props<T = unknown> = {
  bars: BarData<T>[];
  onBarClick?: (id: string) => void;
  maxHeight?: number;
  barWidth?: number;
  borderRadius?: number;
  minBarHeight?: number;
  overscan?: number;
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
  borderRadius: number;
}>`
  position: absolute;
  bottom: 0;
  left: ${({ left }) => left}px;
  width: ${({ barWidth }) => barWidth}px;
  height: ${({ height }) => height}px;
  background-color: ${({ color }) => color};
  border-radius: ${({ borderRadius }) =>
    `${borderRadius}px ${borderRadius}px 0 0`};
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

export const TimelineChart: FC<Props> = ({
  bars,
  onBarClick,
  maxHeight = 30,
  barWidth = 8,
  borderRadius = 4,
  minBarHeight = 4,
  overscan = 10,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isScrollable, setIsScrollable] = useState(false);

  const maxValue = Math.max(...bars.map((bar) => bar.value || 0), 1);
  const barSpacing = 2;
  const barStep = barWidth + barSpacing;
  const totalWidth = bars.length * barStep;

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const scrollStartRef = useRef(0);
  const velocityRef = useRef(0);
  const animationFrame = useRef(0);
  const lastTimestamp = useRef(0);

  const applyInertia = useCallback(() => {
    const friction = 0.75;

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
      }
    };

    cancelAnimationFrame(animationFrame.current);
    animationFrame.current = requestAnimationFrame((ts) => {
      lastTimestamp.current = ts;
      step(ts);
    });
  }, []);

  const snapToNearestBar = () => {
    if (!containerRef.current) return;
    const scroll = containerRef.current.scrollLeft;
    const nearestIndex = Math.round(scroll / barStep);
    const snapTo = nearestIndex * barStep;
    containerRef.current.scrollTo({ left: snapTo, behavior: "smooth" });
  };

  const onScroll = () => {
    if (containerRef.current) {
      setScrollLeft(containerRef.current.scrollLeft);
    }
  };

  const updateContainerWidth = useCallback(() => {
    if (containerRef.current) {
      const current = containerRef.current;
      setContainerWidth(current.offsetWidth);
      setIsScrollable(current.scrollWidth > current.clientWidth);
    }
  }, []);

  useEffect(() => {
    updateContainerWidth();
    window.addEventListener("resize", updateContainerWidth);
    return () => window.removeEventListener("resize", updateContainerWidth);
  }, [updateContainerWidth]);

  const onMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    scrollStartRef.current = containerRef.current?.scrollLeft || 0;
    velocityRef.current = 0;
    containerRef.current?.classList.add("dragging");
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    containerRef.current.scrollLeft = scrollStartRef.current - dx;
    velocityRef.current = -dx / 5;
  };

  const onMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    containerRef.current?.classList.remove("dragging");
    applyInertia();
  };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      cancelAnimationFrame(animationFrame.current);
    };
  }, [applyInertia]);

  const barsPerView = Math.ceil(containerWidth / barStep);
  const startIndex = Math.max(0, Math.floor(scrollLeft / barStep) - overscan);
  const endIndex = Math.min(
    bars.length,
    startIndex + barsPerView + overscan * 2
  );

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

          const left = index * barStep;

          return (
            <Bar
              key={bar.id}
              left={left}
              barWidth={barWidth}
              height={barHeight}
              color={bar.color}
              borderRadius={borderRadius}
              onClick={() => onBarClick?.(bar.id)}
              title={`ID: ${bar.id}`}
            />
          );
        })}
      </Inner>
    </Wrapper>
  );
};
