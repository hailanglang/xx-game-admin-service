export class LoginResponseDto {
  token: string;
  currentUser: {
    id: number;
    username: string;
    email?: string | null;
    avatar?: string | null;
    roleId?: number | null;
    roleName?: string | null;
    permissions: string[];
  };
}