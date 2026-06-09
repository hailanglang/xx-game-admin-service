export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: string;
  statusCode: number;
}