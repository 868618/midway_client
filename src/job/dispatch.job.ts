import path = require('path');

import { Context, Inject, MidwayInformationService } from '@midwayjs/core';

import { Job, IJob } from '@midwayjs/cron';
import { CacheManager } from '@midwayjs/cache';

import * as schedule from 'node-schedule';
import * as dayjs from 'dayjs';
import * as glob from 'glob';
import * as fs from 'fs-extra';
import * as prettier from 'prettier';
import { v4 as uuidv4 } from 'uuid';

import { BilibiService } from '../service/bilibili.service';
import { desktop, setNetInterface } from '../util';

import { ITask, Tasks } from '../interface';

@Job('dispatchJobBili', {
  cronTime: '2 0 1 * * *',
  runOnInit: true,
})
export class DispatchJobBili implements IJob {
  private dutyEnvPath = path.join(__dirname, '../../env.duty.ts');

  @Inject()
  ctx: Context;

  @Inject()
  bili: BilibiService;

  @Inject()
  informationService: MidwayInformationService;

  @Inject()
  cacheManager: CacheManager;

  async updateDutyEnv() {
    const dutyEnv = fs.readFileSync(this.dutyEnvPath, 'utf8');

    const realTime = dayjs().format('YYYY-MM-DD');

    const newStr = dutyEnv.replace(/2023-\d{2}-\d{2}/gi, realTime);

    const formatedStr = await prettier.format(newStr, {
      parser: 'babel-ts',
      singleQuote: true,
    });

    fs.writeFileSync(this.dutyEnvPath, formatedStr);
  }

  clearFolderSubDir(folder: string) {
    const { join } = path;
    const { sync } = glob;
    const options = { windowsPathsNoEscape: true };

    const currentCourses = sync(join(desktop, `t_${folder}`, '*/'), options);

    const needRmDirs = currentCourses.filter(d => !sync(join(d, '*/'), options).length);

    needRmDirs.forEach(d => fs.rmdir(d, { recursive: true }));
  }

  async onTick() {
    this.updateDutyEnv();

    const { default: dutyEnv } = <{ default: ITask }>require(this.dutyEnvPath);

    const tasks = dutyEnv.tasks.filter(({ date }) => dayjs().isBefore(date)).map(task => ({ ...task, uuid: uuidv4() }));

    const options = { windowsPathsNoEscape: true };

    const engines = { bili: this.bili };

    this.cacheManager.set('tasks', tasks);

    for (const task of tasks) {
      const { date, platforms, folder, uuid } = task;

      const patterns = {
        bili: path.join(desktop, `t_${folder}`, '*/', 'bili/b.json'),
      };

      const time = new Date(date);

      const work = schedule.scheduleJob(time, async () => {
        const { ip } = dutyEnv.ipMap.find(i => i.floder === folder);

        setNetInterface(ip);

        await platforms.reduce(async (pre, platform) => {
          const engine = engines[platform];

          const [source] = glob.sync(patterns[platform], options);

          const signal = ip + folder;

          return pre
            .then(() => (source ? engine.run(source, signal) : Promise.reject(`${folder},${platform},该加料了`)))
            .catch(this.ctx.logger.error)
            .finally(async () => {
              const currentTasks = <Tasks[]>await this.cacheManager.get('tasks');

              this.cacheManager.set(
                'tasks',
                currentTasks.filter(i => i.uuid !== uuid)
              );
            });
        }, Promise.resolve());

        // 清理空目录
        this.clearFolderSubDir(folder);

        work.cancel();
      });
    }
  }
}
