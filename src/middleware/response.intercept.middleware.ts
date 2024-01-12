import { Middleware, IMiddleware } from '@midwayjs/core';
import { NextFunction, Context } from '@midwayjs/koa';

@Middleware()
export class ResponseInterceptMiddleware implements IMiddleware<Context, NextFunction> {
  static getName(): string {
    return 'response';
  }

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const result = await next();

      return {
        code: 0,
        msg: 'OK',
        data: result,
      };
    };
  }

  match(ctx: Context) {
    return ctx.path.includes('/api') && !ctx.path.includes('/api/download');
  }

  // ignore(ctx: Context): boolean {
  //   // 下面的路由将忽略此中间件
  //   return ctx.path.includes('/api/download');
  // }
}
