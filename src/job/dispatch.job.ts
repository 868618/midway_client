import { Job, IJob } from '@midwayjs/cron';
import { Context, Inject } from '@midwayjs/core';

@Job('syncJob', {
  cronTime: '*/2 * * * * *', // 每隔 2s 执行
})
export class DispatchJob implements IJob {
  @Inject()
  ctx: Context;
  // log: ILogger;

  async onTick() {
    // console.log('this', this.ctx);
    const dispatchJobLogger = this.ctx.getLogger('dispatchJobLogger');

    dispatchJobLogger.info(99988, Date.now());
    dispatchJobLogger.error(99988, Date.now());
  }
}
