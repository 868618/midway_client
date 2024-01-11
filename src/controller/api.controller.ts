import path = require('path');

import { Inject, Controller, Get } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { CacheManager } from '@midwayjs/cache';

import { UserService } from '../service/user.service';
import { NetDIskService } from '../service/netdisk.service';

import { desktop } from '../util';
import { glob } from 'glob';

@Controller('/api')
export class APIController {
  @Inject()
  ctx: Context;

  @Inject()
  netDIskService: NetDIskService;

  @Inject()
  userService: UserService;

  @Inject()
  cacheManager: CacheManager;

  @Get('/download')
  async download(url: string) {
    // console.log('AT-[ url &&&&&********** ]', url);
    await this.netDIskService.download(decodeURIComponent(url));

    return 'ok';
  }

  @Get('/status')
  async status() {
    const tasks = await this.cacheManager.get('tasks');

    const list = glob.sync(path.join(desktop, 't_*/*/'), { windowsPathsNoEscape: true });

    return {
      tasks,
      list,
    };
  }
}
