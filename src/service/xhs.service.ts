import { Provide, Inject, Context } from '@midwayjs/core';
import { CacheManager } from '@midwayjs/cache';
import * as fs from 'fs-extra';
// import * as path from 'path';
import puppeteer from 'puppeteer-core';
import { WSEStoreService } from './wse.store.service';
import { killChrome, fullScreenChrome, desktop } from '../util';

declare global {
  interface Window {
    jQuery?: unknown;
  }
}

@Provide()
export class XHSService {
  @Inject()
  ctx: Context;

  @Inject()
  cache: CacheManager;

  @Inject()
  wSEStoreService: WSEStoreService;

  async run(resource: string, signal: string) {
    await this.cache.set('jobStatus', 'xhs');

    const xhsTrace = this.ctx.getLogger('xhsRunLogger');

    const json = JSON.parse(fs.readFileSync(resource, { encoding: 'utf8' }));

    xhsTrace.warn('1、杀死所有Chrome浏览器进程');

    await killChrome().catch(e => e);

    xhsTrace.info('2、切换到', signal, '浏览器缓存目录', '启动浏览器实例');

    // const userDataDir = path.join('.cache', signal);

    const browserWSEndpoint = await this.wSEStoreService.getWsEndpoint(signal);

    const browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null,
    });

    xhsTrace.info('3、打开：小红书首页', '同时加载jquery cdn', '然后等待3s');

    const page = await browser.newPage();

    // const [page] = await browser.pages();

    await page.goto(
      'https://creator.xiaohongshu.com/publish/publish?source=official',
      {
        waitUntil: 'load',
      }
    );

    await Promise.all([
      page.addScriptTag({
        url: 'https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js',
        id: 'jquery',
      }),

      page.waitForFunction(() => window.jQuery !== undefined, { timeout: 0 }),
    ]);

    await page.waitForTimeout(3000);

    xhsTrace.warn('4、执行：浏览器全屏脚本');
    fullScreenChrome();

    xhsTrace.info('5、循环检测登录状态');

    while (Date.now()) {
      const loginBtn = await page.evaluate(() => {
        $('div:contains(短信登录)').is(':visible') && $('.css-wemwzq').click();
        return $('.login-box-container').length;
      });

      if (loginBtn) {
        xhsTrace.info('未登录', '点击登录按钮，唤起登录框', '等待15s');
        await page.waitForTimeout(15000);
      } else {
        xhsTrace.warn(signal, '已经登录', '然后等待3s');
        break;
      }
    }

    await page.waitForTimeout(3000);

    xhsTrace.info('6、', signal, '点击：发布笔记', '然后等待3s');

    await page.locator('.publish-video .btn').setTimeout(0).click();

    await page.waitForTimeout(3000);

    xhsTrace.info('7、', '点击上传图文', '然后等待3s');

    await page.evaluate(() => {
      $('.title:contains(上传图文)').click();
    });

    await page.waitForTimeout(3000);

    xhsTrace.info(
      '~~~',
      '若出现：你还有上次未发布的图文笔记，是否继续编辑？',
      '点击放弃'
    );

    await page.waitForFunction(() => $('.give-up').click());

    await page.waitForTimeout(3000);

    xhsTrace.info('8、', '开始上传', '然后等待3s');

    const uploadInput = await page.evaluateHandle(
      () => <Element>$('.upload-input').get(0)
    );

    const [imagesFileChooser] = await Promise.all([
      page.waitForFileChooser({
        timeout: 0,
      }),

      uploadInput?.click(),
    ]);

    const imagesPath = json.pngList
      .sort()
      .map((i: string) => i.replace('/Users/kenny/Desktop', desktop));

    await imagesFileChooser?.accept([...imagesPath]);

    await page.waitForTimeout(3000);

    xhsTrace.info('9、', '输入标题', '然后等待3s');

    await page.type('.c-input_inner', json.name, { delay: 200 });
    await page.waitForTimeout(3000);

    xhsTrace.info('10、', '输入描述', '然后等待1s');
    await page.type('#post-textarea', json.desc, { delay: 200 });

    await page.keyboard.press('Enter');

    await page.waitForTimeout(1000);

    xhsTrace.info('11、', '循环输入标签', '然后等待3s');
    for (const tag of json.tags) {
      await page.type('#post-textarea', '#', { delay: 100 });
      await page.type('#post-textarea', tag, { delay: 200 });
      await page.waitForTimeout(6000);
      await page.keyboard.press('Enter');
    }

    await page.waitForTimeout(3000);

    xhsTrace.info('12、', '点击‘发布’按钮');

    await page.locator('.publishBtn').setTimeout(0).scroll({
      scrollLeft: 1000,
      scrollTop: 0,
    });

    await page.waitForFunction(
      () => {
        return $('.publishBtn').click();
      },
      { timeout: 0 }
    );

    xhsTrace.info('13、', '发布成功，关闭实例');

    await page.waitForFunction(() => $(':contains(发布成功)').length, {
      timeout: 0,
    });

    // browser.close();

    page.close();

    xhsTrace.info('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', '\r\n\r\n');

    xhsTrace.error(resource, signal);
  }
}
