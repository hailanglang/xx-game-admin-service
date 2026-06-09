import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}