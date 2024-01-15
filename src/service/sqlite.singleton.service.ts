import { Provide, Singleton, Destroy } from '@midwayjs/core';
import { Sequelize, ModelStatic, Model } from 'sequelize';
import * as path from 'path';
import * as colors from 'ansi-colors';
import { debounce, uniqBy } from 'lodash';

@Provide()
@Singleton()
export class SqliteService {
  private db: Sequelize;

  private storagePath = path.resolve(__dirname, '../database/sqlite.db');

  private queue: any[] = [];

  update = debounce(async (model: ModelStatic<Model<any, any>>) => {
    const list = uniqBy(this.queue, 'hash');
    await model.bulkCreate(list);
    console.log('清空一下');
    this.queue = [];
  }, 200);

  async bulkCreate(model: ModelStatic<Model<any, any>>, data: any) {
    this.queue.push(data);
    this.update(model);
  }

  async close() {
    return await this.db.close();
  }

  getInstance() {
    return this.db;
  }

  getAllModel() {
    return this.db.models;
  }

  // @Init()
  async init() {
    const sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: this.storagePath, // SQLite 数据库文件路径
      define: {
        freezeTableName: true,
      },

      logging: false,
    });

    return sequelize
      .authenticate()
      .then(() => {
        this.db = sequelize;
      })
      .then(() => {
        console.log('\r\n', colors.cyan('🚀 报告首长，sqlite数据库已经准备完毕，随时待命 successfully.'), '\r\n');
      })
      .catch(error => {
        console.error('Unable to connect to the database:', error);
      });
  }

  @Destroy()
  async stop() {
    console.log(colors.red('数据库连接销毁前执行的逻辑'));
  }
}
