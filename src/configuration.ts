import { Configuration, App, Inject } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as validate from '@midwayjs/validate';
import * as info from '@midwayjs/info';
import { join } from 'path';
// import { DefaultErrorFilter } from './filter/default.filter';
// import { NotFoundFilter } from './filter/notfound.filter';
import { ReportMiddleware } from './middleware/report.middleware';
import { ResponseInterceptMiddleware } from './middleware/response.intercept.middleware';

import * as cron from '@midwayjs/cron';
import { DispatchJobBili } from './job/dispatch.job';

import * as cache from '@midwayjs/cache';

@Configuration({
  imports: [
    koa,
    validate,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
    cron,
    cache,
  ],
  importConfigs: [join(__dirname, './config')],
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  // @InjectJob(DispatchJobBili)
  // dispatchJobBili: CronJob;

  // @InjectJob(DispatchJobXhs)
  // dispatchJobXhs: CronJob;

  @Inject()
  cronFramework: cron.Framework;

  async onReady() {
    // add middleware
    this.app.useMiddleware([ReportMiddleware, ResponseInterceptMiddleware]);

    // add filter
    // this.app.useFilter([NotFoundFilter, DefaultErrorFilter]);
  }

  async onServerReady() {
    // this.dispatchJobBili.start();
    // this.dispatchJobXhs.start();
    // this.syncJob  === this.syncJob2

    const dispatchJobBili = this.cronFramework.getJob(DispatchJobBili);

    dispatchJobBili.start();

    // console.log('process.env', process.env.ABC);
  }
}
