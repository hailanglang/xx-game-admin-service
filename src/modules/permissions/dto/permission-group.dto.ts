import { PermissionItemDto } from './permission-item.dto';

export class PermissionGroupDto {
  module: string;
  moduleName: string;
  permissions: PermissionItemDto[];
}
