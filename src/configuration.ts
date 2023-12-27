import { Configuration, App } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as validate from '@midwayjs/validate';
import * as info from '@midwayjs/info';
import { join } from 'path';
// import { DefaultErrorFilter } from './filter/default.filter';
// import { NotFoundFilter } from './filter/notfound.filter';
import { ReportMiddleware } from './middleware/report.middleware';

import * as cron from '@midwayjs/cron';
import { InjectJob, CronJob } from '@midwayjs/cron';
import { DispatchJob } from './job/dispatch.job';

@Configuration({
  imports: [
    koa,
    validate,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
    cron,
  ],
  importConfigs: [join(__dirname, './config')],
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  @InjectJob(DispatchJob)
  syncJob: CronJob;

  async onReady() {
    // add middleware
    this.app.useMiddleware([ReportMiddleware]);

    // add filter
    // this.app.useFilter([NotFoundFilter, DefaultErrorFilter]);
  }

  async onServerReady() {
    this.syncJob.start();
    // this.syncJob  === this.syncJob2
  }
}
