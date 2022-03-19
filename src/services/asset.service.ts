import { Injectable } from "@nestjs/common";
import { getDatabase, ref, get, update, child } from 'firebase/database';
import { AbiItem } from 'web3-utils';
import { Transaction as Tx } from 'ethereumjs-tx';
import Common from 'ethereumjs-common';
import request from 'request';
import fs from 'fs';
import mime from 'mime';
import { File } from 'nft.storage';
import 'dotenv/config';

import database from '../utils/database';
import web3 from '../utils/ethereum';
import storage from '../utils/upload';
import { IResult } from '../interfaces';
import Token from '../contract/token.json';
import Pool from '../contract/pool.json';
import Nft from '../contract/nft.json';

const { 
  TOKEN_ADDRESS, 
  POOL_ADDRESS,
  NFT_ADDRESS,
  ADMIN_ADDRESS, 
  ADMIN_PRIVATEKEY,
  BSC_NETWORK_URL
} = process.env;

const common = Common.forCustomChain('mainnet', {
  name: 'Binance Smart Chain',
  networkId: 56,
  chainId: 56,
  url: BSC_NETWORK_URL
}, 'istanbul');

@Injectable()
export class AssetService {
  async withdrawAsset(req: string, body: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const { address, privateKey } = value.wallet;
          const { assetSymbol, amount, to, feeRate } = body;

          const tokenContract = new web3.eth.Contract(Token as AbiItem[], TOKEN_ADDRESS);
          const poolContract = new web3.eth.Contract(Pool as AbiItem[], POOL_ADDRESS);

          const tokenSymbol = await tokenContract.methods.symbol().call();
          const keyString: string = privateKey.substr(2, privateKey.length);
          const PRIVATE_KEY = Buffer.from(keyString, 'hex');

          let fee: number = Number(amount) * Number(feeRate);
          fee = Math.floor(fee * 100000000) / 100000000;
          let total: number = Number(amount) + fee;
          total = Math.floor(total * 100000000) / 100000000;

          if (assetSymbol === 'BNB') {
            const ethWei = await web3.eth.getBalance(address);
            const ethBalance = web3.utils.fromWei(ethWei, 'ether');
            const totalWei = web3.utils.toWei(`${total}`);

            if (total <= Number(ethBalance)) {
              const nonce = await web3.eth.getTransactionCount(address);
              const gasPrice = await web3.eth.getGasPrice();
              const gasLimit = await poolContract.methods.deposit().estimateGas({ 
                from: address,
                value: totalWei
              });

              const price = web3.utils.fromWei(gasPrice, 'ether');
              let gas = Number(price) * gasLimit
              gas = Math.floor(gas * 100000000) / 100000000;
              const gasWei = web3.utils.toWei(`${gas}`, 'ether');

              const value = Number(totalWei) - Number(gasWei);

              const depositBuilder = poolContract.methods.deposit();
              const encodeTx = depositBuilder.encodeABI();

              const rawTx = {
                nonce: web3.utils.toHex(nonce),
                gasPrice: web3.utils.toHex(gasPrice),
                gas: web3.utils.toHex(gasLimit),
                from: address,
                to: POOL_ADDRESS,
                data: encodeTx,
                value: web3.utils.toHex(value)
              };

              const tx = new Tx(rawTx, { common });
              tx.sign(PRIVATE_KEY);

              const serializedTx = tx.serialize();
              const transactionHash = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

              if (transactionHash) {
                const transferBuilder = poolContract.methods.transfer(to, web3.utils.toWei(amount));
                const encodeTx = transferBuilder.encodeABI();

                const nonce = await web3.eth.getTransactionCount(ADMIN_ADDRESS);
                const gasLimit = await poolContract.methods.transfer(to, web3.utils.toWei(amount)).estimateGas({
                  from: ADMIN_ADDRESS
                });

                const rawTx = {
                  nonce: web3.utils.toHex(nonce),
                  gasPrice: web3.utils.toHex(gasPrice),
                  gas: web3.utils.toHex(gasLimit),
                  from: ADMIN_ADDRESS,
                  to: POOL_ADDRESS,
                  data: encodeTx
                };

                const ADMIN_KEY = Buffer.from(ADMIN_PRIVATEKEY, 'hex');

                const tx = new Tx(rawTx, { common });
                tx.sign(ADMIN_KEY);

                const serializedTx = tx.serialize();
                const sended = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

                const result: IResult = {
                  code: "0",
                  msg: null,
                  data: {
                    amount: Number(amount),
                    fee,
                    total,
                    desposit: transactionHash,
                    transfer: sended
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
          } else if (assetSymbol === tokenSymbol) {
            const tokenBalanceWei = await tokenContract.methods.balanceOf(address).call()
            const tokenBalnace = web3.utils.fromWei(tokenBalanceWei, 'ether');

            const ethWei = await web3.eth.getBalance(address);

            if (total <= Number(tokenBalnace)) {
              const nonce = await web3.eth.getTransactionCount(address);
              const gasPrice = await web3.eth.getGasPrice();
              const gasLimit = await tokenContract.methods.transfer(to, web3.utils.toWei(amount)).estimateGas({
                from: address
              });

              const price = web3.utils.fromWei(gasPrice, 'ether');
              let gas = Number(price) * gasLimit
              gas = Math.floor(gas * 100000000) / 100000000;
              const gasWei = web3.utils.toWei(`${gas}`, 'ether');

              if (Number(ethWei) >= Number(gasWei)) {
                const transferBuilder = tokenContract.methods.transfer(to, web3.utils.toWei(amount));
                const encodeTx = transferBuilder.encodeABI();
                
                const rawTx = {
                  nonce: web3.utils.toHex(nonce),
                  gasPrice: web3.utils.toHex(gasPrice),
                  gas: web3.utils.toHex(gasLimit),
                  from: address,
                  to: TOKEN_ADDRESS,
                  data: encodeTx
                };

                const tx = new Tx(rawTx, { common });
                tx.sign(PRIVATE_KEY);

                const serializedTx = tx.serialize();
                const transactionHash = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

                if (transactionHash) {
                  const result: IResult = {
                    code: "0",
                    msg: null,
                    data: {
                      amount: Number(amount),
                      fee,
                      total,
                      transfer: transactionHash
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
                code: "9402",
                msg: "토큰 잔고 부족",
                data: null,
                success: false
              };
            }
          } else {
            return {
              code: "9000",
              msg: "파라미터 에러",
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

  async mintAsset(req: string, body: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const { address } = value.wallet;
          const { amount, feeRate } = body;

          const tokenContract = new web3.eth.Contract(Token as AbiItem[], TOKEN_ADDRESS);

          let fee: number = Number(amount) * Number(feeRate);
          fee = Math.floor(fee * 100000000) / 100000000;
          let total: number = Number(amount) + fee;
          total = Math.floor(total * 100000000) / 100000000;

          const ethWei = await web3.eth.getBalance(ADMIN_ADDRESS);

          if (total <= Number(value.Goods.gem)) {
            const nonce = await web3.eth.getTransactionCount(ADMIN_ADDRESS);
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = await tokenContract.methods.mint(address, web3.utils.toWei(amount)).estimateGas({
              from: ADMIN_ADDRESS
            });

            const price = web3.utils.fromWei(gasPrice, 'ether');
            let gas = Number(price) * gasLimit
            gas = Math.floor(gas * 100000000) / 100000000;
            const gasWei = web3.utils.toWei(`${gas}`, 'ether');

            if (Number(ethWei) >= Number(gasWei)) {
              const mintBuilder = tokenContract.methods.mint(address, web3.utils.toWei(amount));
              const encodeTx = mintBuilder.encodeABI();
              
              const rawTx = {
                nonce: web3.utils.toHex(nonce),
                gasPrice: web3.utils.toHex(gasPrice),
                gas: web3.utils.toHex(gasLimit),
                from: ADMIN_ADDRESS,
                to: TOKEN_ADDRESS,
                data: encodeTx
              };

              const ADMIN_KEY = Buffer.from(ADMIN_PRIVATEKEY, 'hex');

              const tx = new Tx(rawTx, { common });
              tx.sign(ADMIN_KEY);

              const serializedTx = tx.serialize();
              const transactionHash = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

              if (transactionHash) {
                const updates = {};
                const gem = Number(value.Goods.gem) - total;
                updates[`DB/${req}/Goods/gem`] = `${gem}`;
        
                await update(dbRef, updates);

                const result: IResult = {
                  code: "0",
                  msg: null,
                  data: {
                    amount: Number(amount),
                    fee,
                    total,
                    mint: transactionHash
                  },
                  success: true
                };

                return result;
              }
            } else {
              return {
                code: "9404",
                msg: "관리지갑 잔고 부족",
                data: null,
                success: false
              };
            }
          } else {
            return {
              code: "9403",
              msg: "Gem 잔고 부족",
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

  async swapAsset(req: string, body: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const { address, privateKey } = value.wallet;
          const { amount, feeRate } = body;

          const tokenContract = new web3.eth.Contract(Token as AbiItem[], TOKEN_ADDRESS);

          let fee: number = Number(amount) * Number(feeRate);
          fee = Math.floor(fee * 100000000) / 100000000;
          let total: number = Number(amount) + fee;
          total = Math.floor(total * 100000000) / 100000000;

          const tokenBalanceWei = await tokenContract.methods.balanceOf(address).call()
          const tokenBalnace = web3.utils.fromWei(tokenBalanceWei, 'ether');

          if (Number(tokenBalnace) >= total) {
            const nonce = await web3.eth.getTransactionCount(address);
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = await tokenContract.methods.transfer(ADMIN_ADDRESS, web3.utils.toWei(`${total}`)).estimateGas({
              from: address
            });

            const price = web3.utils.fromWei(gasPrice, 'ether');
            let gas = Number(price) * gasLimit
            gas = Math.floor(gas * 100000000) / 100000000;
            const gasWei = web3.utils.toWei(`${gas}`, 'ether');

            const ethWei = await web3.eth.getBalance(address);
            const keyString: string = privateKey.substr(2, privateKey.length);
            const PRIVATE_KEY = Buffer.from(keyString, 'hex');

            if (Number(ethWei) >= Number(gasWei)) {
              const transferBuilder = tokenContract.methods.transfer(ADMIN_ADDRESS, web3.utils.toWei(amount));
              const encodeTx = transferBuilder.encodeABI();
              
              const rawTx = {
                nonce: web3.utils.toHex(nonce),
                gasPrice: web3.utils.toHex(gasPrice),
                gas: web3.utils.toHex(gasLimit),
                from: address,
                to: TOKEN_ADDRESS,
                data: encodeTx
              };

              const tx = new Tx(rawTx, { common });
              tx.sign(PRIVATE_KEY);

              const serializedTx = tx.serialize();
              const transactionHash = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

              if (transactionHash) {
                const updates = {};
                const gem = Number(value.Goods.gem) + Number(amount);
                updates[`DB/${req}/Goods/gem`] = `${gem}`;
        
                await update(dbRef, updates);

                const result: IResult = {
                  code: "0",
                  msg: null,
                  data: {
                    amount: Number(amount),
                    fee,
                    total,
                    swap: transactionHash
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
              code: "9402",
              msg: "토큰 잔고 부족",
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

  async claimAsset(req: string, body: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const { address, privateKey } = value.wallet;
          const { itemUrl, itemId, amount, feeRate } = body;

          const tokenContract = new web3.eth.Contract(Token as AbiItem[], TOKEN_ADDRESS);
          const keyString: string = privateKey.substr(2, privateKey.length);
          const PRIVATE_KEY = Buffer.from(keyString, 'hex');

          let fee: number = Number(amount) * Number(feeRate);
          fee = Math.floor(fee * 100000000) / 100000000;
          let total: number = Number(amount) + fee;
          total = Math.floor(total * 100000000) / 100000000;

          const tokenBalanceWei = await tokenContract.methods.balanceOf(address).call()
          const tokenBalnace = web3.utils.fromWei(tokenBalanceWei, 'ether');

          const ethWei = await web3.eth.getBalance(address);
          
          if (total <= Number(tokenBalnace)) {
            const nonce = await web3.eth.getTransactionCount(address);
            const gasPrice = await web3.eth.getGasPrice();
            const gasLimit = await tokenContract.methods.transfer(ADMIN_ADDRESS, web3.utils.toWei(`${total}`)).estimateGas({
              from: address
            });

            const price = web3.utils.fromWei(gasPrice, 'ether');
            let gas = Number(price) * gasLimit
            gas = Math.floor(gas * 100000000) / 100000000;
            const gasWei = web3.utils.toWei(`${gas}`, 'ether');

            if (Number(ethWei) >= Number(gasWei)) {
              const transferBuilder = tokenContract.methods.transfer(ADMIN_ADDRESS, web3.utils.toWei(`${total}`));
              const encodeTx = transferBuilder.encodeABI();
              
              const rawTx = {
                nonce: web3.utils.toHex(nonce),
                gasPrice: web3.utils.toHex(gasPrice),
                gas: web3.utils.toHex(gasLimit),
                from: address,
                to: TOKEN_ADDRESS,
                data: encodeTx
              };

              const tx = new Tx(rawTx, { common });
              tx.sign(PRIVATE_KEY);

              const serializedTx = tx.serialize();
              const transactionHash = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

              if (transactionHash) {
                const writeFile = await upload(itemUrl);

                if (writeFile.success) {
                  const data = await fs.promises.readFile(`src/temp/${writeFile.fileName}`);
                  const type = mime.getType(itemUrl);
      
                  const nft = {
                    description: 'BI Pang Game Item', 
                    image: new File([data], writeFile.fileName, { type }),
                    name: `BIPangItem-${itemId}`
                  };
      
                  const metadata = await storage.store(nft);
      
                  if (metadata) {
                    fs.unlink(`src/temp/${writeFile.fileName}`, err => {});
      
                    const nftContract = new web3.eth.Contract(Nft as AbiItem[], NFT_ADDRESS);

                    const nonce = await web3.eth.getTransactionCount(ADMIN_ADDRESS);
                    const gasPrice = await web3.eth.getGasPrice();
                    const gasLimit = await nftContract.methods.safeMint(address, itemId, metadata.url).estimateGas({
                      from: ADMIN_ADDRESS
                    });

                    const price = web3.utils.fromWei(gasPrice, 'ether');
                    let gas = Number(price) * gasLimit
                    gas = Math.floor(gas * 100000000) / 100000000;
                    const gasWei = web3.utils.toWei(`${gas}`, 'ether');

                    if (Number(ethWei) >= Number(gasWei)) {
                      const mintBuilder = nftContract.methods.safeMint(address, itemId, metadata.url);
                      const encodeTx = mintBuilder.encodeABI();

                      const rawTx = {
                        nonce: web3.utils.toHex(nonce),
                        gasPrice: web3.utils.toHex(gasPrice),
                        gas: web3.utils.toHex(gasLimit),
                        from: ADMIN_ADDRESS,
                        to: NFT_ADDRESS,
                        data: encodeTx
                      };
    
                      const ADMIN_KEY = Buffer.from(ADMIN_PRIVATEKEY, 'hex');
    
                      const tx = new Tx(rawTx, { common });
                      tx.sign(ADMIN_KEY);
    
                      const serializedTx = tx.serialize();
                      const minted = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

                      if (minted) {
                        const result: IResult = {
                          code: "0",
                          msg: null,
                          data: {
                            amount: Number(amount),
                            fee,
                            total,
                            pay: transactionHash,
                            nft: minted
                          },
                          success: true
                        };
      
                        return result;
                      }
                    } else {
                      return {
                        code: "9404",
                        msg: "관리지갑 잔고 부족",
                        data: null,
                        success: false
                      };
                    }
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
              code: "9401",
              msg: "지갑 잔고 부족",
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

  async transferAsset(req: string, body: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const { address, privateKey } = value.wallet;
          const { itemId, to } = body;

          const nftContract = new web3.eth.Contract(Nft as AbiItem[], NFT_ADDRESS);

          const keyString: string = privateKey.substr(2, privateKey.length);
          const PRIVATE_KEY = Buffer.from(keyString, 'hex');

          const nonce = await web3.eth.getTransactionCount(address);
          const gasPrice = await web3.eth.getGasPrice();
          const gasLimit = await nftContract.methods.transferFrom(address, to, itemId).estimateGas({
            from: address
          });
          
          const transferBuilder = nftContract.methods.transferFrom(address, to, itemId);
          const encodeTx = transferBuilder.encodeABI();

          const price = web3.utils.fromWei(gasPrice, 'ether');
          const gas = Number(price) * gasLimit
          const gasWei = web3.utils.toWei(`${gas}`, 'ether');
          const gasEth = web3.utils.fromWei(gasWei, 'ether');

          const ethWei = await web3.eth.getBalance(address);
          const ethBalance = web3.utils.fromWei(ethWei, 'ether');

          if (Number(ethBalance) >= Number(gasEth)) {
            const rawTx = {
              nonce: web3.utils.toHex(nonce),
              gasPrice: web3.utils.toHex(gasPrice),
              gas: web3.utils.toHex(gasLimit),
              from: address,
              to: NFT_ADDRESS,
              data: encodeTx
            };

            const tx = new Tx(rawTx, { common });
            tx.sign(PRIVATE_KEY);

            const serializedTx = tx.serialize();
            const transactionHash = await web3.eth.sendSignedTransaction(`0x${serializedTx.toString('hex')}`);

            if (transactionHash) {
              const result: IResult = {
                code: "0",
                msg: null,
                data: {
                  transfer: transactionHash
                },
                success: true
              };

              return result;
            }
          } else {
            return {
              code: "9401",
              msg: "지갑 잔고 부족",
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

  async nftInfo(req: string, query: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        if (query.itemId !== undefined) {
          const nftContract = new web3.eth.Contract(Nft as AbiItem[], NFT_ADDRESS);
          const ownerOf = await nftContract.methods.ownerOf(query.itemId).call();
          const tokenUri = await nftContract.methods.tokenURI(query.itemId).call();

          const result: IResult = {
            code: "0",
            msg: null,
            data: {
              ownerOf,
              tokenUri
            },
            success: true
          };

          return result;
        } else {
          return {
            code: "9000",
            msg: "파라미터 에러",
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

const upload = (itemUrl: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const fileArray = itemUrl.split('/');
    const fileName = fileArray[fileArray.length - 1];

    const file = fs.createWriteStream(`src/temp/${fileName}`);
    let receivedBytes = 0;

    request.get(itemUrl)
      .on('response', res => {
        if (res.statusCode !== 200) {
          console.log('Response status was ' + res.statusCode);
          reject();
        }
      })
      .on('data', chunk => {
        receivedBytes += chunk.length;
      })
      .pipe(file)
      .on('error', error => {
        fs.unlink(`src/temp/${fileName}`, err => {});
        return reject(error);
      })
    
    file.on('finish', () => {
      file.close();
      resolve({
        success: true,
        fileName
      })
    })

    file.on('error', error => {
      fs.unlink(`src/temp/${fileName}`, err => {});
      return reject(error);
    })
  })
}