import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  getUser(): any {
    return 'Test';
  }
}