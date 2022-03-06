import { Module } from '@nestjs/common';
import { AuthController, WalletController, AssetController, SwapController } from '../controllers';
import { AuthService, WalletService, AssetService, SwapService } from '../services';

@Module({
  imports: [],
  controllers: [AuthController, WalletController, AssetController, SwapController],
  providers: [AuthService, WalletService, AssetService, SwapService],
})
export class AppModule {}
