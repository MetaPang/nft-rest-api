import { Module } from '@nestjs/common';
import { AuthController, WalletController } from '../controllers';
import { AuthService, WalletService } from '../services';

@Module({
  imports: [],
  controllers: [AuthController, WalletController],
  providers: [AuthService, WalletService],
})
export class AppModule {}
