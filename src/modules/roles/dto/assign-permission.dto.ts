import { IsArray, IsInt } from 'class-validator';

export class AssignPermissionDto {
  @IsArray()
  @IsInt({ each: true })
  permissionIds: number[];
}