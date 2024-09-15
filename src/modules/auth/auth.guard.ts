import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
// import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(protected readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
    //   context.getHandler(),
    //   context.getClass(),
    // ]);

    // if (isPublic) {
    //   return true;
    // }

    const request = context.switchToHttp().getRequest();
    const token = request.cookies['auth_token'];

    if (!token) {
      throw new UnauthorizedException('Token missing or invalid');
    }

    const user = await this.authService.verifyToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    request.user = user;
    return true;
  }
}
