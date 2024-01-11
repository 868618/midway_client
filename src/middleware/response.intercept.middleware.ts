import { Middleware, IMiddleware } from '@midwayjs/core';
import { NextFunction, Context } from '@midwayjs/koa';

@Middleware()
export class ResponseInterceptMiddleware implements IMiddleware<Context, NextFunction> {
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
    return ctx.path.indexOf('/api') !== -1;
  }
}
