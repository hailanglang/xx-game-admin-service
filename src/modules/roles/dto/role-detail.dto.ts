import { RoleDto } from './role.dto';

export class RolePermissionDto {
  roleId: number;
  permissionId: number;
  permission: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    module: string;
    action: string;
    createdAt: Date;
  };
}

export class RoleDetailDto extends RoleDto {
  permissions: RolePermissionDto[];
  userCount: number;
}
