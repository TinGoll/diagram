import styled from "@emotion/styled";
import { useMemo, useRef, useState } from "react";
import { useBarMetrics } from "./hooks/useBarMetrics";
import { useContainerDimensions } from "./hooks/useContainerDimensions";
import { useScrollAndDrag } from "./hooks/useScrollAndDrag";
import { useVirtualization } from "./hooks/useVirtualization";
import { useBarSelection } from "./hooks/useBarSelection";
import { motion } from "motion/react";

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
  getBarHighlightColor?: (bar: BarData<T>) => string;
  initialScrollIndex?: number;
};
const Wrapper = styled.div<{ isScrollable: boolean }>`
  overflow: hidden;
  user-select: none;
  will-change: transform;
  transform: translateZ(0);
  cursor: ${({ isScrollable }) => (isScrollable ? "grab" : "default")};
  height: 100%;

  &.custom-dragging {
    cursor: ${({ isScrollable }) => (isScrollable ? "grabbing" : "default")};
  }

  &:focus {
    outline: none;
  }
`;

const Inner = styled(motion.div)<{ width: number }>`
  position: relative;
  height: 100%;
  width: ${({ width }) => width}px;
`;

const Bar = styled(motion.div)<{
  height: number;
  left: number;
  color: string;
  barWidth: number;
  hitboxWidth: number;
}>`
  position: absolute;
  bottom: 0;
  left: ${({ left }) => left}px;
  width: ${({ barWidth }) => barWidth}px;
  height: ${({ height }) => height}px;
  background-color: ${({ color }) => color};
  border-radius: ${({ barWidth, height }) => Math.min(barWidth, height) / 2}px;
  cursor: pointer;

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
    initialScrollIndex = 0,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);

  const { maxValue, barStep } = useBarMetrics<T>({ bars, barWidth });

  const { containerWidth, isScrollable, totalWidth } = useContainerDimensions({
    containerRef,
    barsLength: bars.length,
    barStep,
  });

  const { x, handleDragStart, handleDrag, handleDragEnd, currentScrollX } =
    useScrollAndDrag({
      barStep, // Передаем barStep
      totalWidth,
      containerWidth,
      isScrollable,
      dragThreshold,
      initialScrollIndex,
    });

  const { startIndex, endIndex } = useVirtualization({
    currentScrollX,
    containerWidth,
    barStep,
    barsLength: bars.length,
    overscan,
  });

  const { selectedId, handleBarClick } = useBarSelection<T>({
    externalValue,
    onBarClick,
  });

  const dragConstraints = useMemo(() => {
    if (!isScrollable || totalWidth <= containerWidth) {
      return { left: 0, right: 0 };
    }
    const maxLeft = -(totalWidth - containerWidth);
    return { left: maxLeft, right: 0 };
  }, [isScrollable, totalWidth, containerWidth]);

  const [isVisuallyDragging, setIsVisuallyDragging] = useState(false);

  return (
    <Wrapper
      ref={containerRef}
      style={{ height: `${maxHeight}px` }}
      isScrollable={isScrollable}
      className={isVisuallyDragging && isScrollable ? "custom-dragging" : ""}
    >
      <Inner
        width={totalWidth}
        style={{ x }}
        drag={isScrollable ? "x" : false}
        dragConstraints={dragConstraints}
        onDragStart={() => {
          setIsVisuallyDragging(true);
          handleDragStart();
        }}
        onDrag={handleDrag}
        onDragEnd={(event, info) => {
          setIsVisuallyDragging(false);
          handleDragEnd(event, info);
        }}
        dragElastic={0.05}
        dragTransition={{
          power: 0.5, 
          timeConstant: 400, 
        }}
      >
        {bars.slice(startIndex, endIndex).map((barItem, i) => {
          const globalIndex = startIndex + i;
          let barHeight = (barItem.value / maxValue) * maxHeight;
          if (barItem.value > 0) {
            barHeight = Math.max(barHeight, minBarHeight);
          } else {
            barHeight = 0;
          }
          const isSelected = barItem.id === selectedId;
          const color = isSelected
            ? getBarHighlightColor?.(barItem) ?? selectedColor
            : barItem.color;
          const left = globalIndex * barStep;

          return (
            <Bar
              key={barItem.id}
              left={left}
              barWidth={barWidth}
              hitboxWidth={barStep}
              height={barHeight}
              color={color}
              onTap={() => {
                console.log(`[Bar onTap event] Bar ID: ${barItem.id}`);
                handleBarClick(barItem);
              }}
              title={`ID: ${barItem.id}, Value: ${barItem.value}`}
            />
          );
        })}
      </Inner>
    </Wrapper>
  );
};
