import { Provide, MidwayInformationService, Inject } from '@midwayjs/core';
import { exec } from 'child_process';
import { promisify } from 'util';
// import { IUserOptions } from '../interface';

@Provide()
export class GitService {
  @Inject()
  env: MidwayInformationService;

  async pull() {
    console.log('pull');

    const execAsync = promisify(exec);

    const cwd = this.env.getAppDir();

    const { stdout, stderr } = await execAsync('git pull', { cwd });
    console.log('AT-[ stderr &&&&&********** ]', stderr);
    console.log('AT-[ stdout &&&&&********** ]', stdout);

    return 'ok';
  }
}
