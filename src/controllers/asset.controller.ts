import { Controller, Get, Post, Put, Request } from '@nestjs/common';

import { AssetService } from '../services/asset.service';
import { tokenValidator } from '../utils/token';

@Controller()
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('/asset/withdraw')
  assetWithdraw(@Request() req: any): any {
    if (req.body.assetSymbol !== '' && req.body.amount !== '' && req.body.to !== '' && req.body.feeRate !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.assetService.withdrawAsset(isValidation, req.body);
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

  @Post('/asset/mint')
  assetMint(@Request() req: any): any {
    if (req.body.amount !== '' && req.body.feeRate !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.assetService.mintAsset(isValidation, req.body);
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

  @Post('/asset/swap')
  assetSwap(@Request() req: any): any {
    if (req.body.amount !== '' && req.body.feeRate !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.assetService.swapAsset(isValidation, req.body);
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

  @Post('/asset/claim')
  assetClaim(@Request() req: any): any {
    if (req.body.imgUrl !== '' && req.body.itemId !== '' && req.body.amount !== '' && req.body.feeRate !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.assetService.claimAsset(isValidation, req.body);
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

  @Post('/asset/transfer')
  assetTransfer(@Request() req: any): any {
    if (req.body.itemId !== '' && req.body.to !== '') {
      const isValidation = tokenValidator(req.headers.authorization);

      if (isValidation.code === undefined) {
        return this.assetService.transferAsset(isValidation, req.body);
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

  @Get('/asset/nft')
  assetNft(@Request() req: any): any {
    const isValidation = tokenValidator(req.headers.authorization);

    if (isValidation.code === undefined) {
      return this.assetService.nftInfo(isValidation, req.query);
    } else {
      return isValidation;
    }
  }
}