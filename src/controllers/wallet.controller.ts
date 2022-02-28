import { Controller, Get, Post, Request } from '@nestjs/common';

import { WalletService } from '../services/wallet.service';
import { tokenValidator } from '../utils/token';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('/wallet/create')
  walletCreate(@Request() req: any): any {
    const isValidation = tokenValidator(req.headers.authorization);

    if (isValidation.code === undefined) {
      return this.walletService.createWallet(isValidation);
    } else {
      return isValidation;
    }
  }

  @Get('/wallet/address')
  walletAddress(@Request() req: any): any {
    const isValidation = tokenValidator(req.headers.authorization);

    if (isValidation.code === undefined) {
      return this.walletService.getAddress(isValidation, req.query);
    } else {
      return isValidation;
    }
  }

  @Get('/wallet/balance')
  walletBalance(@Request() req: any): any {
    const isValidation = tokenValidator(req.headers.authorization);

    if (isValidation.code === undefined) {
      return this.walletService.getBalace(isValidation);
    } else {
      return isValidation;
    }
  }

  @Get('/wallet/check')
  walletCheck(@Request() req: any): any {
    if (req.query.amount !== '' && req.body.feeRate !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.walletService.checkWallet(isValidation, req.query);
      } else {
        return isValidation;
      }
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