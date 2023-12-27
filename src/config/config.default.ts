import { MidwayConfig } from '@midwayjs/core';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1703663020126_3622',
  koa: {
    port: 7008,
  },

  midwayLogger: {
    default: {
      // dir: './abc',
    },
    clients: {
      dispatchJobLogger: {
        fileLogName: 'dispatch.job.log',
      },
    },
  },
} as MidwayConfig;
