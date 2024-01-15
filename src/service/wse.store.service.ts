import { Provide, Inject } from '@midwayjs/core';
import { CacheManager } from '@midwayjs/cache';
import puppeteer from 'puppeteer-core';
import { fullScreenChrome } from '../util';

import path = require('path');

@Provide()
export class WSEStoreService {
  @Inject()
  cache: CacheManager;

  async getWsEndpoint(signal: string, headless = false) {
    const wseKey = 'wse' + signal;

    let wsEndpoint: string | undefined = await this.cache.get(wseKey);

    console.log('AT-[ wsEndpoint ========== ]', wsEndpoint);

    if (!wsEndpoint) {
      const userDataDir = path.join('.cache', signal);

      const browser = await puppeteer.launch({
        userDataDir,
        headless,
        channel: 'chrome',
        defaultViewport: null,
        timeout: 0,

        args: [
          // '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
          '--no-zygote',
          // '--single-process',

          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-notifications',
          '--disable-extensions',
        ],
      });

      wsEndpoint = browser.wsEndpoint();

      await this.cache.set(wseKey, wsEndpoint);
    }

    fullScreenChrome();

    return wsEndpoint;
  }
}
