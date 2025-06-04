import { debounce } from "es-toolkit";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type UseContainerDimensionsReturn = {
  containerWidth: number;
  isScrollable: boolean;
  totalWidth: number;
};
type UseContainerDimensionsProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  barsLenght: number;
  barStep: number;
};

export const useContainerDimensions = (
  props: UseContainerDimensionsProps
): UseContainerDimensionsReturn => {
  const { containerRef, barsLenght, barStep } = props;
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isScrollable, setIsScrollable] = useState<boolean>(false);

  const totalWidth = barsLenght * barStep;

  const updateContainer = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      setContainerWidth(container.offsetWidth);
      setIsScrollable(totalWidth > container.clientWidth);
    }
  }, [containerRef, totalWidth]);

  const debouncedUpdateContainer = useMemo(
    () => debounce(updateContainer, 50),
    [updateContainer]
  );

  useEffect(() => {
    updateContainer(); // Initial call
    window.addEventListener("resize", debouncedUpdateContainer);
    return (): void => {
      window.removeEventListener("resize", debouncedUpdateContainer);
      debouncedUpdateContainer.cancel?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUpdateContainer, updateContainer]); // Добавлены зависимости

  // Этот useEffect может быть избыточным, если updateContainer вызывается при изменении totalWidth/barsLength
  // или если мы хотим обновить размеры при изменении этих параметров, а не только при resize.
  // Оставим его, так как он был в оригинале и может иметь смысл при динамическом изменении barsLength/barStep.
  useEffect(() => {
    updateContainer();
  }, [updateContainer]);

  return {
    containerWidth,
    isScrollable,
    totalWidth,
  };
};
