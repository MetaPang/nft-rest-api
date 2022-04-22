import { Injectable } from "@nestjs/common";
import { AbiItem } from 'web3-utils';
import { Transaction as Tx } from 'ethereumjs-tx';
import { getDatabase, ref, get, child } from 'firebase/database';
import Common from 'ethereumjs-common';
import 'dotenv/config';
import axios from 'axios';

import database from '../utils/database';
import web3 from '../utils/ethereum';
import { IResult } from '../interfaces';
import Router from '../contract/router.json';
import Token from '../contract/token.json';
import Weth from '../contract/weth.json';

const { TOKEN_ADDRESS, UNISWAP_ROUTER, WETH9, BSC_NETWORK_URL } = process.env;

const common = Common.forCustomChain('mainnet', {
  name: 'Binance Smart Chain',
  networkId: 56,
  chainId: 56,
  url: BSC_NETWORK_URL
}, 'istanbul');

@Injectable()
export class SwapService {
  async getSwapPrice(): Promise<any> {
    try {
      const priceData = await axios.get(`https://api.pancakeswap.info/api/v2/tokens/${TOKEN_ADDRESS}`);
      
      const result: IResult = {
        code: '0',
        msg: null,
        data: priceData.data,
        success: true
      }
      
      return result;
    } catch (error) {
      console.error(error);
      return {
        code: "9999",
        msg: "시스템 에러",
        data: error.message,
        success: false
      };
    }
  }

  async trade(req: string, body: any): Promise<any>  {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const { address, privateKey } = value.wallet;
          const { symbol, amount } = body;

          const keyString: string = privateKey.substr(2, privateKey.length);
          const PRIVATE_KEY = Buffer.from(keyString, 'hex');
          const SAFE_MAX = 2**64 - 1;

          const routerContract = new web3.eth.Contract(Router as AbiItem[], UNISWAP_ROUTER);
          const tokenContract = new web3.eth.Contract(Token as AbiItem[], TOKEN_ADDRESS);
          const wethContract = new web3.eth.Contract(Weth as AbiItem[], WETH9)

          const expiryDate = Math.floor(Date.now() / 1000) + 1200;
          const qty = web3.utils.toWei(amount, 'ether');
          const safe = web3.utils.toWei(SAFE_MAX.toString(), 'ether');

          const nonce = await web3.eth.getTransactionCount(address);
          const gasPrice = await web3.eth.getGasPrice();
          const gasLimit = await tokenContract.methods.approve(UNISWAP_ROUTER, safe).estimateGas({ from: address });

          const ethWei = await web3.eth.getBalance(address);
          const price = web3.utils.fromWei(gasPrice, 'ether');
          let gas = Number(price) * gasLimit
          gas = Math.floor(gas * 100000000) / 100000000;
          const gasWei = web3.utils.toWei(`${gas}`, 'ether');

          if (Number(ethWei) >= Number(gasWei)) {
            const approveBuilder = tokenContract.methods.approve(UNISWAP_ROUTER, safe);
            const encodeTx = approveBuilder.encodeABI();

            const rawTx = {
              nonce: web3.utils.toHex(nonce),
              gasPrice: web3.utils.toHex(gasPrice),
              gas: web3.utils.toHex(gasLimit),
              from: address,
              to: TOKEN_ADDRESS,
              data: encodeTx
            }

            const tx = new Tx(rawTx, { common });
            tx.sign(PRIVATE_KEY);

            const serializedTx = tx.serialize();
            const approve = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

            if (approve) {
              if (symbol === 'BNB') {          
                const ethBalance= await web3.eth.getBalance(address);     
                if (Number(ethBalance) >= Number(qty)) {
                  const params = {
                    path: [WETH9, TOKEN_ADDRESS],
                    to: address,
                    deadline: expiryDate,
                    amountOutMin: 0
                  }
    
                  const tradeBuilder = routerContract.methods.swapExactETHForTokens(params.amountOutMin, params.path, params.to, params.deadline);
                  const encodeTx = tradeBuilder.encodeABI();
    
                  const nonce = await web3.eth.getTransactionCount(address);
                  const gasPrice = await web3.eth.getGasPrice();
                  const gasLimit = await routerContract.methods.swapExactETHForTokens(params.amountOutMin, params.path, params.to, params.deadline).estimateGas({ 
                    from: address,
                    value: qty
                  });
  
                  const ethWei = await web3.eth.getBalance(address);
                  const price = web3.utils.fromWei(gasPrice, 'ether');
                  let gas = Number(price) * gasLimit;
                  gas = Math.floor(gas * 100000000) / 100000000;
                  const gasWei = web3.utils.toWei(`${gas}`, 'ether');
                  const total = Number(qty) + Number(gasWei);
  
                  if (Number(ethWei) >= total) {
                    const rawTx = {
                      nonce: web3.utils.toHex(nonce),
                      gasPrice: web3.utils.toHex(gasPrice),
                      gas: web3.utils.toHex(gasLimit),
                      from: address,
                      to: UNISWAP_ROUTER,
                      data: encodeTx,
                      value: web3.utils.toHex(qty)
                    } 
  
                    const tx = new Tx(rawTx, { common });
                    tx.sign(PRIVATE_KEY);
      
                    const serializedTx = tx.serialize();
                    const swap = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);
      
                    if (swap) {
                      const result: IResult = {
                        code: "0",
                        msg: null,
                        data: {
                          approve,
                          swap
                        },
                        success: true
                      };
          
                      return result;
                    }
                  } else {
                    return {
                      code: "9401",
                      msg: "BNB 잔고 부족",
                      data: null,
                      success: false
                    };
                  }
                } else {
                  return {
                    code: "9401",
                    msg: "BNB 잔고 부족",
                    data: null,
                    success: false
                  };
                }
              } else {
                const params = {
                  path: [TOKEN_ADDRESS, WETH9],
                  to: address,
                  deadline: expiryDate,
                  amountIn: qty,
                  amountOutMin: 0
                }
  
                const tradeBuilder = routerContract.methods.swapExactTokensForETH(params.amountIn, params.amountOutMin, params.path, params.to, params.deadline);
                const encodeTx = tradeBuilder.encodeABI();
                const tokenWei = await tokenContract.methods.balanceOf(address).call();
                
                if (Number(tokenWei) >= Number(qty)) {
                  const nonce = await web3.eth.getTransactionCount(address);
                  const gasPrice = await web3.eth.getGasPrice();
                  const gasLimit = await routerContract.methods.swapExactTokensForETH(params.amountIn, params.amountOutMin, params.path, params.to, params.deadline).estimateGas({ from: address });

                  const ethWei = await web3.eth.getBalance(address);
                  const price = web3.utils.fromWei(gasPrice, 'ether');
                  let gas = Number(price) * gasLimit;
                  gas = Math.floor(gas * 100000000) / 100000000;
                  const gasWei = web3.utils.toWei(`${gas}`, 'ether');

                  if (Number(ethWei) >= Number(gasWei)) {
                    const rawTx = {
                      nonce: web3.utils.toHex(nonce),
                      gasPrice: web3.utils.toHex(gasPrice),
                      gas: web3.utils.toHex(gasLimit),
                      from: address,
                      to: UNISWAP_ROUTER,
                      data: encodeTx
                    };

                    const tx = new Tx(rawTx, { common });
                    tx.sign(PRIVATE_KEY);
      
                    const serializedTx = tx.serialize();
                    const swap = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);
      
                    if (swap) {
                      const wrappedBalance = await wethContract.methods.balanceOf(address).call();
                      const nonce = await web3.eth.getTransactionCount(address);
                      const gasPrice = await web3.eth.getGasPrice();
                      const gasLimit = await wethContract.methods.withdraw(wrappedBalance).estimateGas({ from: address });
                      
                      const ethWei = await web3.eth.getBalance(address);
                      const price = web3.utils.fromWei(gasPrice, 'ether');
                      let gas = Number(price) * gasLimit;
                      gas = Math.floor(gas * 100000000) / 100000000;
                      const gasWei = web3.utils.toWei(`${gas}`, 'ether');

                      if (Number(ethWei) >= Number(gasWei)) {
                        const withdrawBuilder = wethContract.methods.withdraw(wrappedBalance);
                        const encodeTx = withdrawBuilder.encodeABI();

                        const rawTx = {
                          nonce: web3.utils.toHex(nonce),
                          gasPrice: web3.utils.toHex(gasPrice),
                          gas: web3.utils.toHex(gasLimit),
                          from: address,
                          to: WETH9,
                          data: encodeTx
                        };
    
                        const tx = new Tx(rawTx, { common });
                        tx.sign(PRIVATE_KEY);

                        const serializedTx = tx.serialize();
                        const withdraw = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

                        if (withdraw) {
                          const result: IResult = {
                            code: "0",
                            msg: null,
                            data: {
                              approve,
                              swap,
                              withdraw
                            },
                            success: true
                          };
              
                          return result;
                        }
                      } else {
                        return {
                          code: "9401",
                          msg: "BNB 잔고 부족",
                          data: null,
                          success: false
                        };
                      }
                    }
                  } else {
                    return {
                      code: "9401",
                      msg: "BNB 잔고 부족",
                      data: null,
                      success: false
                    };
                  }
                } else {
                  return {
                    code: "9402",
                    msg: "토큰 잔고 부족",
                    data: null,
                    success: false
                  };
                }
              }
            }
          } else {
            return {
              code: "9401",
              msg: "BNB 잔고 부족",
              data: null,
              success: false
            };
          }
        } else {
          return {
            code: "9302",
            msg: "생성된 지갑 없음",
            data: null,
            success: false
          };
        }
      } else {
        return {
          code: "9101",
          msg: "사용자 없음",
          data: null,
          success: false
        };
      }
    } catch (error) {
      console.error(error);
      return {
        code: "9999",
        msg: "시스템 에러",
        data: error.message,
        success: false
      };
    }
  }
}