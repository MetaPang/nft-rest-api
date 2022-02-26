import { Module } from '@nestjs/common';
import { AuthController, WalletController, AssetController } from '../controllers';
import { AuthService, WalletService, AssetService } from '../services';

@Module({
  imports: [],
  controllers: [AuthController, WalletController, AssetController],
  providers: [AuthService, WalletService, AssetService],
})
export class AppModule {}
