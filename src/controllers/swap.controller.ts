import { Controller, Get, Post, Request } from '@nestjs/common';

import { SwapService } from 'src/services/swap.service';
import { tokenValidator } from '../utils/token';

@Controller()
export class SwapController {
  constructor(private readonly swapService: SwapService) {}

  @Get('/swap/price')
  getSwapPrice(): any {
    return this.swapService.getSwapPrice();
  }

  @Post('/swap/trade')
  swapTrade(@Request() req: any): any {
    if (req.body.symbol !== '' && req.body.amount !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.swapService.trade(isValidation, req.body);
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