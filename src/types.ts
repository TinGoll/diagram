export type BarData<T> = {
    id: string;
    value: number;
    color: string;
    tooltip?: string;
    data: T;
};