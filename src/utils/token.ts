import { sign, verify} from 'jsonwebtoken';

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