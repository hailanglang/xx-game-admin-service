import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { LoginDto } from './dto/login.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('api/hello')
  getApiHello(): string {
    return this.appService.getHello() + 'api';
  }

  @Get('api/currentUser')
  getCurrentUser() {
    return this.appService.getCurrentUser();
  }

  @Get('api/fake_analysis_chart_data')
  getFakeAnalysisChartData() {
    return this.appService.getFakeAnalysisChartData();
  }

  @Post('api/login/account')
  login(@Body() loginDto: LoginDto): string {
    console.log('touch controller')
    return this.appService.login(loginDto);
  }
}
