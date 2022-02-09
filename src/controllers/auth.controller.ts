import { Controller, Post, Request } from '@nestjs/common';
import { AuthService } from 'src/services/auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/auth/set/token')
  setToken(@Request() req): any {
    return this.authService.setToken(req);
  }
}