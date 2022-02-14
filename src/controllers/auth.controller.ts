import { Controller, Post, Request } from '@nestjs/common';

import { AuthService } from '../services/auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/auth/token')
  setToken(@Request() req: any): any {
    if (req.body.grantType === 'setToken') {
      return this.authService.setToken(req);
    } else if (req.body.grantType === 'refreshToken') {
      return this.authService.refreshToken(req);
    } else {
      return {
        code: "9000",
        msg: "파라미터 에러",
        data: null,
        success: false
      }
    }
  }

  @Post('/auth/token/validation')
  tokenValidation(@Request() req: any): any {
    if (req.body.token !== undefined && req.body.token !== '') {
      return this.authService.tokenValidation(req);
    } else {
      return {
        code: "9000",
        msg: "파라미터 에러",
        data: null,
        success: false
      };
    }
  }
}