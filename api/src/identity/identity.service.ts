import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';

declare module 'express-session' {
  interface SessionData {
    user_id: string;
  }
}

@Injectable()
export class IdentityService {
  patchSessionInformation(request: Request) {
    if (!request.session.user_id) {
      request.session.user_id = uuidv4();
    }
  }
}
