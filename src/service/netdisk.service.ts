import path = require('path');
import * as fs from 'fs-extra';

import { Provide, Inject } from '@midwayjs/core';
import { WSEStoreService } from './wse.store.service';
import puppeteer from 'puppeteer-core';

import { desktop } from '../util';

@Provide()
export class NetDIskService {
  @Inject()
  wseService: WSEStoreService;

  async download(url: string) {
    // const browserWSEndpoint = await this.wseService.getWsEndpoint('netdisk', true);

    // puppeteer.executablePath = () => __dirname;

    // const browser = await puppeteer.connect({
    //   browserWSEndpoint,
    //   defaultViewport: null,
    // });

    const userDataDir = path.join('.cache');

    const browser = await puppeteer.launch({
      userDataDir,
      headless: true,
      channel: 'chrome',
      defaultViewport: null,
      timeout: 0,

      args: [
        // '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-zygote',
        '--single-process',

        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-notifications',
        '--disable-extensions',
      ],
    });

    return new Promise(async (resolve, reject) => {
      const page = await browser.newPage();

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

        if (url.includes('dl-uf-zb.pds.uc.cn')) {
          const contentDisposition = response.headers()['content-disposition'];

          if (contentDisposition) {
            const filename = contentDisposition.split("filename*=utf-8''")[1];

            const watcher = fs.watch(downloadPath);

            watcher.on('change', (event, f) => {
              if (f === filename) {
                resolve('下载完毕');
                watcher.close();

                page.close();
              }
            });

            // fs.watch(downloadPath, );
          }
        }
      });

      page.on('error', error => {
        reject(error);
      });

      await page.goto(url, { waitUntil: 'load' });

      /**
       * 点击下载
       */

      const element = await page.waitForSelector('span::-p-text(全部下载)');

      element.click();
    });
  }
}
