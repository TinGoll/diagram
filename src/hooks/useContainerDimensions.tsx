import { debounce } from "es-toolkit";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";

type UseContainerDimensionsReturn = {
  containerWidth: number;
  isScrollable: boolean;
  totalWidth: number;
};

type UseContainerDimensionsProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  barsLength: number;
  barStep: number;
};

export const useContainerDimensions = (
  props: UseContainerDimensionsProps
): UseContainerDimensionsReturn => {
  const { barStep, barsLength, containerRef } = props;
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isScrollable, setIsScrollable] = useState<boolean>(false);

  const totalWidth = barsLength * barStep;

  const updateContainerState = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setContainerWidth(container.offsetWidth);
      setIsScrollable(totalWidth > container.clientWidth);
    }
  }, [totalWidth]);

  const debouncedUpdateContainerState = useMemo(
    () => debounce(updateContainerState, 50),
    [updateContainerState]
  );

  useEffect(() => {
    updateContainerState();
    window.addEventListener("resize", debouncedUpdateContainerState);
    return () => {
      window.removeEventListener("resize", debouncedUpdateContainerState);
      debouncedUpdateContainerState.cancel?.();
    };
  }, []);

  useEffect(() => {
    updateContainerState();
  }, [updateContainerState]);

  return {
    containerWidth,
    isScrollable,
    totalWidth,
  };
};
