// import path = require('path');

import { Inject, Controller, Get, Headers } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { CacheManager } from '@midwayjs/cache';

import { UserService } from '../service/user.service';
import { NetDIskService } from '../service/netdisk.service';

// import { desktop } from '../util';
// import fs from 'fs-extra';

// import { ITask } from '../interface';

@Controller('/api')
export class APIController {
  // private dutyEnvPath = path.join(__dirname, '../../env.duty.ts');

  @Inject()
  ctx: Context;

  @Inject()
  netDIskService: NetDIskService;

  @Inject()
  userService: UserService;

  @Inject()
  cacheManager: CacheManager;

  @Get('/download')
  async download(@Headers('url') url: string) {
    // console.log('AT-[ url &&&&&********** ]', url);
    await this.netDIskService.download(url);

    return { abc: 123 };
  }

  @Get('/status')
  async status() {
    // const dutyEnv = JSON.parse(fs.readFileSync(this.dutyEnvPath, 'utf8'));
    // console.log('AT-[ dutyEnv &&&&&********** ]', dutyEnv);

    // const { default: dutyEnv } = <{ default: ITask }>require(this.dutyEnvPath);

    // console.log('dutyEnv.ipMap', dutyEnv.ipMap);

    const tasks = await this.cacheManager.get('tasks');

    return JSON.stringify(tasks);
  }
}
