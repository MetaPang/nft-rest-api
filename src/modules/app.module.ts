import { Module } from '@nestjs/common';
import { AppController, AuthController } from '../controllers';
import { AppService, AuthService } from '../services';

@Module({
  imports: [],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
