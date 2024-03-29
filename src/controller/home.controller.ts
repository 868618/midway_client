import { Controller, Get, Inject } from '@midwayjs/core';

import { GitService } from '../service/git.service';
import { WSEStoreService } from '../service/wse.store.service';

@Controller('/')
export class HomeController {
  @Inject()
  git: GitService;

  @Inject()
  wseService: WSEStoreService;

  @Get('/')
  async home(): Promise<string> {
    return 'Hello Midwayjs! 999';
  }

  @Get('/pull')
  async pull(): Promise<string> {
    const res = await this.git.pull();

    return res;
  }
}
