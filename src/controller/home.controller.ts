import { Controller, Get, Inject } from '@midwayjs/core';

import { GitService } from '../service/git.service';

@Controller('/')
export class HomeController {
  @Inject()
  git: GitService;

  @Get('/')
  async home(): Promise<string> {
    return 'Hello Midwayjs!';
  }

  @Get('/pull')
  async pull(): Promise<string> {
    await this.git.pull();
    return 'ok';
  }
}
