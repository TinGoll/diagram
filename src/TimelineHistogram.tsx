import styled from "@emotion/styled";
import {
  motion,
  useAnimationControls,
  useMotionValue,
  useMotionValueEvent,
  type PanInfo,
} from "framer-motion";
import type { BarData } from "./types";
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useBarMetrics } from "./hooks/useBarMetrics";
import { useContainerDimensions } from "./hooks/useContainerDimensions";
import { useVirtualization } from "./hooks/useVirtualization";
import { useBarSelection } from "./hooks/useBarSelection";
import clsx from "clsx";
import { Tooltip } from "antd";

const ANIMATION_SCALE_Y = 1.2;

const Wrapper = styled.div`
  overflow: hidden;
  user-select: none;
  transform: translateZ(0);
  height: 100%;
  cursor: default;

  &:focus {
    outline: none;
  }
`;

const InnerBase = styled(motion.div)`
  position: relative;
  height: 100%;
`;

const BarBase = styled(motion.div)<{
  barwidth: number;
  barheight: number;
  hitboxwidth: number;
  iscontaineractuallydragging: string;
}>`
  position: absolute;
  bottom: 0;
  border-radius: ${({ barwidth, barheight }): string =>
    `${barheight > 0 ? Math.min(barwidth, barheight) / 2 : 0}px`};

  cursor: ${({ iscontaineractuallydragging }): string =>
    iscontaineractuallydragging === "true" ? "grabbing" : "pointer"};

  &:hover {
    opacity: 0.6;
  }

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: ${({ hitboxwidth }): number => hitboxwidth}px;
    height: 100%;
    cursor: inherit;
  }
`;

type Props<T> = {
  bars: BarData<T>[];
  value?: string;
  maxHeight?: number;
  barWidth?: number;
  minBarHeight?: number;
  selectedColor?: string | ((bar: BarData<T>) => string);
  barSpacing?: number;
  overscan?: number;
  className?: string;
  onBarClick?: (id: string, bar: BarData<T>) => void;
};

export const TimelineHistogram = <T,>(props: Props<T>): ReactElement => {
  const {
    bars,
    value: externalValue,
    maxHeight = 35,
    barWidth = 6,
    minBarHeight = 12,
    selectedColor = "#1677ff",
    barSpacing = 2,
    overscan = 10,
    className,
    onBarClick,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimationControls();
  const x = useMotionValue(0);

  const [isDragging, setIsDragging] = useState(false);
  const [virtualScrollLeft, setVirtualScrollLeft] = useState(0);

  useMotionValueEvent(x, "change", (latestX) => {
    setVirtualScrollLeft(-latestX);
  });

  const { barStep, maxValue } = useBarMetrics<T>({
    bars,
    barSpacing,
    barWidth,
  });

  const { containerWidth, isScrollable, totalWidth } = useContainerDimensions({
    containerRef,
    barsLenght: bars.length,
    barStep,
  });

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const currentX = x.get();
    const minX = isScrollable ? -(totalWidth - containerWidth) : 0;
    const maxX = 0;
    if (currentX < minX || currentX > maxX) {
      const newX = Math.max(minX, Math.min(currentX, maxX));
      x.set(newX);
    }
  }, [totalWidth, containerWidth, isScrollable, x, controls]);

  const { startIndex, endIndex } = useVirtualization({
    barsLength: bars.length,
    barStep,
    containerWidth,
    overscan,
    currentScrollX: virtualScrollLeft,
  });

  const { selectedId, handleBarClick } = useBarSelection<T>({
    externalValue,
    onBarClick,
  });

  const onInnerDragStart = () => {
    setIsDragging(true);
    controls.stop();
  };

  const onInnerDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    setIsDragging(false);
    if (!isScrollable || !containerRef.current) return;

    const currentX = x.get();
    const projectedX = currentX + info.velocity.x * 0.4;

    const nearestBarIndex = Math.round(-projectedX / barStep);
    let targetX = -(nearestBarIndex * barStep);

    const minX =
      containerWidth < totalWidth ? -(totalWidth - containerWidth) : 0;
    const maxX = 0;
    targetX = Math.max(minX, Math.min(targetX, maxX));

    controls.start(
      { x: targetX },
      {
        type: "spring",
        velocity: info.velocity.x,
        stiffness: 300,
        damping: 30,
        restDelta: 0.1,
      }
    );
  };

  // Эмуляция скролла колесом мыши (опционально)
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer || !isScrollable) return;

    const handleWheel = (event: WheelEvent) => {
      const wheelScrollThreshold = 1; // Порог для срабатывания

      if (
        Math.abs(event.deltaX) > wheelScrollThreshold ||
        Math.abs(event.deltaY) > wheelScrollThreshold
      ) {
        event.preventDefault();
        // controls.stop();

        const currentX = x.get();
        const scrollDelta = event.deltaX !== 0 ? event.deltaX : event.deltaY;

        let newX = currentX - scrollDelta * 0.8;

        const minX =
          containerWidth < totalWidth ? -(totalWidth - containerWidth) : 0;
        const maxX = 0;
        newX = Math.max(minX, Math.min(newX, maxX));
        controls.start(
          { x: newX },
          { type: "tween", duration: 0.2, ease: "easeOut" }
        );
      }
    };

    currentContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      currentContainer.removeEventListener("wheel", handleWheel);
    };
  }, [isScrollable, x, totalWidth, containerWidth, controls]);

  const combinedСlass = clsx(className);

  const preparedBars = useMemo(() => {
    return bars.slice(startIndex, endIndex).map((bar, i) => {
      const index = startIndex + i;

      let barHeight = (bar.value / maxValue) * maxHeight;
      if (bar.value > 0) {
        barHeight = Math.max(barHeight, minBarHeight);
      } else {
        barHeight = 0;
      }
      const isSelected = bar.id === selectedId;
      const colorSource = isSelected ? selectedColor : bar.color;
      const color =
        typeof colorSource === "function" ? colorSource(bar) : colorSource;
      const left = index * barStep;

      return {
        ...bar,
        index,
        barHeight,
        color,
        left,
      };
    });
  }, [
    barStep,
    bars,
    endIndex,
    maxHeight,
    maxValue,
    minBarHeight,
    selectedColor,
    selectedId,
    startIndex,
  ]);

  const dragConstraints = useMemo(() => {
    if (!isScrollable || !containerRef.current) return false;
    const leftConstraint =
      containerWidth < totalWidth ? -(totalWidth - containerWidth) : 0;
    return { left: leftConstraint, right: 0 };
  }, [isScrollable, totalWidth, containerWidth]);

  return (
    <Wrapper
      ref={containerRef}
      style={{ height: `${maxHeight}px` }}
      className={combinedСlass}
      tabIndex={isScrollable ? 0 : -1}
      role="region"
      aria-label="Timeline histogram"
    >
      <InnerBase
        className="timeline-histogram-inner"
        style={{ width: totalWidth, x }}
        drag={isScrollable ? "x" : false}
        dragConstraints={dragConstraints}
        dragElastic={0.05}
        dragMomentum={false}
        onDragStart={onInnerDragStart}
        onDragEnd={onInnerDragEnd}
        animate={controls}
      >
        {preparedBars.map((bar) => (
          <Tooltip key={bar.id} title={bar.tooltip ?? null} placement="top">
            <BarBase
              className="timeline-histogram-bar"
              barwidth={barWidth}
              barheight={bar.barHeight}
              hitboxwidth={barStep}
              iscontaineractuallydragging={isDragging.toString()}
              style={{
                left: bar.left,
                width: barWidth,
                height: bar.barHeight,
                backgroundColor: bar.color,
              }}
              onTap={() => {
                if (!isDragging) {
                  handleBarClick(bar);
                }
              }}
              whileHover={{
                scaleY: ANIMATION_SCALE_Y,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.9 }}
            />
          </Tooltip>
        ))}
      </InnerBase>
    </Wrapper>
  );
};
