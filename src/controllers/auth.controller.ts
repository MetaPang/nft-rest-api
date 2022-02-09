import { Controller, Get, Request } from '@nestjs/common';
import { AuthService } from 'src/services/auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('/auth/token')
  getUser(@Request() req): any {
    console.log(req)
    return this.authService.getUser();
  }
}