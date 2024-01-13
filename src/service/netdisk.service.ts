import path = require('path');
import * as fs from 'fs-extra';

import { Provide, Inject } from '@midwayjs/core';
import { WSEStoreService } from './wse.store.service';
import puppeteer from 'puppeteer-core';
import * as AdmZip from 'adm-zip';
import * as os from 'os';
import * as glob from 'glob';

import { desktop } from '../util';

@Provide()
export class NetDIskService {
  @Inject()
  wseService: WSEStoreService;

  async download(url: string) {
    const browserWSEndpoint = await this.wseService.getWsEndpoint('netdisk', true);

    const browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'load' });

    await Promise.all([
      page.addScriptTag({
        url: 'https://cdn.bootcdn.net/ajax/libs/jquery/3.5.1/jquery.min.js',
        id: 'jquery',
      }),

      page.waitForFunction(() => window.jQuery !== undefined, { timeout: 0 }),
    ]);

    await page.waitForTimeout(2000);

    return new Promise(async (resolve, reject) => {
      page.on('error', reject);

      const loginBtn = await page.evaluate(() => $('.text:contains(登录UC网盘)').length);

      console.log('AT-[ loginBtn &&&&&********** ]', loginBtn);

      if (loginBtn) {
        await page.locator('div::-p-text(登录UC网盘)').wait();

        await page.locator('div::-p-text(登录UC网盘)').click();

        await page.waitForSelector('.iframeShow');

        await page.waitForTimeout(5000);

        const binary = await page.screenshot({ encoding: 'binary' });

        resolve(binary);
      } else {
        const cdpSession = await page.target().createCDPSession();

        const downloadPath = path.join(desktop, 'download');

        fs.ensureDirSync(downloadPath);

        await cdpSession.send('Page.setDownloadBehavior', {
          behavior: 'allow', //允许所有下载请求
          downloadPath, //设置下载路径
        });

        // 监听页面的 response 事件
        page.on('response', async response => {
          const url = response.request().url();

          if (url.includes('pds.uc.cn')) {
            const contentDisposition = response.headers()['content-disposition'];

            if (contentDisposition) {
              const filename = decodeURIComponent(contentDisposition.split("filename*=utf-8''")[1]);

              const watcher = fs.watch(downloadPath);

              watcher.on('change', (event, f) => {
                if (f === filename) {
                  console.log('下载成功');

                  const zipFilePath = path.join(downloadPath, filename);

                  const zip = new AdmZip(zipFilePath);

                  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-'));

                  zip.extractAllTo(tmpDir, true);

                  const extractedDir = glob.sync(path.join(tmpDir, '*/*/'), {
                    windowsPathsNoEscape: true,
                    ignore: {
                      ignored: p => p.name.includes('__MACOSX'),
                    },
                  });

                  extractedDir.forEach(dir => {
                    fs.moveSync(dir, dir.replace(tmpDir, desktop), { overwrite: true });
                  });

                  fs.rmdirSync(tmpDir);

                  watcher.close();

                  page.close();
                }
              });
            }
          }
        });

        await page.locator('.task-footer-down').click();

        resolve('ok了');
      }
    });
  }
}
