import { Provide, Inject } from '@midwayjs/core';
import pRetry from 'p-retry';
// import path = require('path');
import puppeteer from 'puppeteer-core';
import { CacheManager } from '@midwayjs/cache';
import { WSEStoreService } from './wse.store.service';

@Provide()
export class TestService {
  @Inject()
  cache: CacheManager;

  @Inject()
  wSEStoreService: WSEStoreService;

  async main() {
    const browserWSEndpoint = await this.wSEStoreService.getWsEndpoint('test');

    const browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.goto('https://www.baidu.com/', {
      waitUntil: 'load',
    });
  }

  async run() {
    return pRetry(this.main.bind(this), {
      // retries: 1,
      forever: true,
      maxRetryTime: 60 * 1000 * 10,
      onFailedAttempt(error) {
        console.log('AT-[ error &&&&&********** ]', error);
      },
    });
  }
}
