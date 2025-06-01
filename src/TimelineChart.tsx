import styled from "@emotion/styled";
import { useRef } from "react";
import { useBarMetrics } from "./hooks/useBarMetrics";
import { useContainerDimensions } from "./hooks/useContainerDimensions";
import { useScrollAndDrag } from "./hooks/useScrollAndDrag";
import { useVirtualization } from "./hooks/useVirtualization";
import { useBarSelection } from "./hooks/useBarSelection";

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
  will-change: scroll-position;
  transform: translateZ(0);
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
  cursor: ${({ isContainerActuallyDragging }) =>
    isContainerActuallyDragging ? "grabbing" : "pointer"};

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

export const TimelineChart = <T = unknown,>(props: Props<T>) => {
  const {
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
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const { maxValue, barStep } = useBarMetrics<T>({ bars, barWidth });

  const { containerWidth, isScrollable, totalWidth } = useContainerDimensions({
    containerRef,
    barsLength: bars.length,
    barStep,
  });

  const {
    scrollLeft,
    isActuallyDragging,
    didMoveSignificantlyRef,
    handleMouseDown,
    handleScroll,
  } = useScrollAndDrag({
    containerRef,
    barStep,
    isScrollable,
    dragThreshold,
  });

  const { startIndex, endIndex } = useVirtualization({
    scrollLeft,
    containerWidth,
    barStep,
    barsLength: bars.length,
    overscan,
  });

  const { selectedId, handleBarClick } = useBarSelection<T>({
    externalValue,
    onBarClick,
    didMoveSignificantlyRef,
  });

  return (
    <Wrapper
      ref={containerRef}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
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
              onClick={() => handleBarClick(bar)}
              title={`ID: ${bar.id}, Value: ${bar.value}`}
              isContainerActuallyDragging={isActuallyDragging}
            />
          );
        })}
      </Inner>
    </Wrapper>
  );
};
