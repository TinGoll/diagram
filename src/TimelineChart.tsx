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

const Wrapper = styled.div<{ isScrollable: boolean; isActuallyDragging: boolean }>`
  overflow-x: scroll;
  overflow-y: hidden;
  user-select: none;
  cursor: ${({ isScrollable, isActuallyDragging }) =>
    isScrollable ? (isActuallyDragging ? "grabbing" : "grab") : "default"};
  height: 100%;

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
    opacity: ${({ isContainerActuallyDragging }) => (isContainerActuallyDragging ? 1 : 0.8)};
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
  
  // Состояние для UI (курсор), true только когда мышь зажата И было значительное движение
  const [isActuallyDragging, setIsActuallyDragging] = useState(false); 

  const maxValue = useMemo(() => {
    if (bars.length === 0) return 1;
    return bars.reduce((max, bar) => Math.max(max, bar.value || 0), 1);
  }, [bars]);

  const barSpacing = 2;
  const barStep = barWidth + barSpacing;
  const totalWidth = bars.length * barStep;

  const isMouseDownRef = useRef(false);
  const hasMovedSignificantlyRef = useRef(false); 
  const dragStartCoordsRef = useRef({ x: 0, y: 0 });
  
  const lastDragXRef = useRef(0);
  const initialScrollLeftRef = useRef(0);
  
  const velocityRef = useRef(0);
  const animationFrame = useRef(0);
  const lastTimestamp = useRef(0);

  const snapToNearestBar = useCallback(() => {
    if (!containerRef.current) return;
    const scroll = containerRef.current.scrollLeft;
    const nearestIndex = Math.round(scroll / barStep);
    const snapTo = nearestIndex * barStep;
    requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ left: snapTo, behavior: "smooth" });
    });
  }, [barStep]);

  const applyInertia = useCallback(() => {
    const friction = 0.95;
    let localVelocity = velocityRef.current;

    const step = (timestamp: number) => {
      if (!containerRef.current) return;

      const dt = timestamp - lastTimestamp.current;
      lastTimestamp.current = timestamp;

      if (Math.abs(localVelocity) > 0.1) {
        containerRef.current.scrollLeft += localVelocity * (dt / 16);
        localVelocity *= Math.pow(friction, dt / 16); 
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
  }, [snapToNearestBar]);

  const onScroll = useCallback(() => {
    if (containerRef.current && !isMouseDownRef.current) { 
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
    const debouncedHandler = debouncedUpdateContainerWidth;
    window.addEventListener("resize", debouncedHandler);
    return () => {
      window.removeEventListener("resize", debouncedHandler);
      debouncedHandler.cancel?.();
      cancelAnimationFrame(animationFrame.current);
    };
  }, [debouncedUpdateContainerWidth, updateContainerWidth]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isScrollable || e.button !== 0) return; 
      
      e.preventDefault(); 

      isMouseDownRef.current = true;
      hasMovedSignificantlyRef.current = false; // Сбрасываем флаг значительного движения
      // setIsActuallyDragging(false); // Не ставим здесь, а в onMouseMove

      dragStartCoordsRef.current = { x: e.clientX, y: e.clientY };
      lastDragXRef.current = e.clientX; 
      initialScrollLeftRef.current = containerRef.current?.scrollLeft || 0;
      
      velocityRef.current = 0;
      cancelAnimationFrame(animationFrame.current);
    },
    [isScrollable]
  );

  const onWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isMouseDownRef.current || !containerRef.current) return;
      
      // Не вызываем e.preventDefault() здесь сразу, чтобы позволить нормальный клик, если движения не было.
      // Но если движение началось, то preventDefault нужен.

      const dxTotal = e.clientX - dragStartCoordsRef.current.x;
      const dyTotal = e.clientY - dragStartCoordsRef.current.y;

      if (!hasMovedSignificantlyRef.current) {
        if (Math.sqrt(dxTotal * dxTotal + dyTotal * dyTotal) > dragThreshold) {
          hasMovedSignificantlyRef.current = true;
          setIsActuallyDragging(true); // Меняем курсор и UI-состояние
        }
      }
      
      if (hasMovedSignificantlyRef.current) {
        e.preventDefault(); // Предотвращаем выделение текста и т.д. только при активном драге

        // Инкрементальный скролл от последнего положения мыши
        const deltaXSinceLastMove = e.clientX - lastDragXRef.current;
        containerRef.current.scrollLeft -= deltaXSinceLastMove; // Двигаем контейнер
        
        velocityRef.current = -deltaXSinceLastMove / 2; // Скорость основана на последнем смещении
        lastDragXRef.current = e.clientX; // Обновляем последнюю позицию X
      }
    },
    [dragThreshold] 
  );

   const onWindowMouseUp = useCallback(
    (e: MouseEvent) => { 
      if (!isMouseDownRef.current) return; 

      const wasSignificantDrag = hasMovedSignificantlyRef.current;

      isMouseDownRef.current = false;
      setIsActuallyDragging(false); 

      if (wasSignificantDrag) {
        if (Math.abs(velocityRef.current) > 0.5) { 
            applyInertia();
        } else {
            snapToNearestBar();
            velocityRef.current = 0;
        }
      }
      // Если не было значительного драга (wasSignificantDrag === false),
      // то это был клик (или очень маленькое движение).
      // Никаких действий со скроллом (инерция/снаппинг) не предпринимаем.
      // Клик будет обработан событием onClick на элементе Bar.
      
      // Сбрасываем hasMovedSignificantlyRef здесь не нужно, т.к. он сбрасывается в onMouseDown.
      // velocityRef.current обнулится или будет использован инерцией.
    }, [applyInertia, snapToNearestBar]
  );

  useEffect(() => {
    // Слушатели на window для корректной отработки mousemove/mouseup вне компонента
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    
    return () => {
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      cancelAnimationFrame(animationFrame.current);
    };
  }, [onWindowMouseMove, onWindowMouseUp]);

  const barsPerView = Math.ceil(containerWidth / barStep) || 1;
  const startIndex = Math.max(0, Math.floor(scrollLeft / barStep) - overscan);
  const endIndex = Math.min(
    bars.length,
    startIndex + barsPerView + overscan * 2
  );

  const handleBarClick = (barData: BarData) => {
    // Клик обрабатывается, только если НЕ было значительного движения мыши
    // hasMovedSignificantlyRef будет false, если это был чистый клик.
    if (hasMovedSignificantlyRef.current) {
      return; // Это был драг, игнорируем клик
    }

    if (externalValue === undefined) {
      setInternalSelectedId(barData.id);
    }
    onBarClick?.(barData.id, barData);
  };

  return (
     <Wrapper
      ref={containerRef}
      onScroll={onScroll}
      onMouseDown={onMouseDown} 
      style={{ height: `${maxHeight}px` }}
      isScrollable={isScrollable}
      isActuallyDragging={isActuallyDragging} // Передаем для стилизации курсора Wrapper
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
              isContainerActuallyDragging={isActuallyDragging} // Для курсора на самом баре
              onClick={() => handleBarClick(bar)}
            />
          );
        })}
      </Inner>
    </Wrapper>
  );
};
