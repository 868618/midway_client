import { Provide, Inject } from '@midwayjs/core';
import { WSEStoreService } from './wse.store.service';
import puppeteer from 'puppeteer-core';

@Provide()
export class NetDIskService {
  @Inject()
  wseService: WSEStoreService;

  async download(url: string) {
    console.log('AT-[ url &&&&&********** ]', url);

    const browserWSEndpoint = await this.wseService.getWsEndpoint(
      'netdisk',
      false
    );

    puppeteer.executablePath = () => __dirname;

    const browser = await puppeteer.connect({
      browserWSEndpoint,
      defaultViewport: null,
    });

    const cdpSession = await browser.target().createCDPSession();

    // await cdpSession.send('Page.setDownloadBehavior', {
    //   behavior: 'allow', //允许所有下载请求
    //   downloadPath: __dirname, //设置下载路径
    // });

    cdpSession.on(
      'Browser.downloadProgress',
      (event: {
        guid: string;
        totalBytes: number;
        receivedBytes: number;
        state: string;
      }): void => {
        console.log(event);
        // if (event.state === 'completed' || event.state === 'canceled') {
        // }
      }
    );

    const page = await browser.newPage();

    // 监听页面的 response 事件
    page.on('response', async response => {
      console.log('AT-[ response &&&&&********** ]', response);
      // const contentDisposition = response.headers()['content-disposition'];
    });

    await page.goto(url, { waitUntil: 'load' });

    /**
     * 点击下载
     */

    const element = await page.waitForSelector('.trigger-wrap');

    element.click();
  }
}
