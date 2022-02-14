import { sign, verify } from 'jsonwebtoken';

const SECRET_KEY: string = 'XBHsxD1KnP5v4piuywYD7yK48k7yKimqDJ4L4sfFdnLJmJjtWQ91dFg4DQrhDswD';

export const encodeToken = (payload: any): string => {
  const token: string = sign({ data: payload }, SECRET_KEY, { expiresIn: 60 });

  return token;
}

export const decodeToken = (token: string): any => {
  try {
    const data: any = verify(token, SECRET_KEY);
    
    return data;
  } catch(error) {
    return error.message;
  }   
}

export const tokenValidator = (authorization: string): any => {
  try {
    const token: string = getToken(authorization);
    const data: any = verify(token, SECRET_KEY);
    
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
      return data.data.user;
    }
  } catch(error) {
    return {
      code: "9202",
      msg: "유효하지 않은 토큰",
      data: null,
      success: false
    };
  }
}

const getToken = (authorization: string): string => {
  return authorization.replace('Bearer ', '');
}