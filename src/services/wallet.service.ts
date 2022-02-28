import { Injectable } from "@nestjs/common";
import { getDatabase, ref, get, update, child, onValue, DatabaseReference } from 'firebase/database';
import { AbiItem } from 'web3-utils';
import 'dotenv/config';

import database from '../utils/database';
import web3 from '../utils/ethereum';
import { IResult } from '../interfaces';
import Token from '../contract/token.json';

const { TOKEN_ADDRESS } = process.env;

@Injectable()
export class WalletService {
  async createWallet(req: string): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));
      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet === undefined) {
          const account = web3.eth.accounts.create();
          const { address, privateKey } = account;
          const walletData = { address, privateKey };
          const updates = {};
          updates[`DB/${req}/wallet`] = walletData;

          await update(dbRef, updates);

          const result: IResult = {
            code: '0',
            msg: null,
            data: {
              googleId: req,
              address,
              privateKey
            },
            success: true
          };

          return result;
        } else {
          return {
            code: "9301",
            msg: "이미 지갑이 존재함",
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

  async getAddress(req: string, query: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));
      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const result: IResult = {
            code: '0',
            msg: null,
            data: {
              googleId: req,
              address: value.wallet.address,
              privateKey: query?.export === 'true' ? value.wallet.privateKey : undefined
            },
            success: true
          }
          
          return result;
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

  async getBalace(req: string): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));
      if (snapshot.exists()) {
        const value = snapshot.val();

        if (value.wallet !== undefined) {
          const wallet = value.wallet.address;
          const ethWei = await web3.eth.getBalance(wallet);
          const tokenContract = new web3.eth.Contract(Token as AbiItem[], TOKEN_ADDRESS);
          const tokenWei = await tokenContract.methods.balanceOf(wallet).call();
          const tokenSymbol = await tokenContract.methods.symbol().call()

          const ethBalance = web3.utils.fromWei(ethWei, 'ether');
          const tokenBalance = web3.utils.fromWei(tokenWei, 'ether');

          const result: IResult = {
            code: '0',
            msg: null,
            data: {
              googleId: req,
              ethBalance,
              tokenBalance,
              tokenSymbol
            },
            success: true
          }
          
          return result;
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

  async checkWallet(req: string, query: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req}`));

      if (snapshot.exists()) {
        const { itemId, to } = query;

        const value = snapshot.val();
        const itemsString = value.Item.index;
        const items = itemsString.split(',');

        const isExist = items.filter((item: string) => item === itemId).length;
        if (isExist > 0) {
          const allRef = ref(db, 'DB');

          const { isInternal, accountId } = await checkAddress(allRef, to);

          const result: IResult = {
            code: "0",
            msg: null,
            data: {
              isInternal,
              accountId
            },
            success: true
          };

          return result;
        } else {
          return {
            code: "9501",
            msg: "사용자 아이템이 아님",
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

const checkAddress = (ref: DatabaseReference, to: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    let isInternal = false;
    let accountId = '';

    onValue(ref, (allDb) => {
      allDb.forEach((childSnapshot) => {
        const childKey = childSnapshot.key;
        const childData = childSnapshot.val();
        if (childData.wallet !== undefined) {
          const isWallet = childData.wallet.address === to ? true : false;

          if (isWallet) {
            isInternal = isWallet;
            accountId = childKey;
          }
        }
      })

      resolve({ isInternal, accountId });
    }, { onlyOnce: true });
  })
}