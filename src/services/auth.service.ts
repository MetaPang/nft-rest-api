import { Injectable } from '@nestjs/common';
import { getDatabase, ref, get, push, child } from 'firebase/database';

import database from 'src/utils/database';
import { encodeToken } from 'src/utils/token';

@Injectable()
export class AuthService {
  async setToken(req: any): Promise<any> {
    const db = getDatabase(database)
    const dbRef = ref(db);

    try {
      const snapshot = await get(child(dbRef, `DB/${req.body.googleId}`));
      const value = snapshot.val();
      const token = encodeToken({ user: req.body.googleId });

      if (value.token === undefined) {
        console.log('토큰 데이터 등록')
        
      } else {
        console.log('토큰 데이터 업데이트')
      }

      return {
        googleId: req.body.googleId,
        token: token
      };
    } catch(error) {
      console.error(error);
    }
  }
}