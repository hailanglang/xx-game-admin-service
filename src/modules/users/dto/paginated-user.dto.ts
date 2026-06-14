import { UserDetailDto } from './user-detail.dto';

export class PaginatedUserDto {
  list: UserDetailDto[];
  total: number;
  page: number;
  pageSize: number;
}
