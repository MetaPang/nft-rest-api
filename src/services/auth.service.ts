import { Injectable } from '@nestjs/common';
import { getDatabase, ref, get, update, child } from 'firebase/database';

import database from '../utils/database';
import { encodeToken, decodeToken } from '../utils/token';
import { IResult } from '../interfaces';

@Injectable()
export class AuthService {
  async setToken(req: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    if (req.body.googleId === undefined) {
      return {
        code: "9000",
        msg: "파라미터 에러",
        data: null,
        success: false
      };
    } else {
      try {
        const snapshot = await get(child(dbRef, `DB/${req.body.googleId}`));
        
        if (snapshot.exists()) {
          const token = encodeToken({ user: req.body.googleId });
          const updates = {};
          updates[`DB/${req.body.googleId}/token`] = token;
  
          await update(dbRef, updates);
  
          const result: IResult = {
            code: '0',
            msg: null,
            data: {
              googleId: req.body.googleId,
              token
            },
            success: true
          };

          return result;
        } else {
          return {
            code: "9101",
            msg: "사용자 없음",
            data: null,
            success: false
          };
        }
      } catch(error) {
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

  async refreshToken(req: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    if (req.body.googleId === undefined || req.body.token === undefined) {
      return {
        code: "9000",
        msg: "파라미터 에러",
        data: null,
        success: false
      };
    } else {
      try {
        const snapshot = await get(child(dbRef, `DB/${req.body.googleId}`));

        if (snapshot.exists()) {
          const value = snapshot.val();

          if (value.token === req.body.token) {
            const token = encodeToken({ user: req.body.googleId });
            const updates = {};
            updates[`DB/${req.body.googleId}/token`] = token;
    
            await update(dbRef, updates);
    
            const result: IResult = {
              code: '0',
              msg: null,
              data: {
                googleId: req.body.googleId,
                token
              },
              success: true
            };

            return result;
          } else {
            if (value.token === undefined) {
              return {
                code: "9203",
                msg: "토큰 미발행",
                data: null,
                success: false
              };
            } else {
              return {
                code: "9202",
                msg: "유효하지 않은 토큰",
                data: null,
                success: false
              };
            }
          }
        } else {
          return {
            code: "9101",
            msg: "사용자 없음",
            data: null,
            success: false
          };
        }
      } catch(error) {
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

  tokenValidation(req: any): any {
    const { token } = req.body;
    const data = decodeToken(token)

    if (data.data === undefined) {
      if (data === 'jwt expired') {
        return {
          code: "9201",
          msg: "토큰만료",
          data: null,
          success: false
        };
      } else {
        return {
          code: "9202",
          msg: "유효하지 않은 토큰",
          data: null,
          success: false
        };
      }
    } else {
      return {
        code: "0",
        msg: "성공",
        data: null,
        success: true
      };
    }
  }
}