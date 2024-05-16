export class PaginatedResult<T> {
  page: number;
  totalRecord: number;
  totalShowed: number;
  totalPage: number;
  showing: string;
  next: boolean;
  data: T[];
}
