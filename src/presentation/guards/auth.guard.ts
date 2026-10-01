import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../infrastructure/auth/auth';

/**
 * Exige una sesión válida de Better Auth para acceder al endpoint.
 * Si el usuario tiene MFA activado, Better Auth solo devuelve la sesión
 * cuando el segundo factor ya fue verificado.
 *
 * Es glue de la capa de Presentation: traduce "no hay sesión" a un 401.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      throw new UnauthorizedException(
        'Debes iniciar sesión para realizar esta acción',
      );
    }

    // Deja disponibles el usuario y la sesión para el controlador.
    req.user = session.user;
    req.session = session.session;
    return true;
  }
}
