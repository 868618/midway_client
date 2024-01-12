import path = require('path');
import assert = require('assert');
import fs = require('fs-extra');

import { Provide, Inject, Context } from '@midwayjs/core';
import puppeteer, { type Browser, Page } from 'puppeteer-core';
import { CacheManager } from '@midwayjs/cache';
import { WSEStoreService } from './wse.store.service';
// import { killChrome } from '../util';

@Provide()
export class BilibiService {
  @Inject()
  ctx: Context;

  @Inject()
  cache: CacheManager;

  @Inject()
  wSEStoreService: WSEStoreService;

  async run(resource: string, signal: string) {
    await this.cache.set('jobStatus', 'bili');

    const biliLog = this.ctx.getLogger('biliRunLogger');

    biliLog.info('1、杀死所有Chrome浏览器进程');

    // await killChrome().catch(e => e);

    assert(path.isAbsolute(resource), '绝对路径');

    const json = JSON.parse(fs.readFileSync(resource, { encoding: 'utf8' }));

    // const currentNetName = signal;

    biliLog.info('2、切换到', signal, '浏览器缓存目录', '启动浏览器实例');

    const browserWSEndpoint = await this.wSEStoreService.getWsEndpoint('test');

    const browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null,
    });

    biliLog.info('3、打开：B站首页');

    const page = await browser.newPage();

    await page.goto('https://www.bilibili.com/', {
      waitUntil: 'load',
    });

    /**
     * 循5秒环检测登录状态
     */
    biliLog.info('5、循环检测登录状态');

    while (Date.now()) {
      const loginBtn = await page.$('.header-login-entry::-p-text("登录")');

      if (loginBtn) {
        biliLog.warn(signal, '未登录', '点击登录按钮，唤起登录框', '等待15s');
        await loginBtn.click();
        await page.waitForTimeout(15000);
      } else {
        biliLog.info(signal, '已经登录', '结束登录状态循环监听');
        break;
      }
    }

    biliLog.info('6、', signal, '点击：上传按钮,等待页面跳转');

    /**
     * 点击并且监听浏览器跳转事件
     */
    await new Promise(resolve => {
      page.once('popup', async newPage => {
        await newPage?.waitForSelector('body');
        resolve(null);
      });

      page.locator('.right-entry-item--upload').setTimeout(0).click({ delay: 2000 });
    });

    biliLog.info('7、', '关闭：关闭首页');
    await page.close();

    biliLog.info('8、', '拿到新页面实例');

    const getLastPage = (browser: Browser) => browser.pages().then(pages => pages.pop());

    const uploadPage = await getLastPage(browser);

    /**禁止打开新页面 防止异常出现*/
    browser.on('targetcreated', target => {
      target.page().then(n => n?.close());
    });

    /**
     * 监听页面实例如果出现上传失败的情况直接重试
     */

    try {
      uploadPage
        ?.locator('.file-block-status-text-fail::-p-text( 上传失败 )')
        .setTimeout(0)
        .wait()
        .then(async () => {
          biliLog.info('~~', '开始上传视频');

          const [videoFileChooser] = await Promise.all([
            uploadPage.waitForFileChooser({
              timeout: 0,
            }),

            uploadPage.locator('::-p-text(重新上传)').setTimeout(0).click(),
          ]);

          const mp4Path = path.join(json.mp4Path);
          videoFileChooser?.accept([mp4Path]);
        });

      uploadPage?.evaluate(() => {
        const observer = new MutationObserver(() => {
          $(".ui-popup:contains('系统可能不会保存填写的稿件信息噢...(´；ω；`)')").hide();

          console.log('命中一次');
        });

        observer.observe(document, {
          attributes: true,
          childList: true,
          subtree: true,
        });
      });
    } catch (error) {
      console.log('AT-[ error &&&&&********** ]', error);
    }

    biliLog.info('9、', '进入上传流程');

    const step = async (p: Page) => {
      const uploadVideo = async () => {
        biliLog.info('~~', '开始上传视频');

        const [videoFileChooser] = await Promise.all([
          p.waitForFileChooser({
            timeout: 0,
          }),
          p.locator('.bcc-upload-wrapper').setTimeout(0).click(),
        ]);

        const mp4Path = path.join(json.mp4Path);
        await videoFileChooser?.accept([mp4Path]);
      };

      /**
       * @warning
       * 此处应该是异步并发，方便后续的60s等待
       */
      uploadVideo();

      biliLog.info('~~', '等待60s', '为了确保封面图上传图片出现');

      biliLog.info('~~', '如果未上传完毕则：暂停上传，为了不跟上传封面图强带宽');

      await Promise.any([
        p.locator('.file-block-status .file-block-status-text .success::-p-text(上传完成)').setTimeout(0).wait(),

        p.locator('.icon-sprite-pause').setTimeout(0).click(),
      ]);

      biliLog.info('10、', '开始上传封面图', '将底层input展示出来后等2s再点击');

      const coverUploadBtn = await p.evaluateHandle(() => {
        const inputFile = $('.cover-upload .bcc-upload-wrapper input').get(0);

        inputFile.style.display = 'block';
        inputFile.style.padding = '50px';
        inputFile.style.position = 'absolute';
        inputFile.style.top = '0';
        inputFile.style.left = '0';
        inputFile.style.zIndex = '999';
        inputFile.style.background = 'red';
        return inputFile;
      });

      /**
       * 滚动到上传图片标签可视区域
       */
      await coverUploadBtn?.scrollIntoView();

      await p.waitForTimeout(2000);

      const [coverImageFileChooser] = await Promise.all([
        p.waitForFileChooser({ timeout: 0 }),

        coverUploadBtn?.click(),
      ]);

      const coverPngPath = json.coverPngPath;
      await coverImageFileChooser?.accept([coverPngPath]);

      await p.locator('.bcc-button span::-p-text( 完成 )').setTimeout(0).click();

      biliLog.info('~~', '完成上传封面图');

      biliLog.info('~~', '判断视频是否已上传完毕', '若已没有传完则：继续上传视频');

      await p.evaluateHandle(() => {
        if (!$('.success:contains(上传完成)').length) {
          $('.file-block-icon-bg:has(.icon-sprite-play)').click();
        }
      });

      biliLog.info('11、', '等待3s', '连续点击3次标题输入框，框选默认已输入的标题内容');

      await new Promise(r => setTimeout(r, 3000));

      const inputTitle = await p.waitForSelector('.input-instance .input-val', {
        timeout: 0,
      });

      biliLog.info('~~', '等标题输入框出现后，先将其滚动到可视区域再连续点击3次');
      await inputTitle?.scrollIntoView();

      await p.click('.input-instance .input-val', { count: 3 });

      biliLog.info('12、', '等待3s', '输入：标题');
      await p.type('.input-instance .input-val', json.name, { delay: 100 });

      biliLog.info('13、', '等待3s', '点击："自制" 单选框');

      await p.waitForTimeout(3000);

      await p.evaluate(() => {
        $('.check-radio-v2-container:contains(自制)').click();
      });

      const isNeedSelectArea = await p.evaluate(() => {
        return !$('.select-item-cont-inserted:contains( 知识 → 校园学习)').length;
      });

      console.log('isNeedSelectArea', isNeedSelectArea);

      biliLog.info('~~', '是否需要重新选择视频为：知识-校园学习', isNeedSelectArea);

      if (isNeedSelectArea) {
        biliLog.info('14、', '等待3s', '点击：分区选择框右边的下拉图标按钮');
        await p.waitForTimeout(3000);

        const pulldownBtn = await p.evaluateHandle(() => {
          const pulldownBtn = $('.video-type .icon-sprite-pulldown').get(0) as Element;

          const rect = pulldownBtn.getBoundingClientRect();

          document.documentElement.scrollTop = rect.top / 2;

          return pulldownBtn;
        });

        await pulldownBtn.scrollIntoView();

        await pulldownBtn.click();

        // await p.waitForTimeout(99999)

        biliLog.info('~~', '等待3s', '选择：知识');

        await p.waitForTimeout(3000);

        // await new Promise(r => setTimeout(r, 999999))
        await p.evaluate(() => {
          $('.drop-f-item:contains(知识)').click();
        });

        // await p.locator("::-p-text(知识)").setTimeout(0).click()

        biliLog.info('~~', '等待3s', '选择：校园学习');

        await p.waitForTimeout(3000);

        await p.evaluate(() => {
          $('.item-main:contains(校园学习)').click();
        });
      }

      // await p?.locator("::-p-text(校园学习)").setTimeout(0).click({ count: 2 })

      await p.waitForTimeout(3000);
      biliLog.info('~~', '等待标签输入框出现');
      await p.evaluate(() => {
        const input = <HTMLElement>$('input[placeholder="按回车键Enter创建标签"]').get(0);

        const rect = input.getBoundingClientRect();
        document.documentElement.scrollTop = rect.top / 2;
      });

      biliLog.info('15、', '循环输入标签', '每隔3s输入一个');

      for (const tag of json.tags) {
        await p.type('input[placeholder="按回车键Enter创建标签"]', tag, {
          delay: 200,
        });

        await p.keyboard.press('Enter', { delay: 3000 });
      }

      await p.waitForTimeout(3000);

      biliLog.info('16、', '点击：搜索更多话题');

      await p.evaluate(() => {
        const rect = <Element>$('.tag-more').get(0);
        document.documentElement.scrollTop = rect.getBoundingClientRect().top / 2;
        $('.tag-more').click();
      });

      biliLog.info('~~', '等待：搜索输入框出现');
      await p.locator('input[type="text"][spellcheck="false"][class="bcc-search-input"]').setTimeout(0).wait();

      biliLog.info('~~', `输入搜索内容：${json.topic}`);
      await p.type('input[type="text"][spellcheck="false"][class="bcc-search-input"]', json.topic, { delay: 200 });

      biliLog.info('~~', '输入完毕，按下Enter键');
      await p.keyboard.press('Enter', { delay: 1000 });

      biliLog.info('~~', '等待搜索结果出现5s后，点击选择第一个搜索结果');
      await p.waitForTimeout(5000);
      await p.locator('.topic-tag-name').setTimeout(0).click();

      biliLog.info('~~', '1s后点击：确定按钮');
      await p.waitForTimeout(1000);
      await p.locator('.modal-footer::-p-text(确定)').setTimeout(0).click();

      biliLog.info('17、', '输入：视频描述内容');

      await p.evaluate(text => {
        const editor = <HTMLInputElement>$('.ql-editor p').get(0);

        document.documentElement.scrollTop = editor.getBoundingClientRect().top / 2;

        editor.innerHTML = text;
      }, json.desc);

      biliLog.info('18、', '等待：上传完成', '暂时不考虑上传失败等特殊情况');

      await p.locator('.success::-p-text(上传完成)').setTimeout(0).wait();

      biliLog.info('19、', '上传完成', '点击：立即投稿按钮');

      await Promise.any([
        p.locator('.submit-add::-p-text(立即投稿)').setTimeout(0).click(),
        p.evaluate(() => {
          $('.submit-add').click();
        }),
      ]);

      biliLog.info('20、', '等待投稿结果');
      await Promise.any([
        p.locator('::-p-text(恭喜你上传第一个稿件，成为UP主~)').setTimeout(0).wait(),

        p.locator('.step-des::-p-text(稿件投递成功)').setTimeout(0).wait(),

        // p.locator(".success::-p-text(上传完成)").setTimeout(0).wait(),
      ]);

      biliLog.info('21、', '投稿成功，关闭浏览器实例');

      // await browser.close();

      biliLog.info('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~', '\r\n\r\n');

      biliLog.error(resource, signal);
    };

    await step(uploadPage as Page);

    uploadPage.close();
  }
}
