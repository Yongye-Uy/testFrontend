export type ID = string;

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export type ListResponse<T, K extends string> = Record<K, T[]> & {
  total?: number;
  page?: number;
  limit?: number;
};

export type Option = {
  label: string;
  value: string;
};
