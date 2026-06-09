import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import type { Request } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

/**
 * Create a new cat
 *
 * @remarks This operation allows you to create a new cat.
 *
 */
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || undefined;
    return this.authService.login(loginDto, ip, userAgent);
  }

  @UseGuards(AuthGuard)
  @Get('currentUser')
  async getCurrentUser(@CurrentUser('id') userId: number) {
    return this.authService.getCurrentUser(userId);
  }
}