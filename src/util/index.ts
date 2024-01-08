import { promisify } from 'util';
import { exec, spawnSync, execSync } from 'child_process';
import * as lodash from 'lodash';
import * as os from 'os';
import path = require('path');

export const killChrome = () => {
  const command = 'taskkill /F /IM chrome.exe';
  const execPromise = promisify(exec);

  return execPromise(command);
};

export const getCurrentNetInterface = () => {
  if (os.platform() === 'darwin') {
    console.error('Mac system does not support');
    return null;
  }

  // 使用 PowerShell 命令设置控制台编码为 UTF-8
  const powershellCmd = 'powershell';

  const powershellArgs = ['-Command', '$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8'];

  // 执行 PowerShell 命令
  spawnSync(powershellCmd, powershellArgs);

  const ls = spawnSync('netsh', ['interface', 'show', 'interface'], {
    encoding: 'utf-8',
  });

  const interfaces = ls.stdout
    .toString()
    .split('\r\n')
    .filter(Boolean)
    .slice(-2)
    .map(i => i.split(' ').filter(Boolean))
    .map(i => Object.fromEntries(lodash.zip(['admin', 'state', 'type', 'name'], i)));

  const { name } = interfaces.find(i => i.state === 'Connected');

  return name;
};

export const fullScreenChrome = () => {
  if (os.platform() === 'win32') {
    const activeChromeAhkScriptPath = path.join(__dirname, '../scripts/active.ahk');

    try {
      // 同步执行命令
      execSync(activeChromeAhkScriptPath);
    } catch (error) {
      console.error(`执行chrome全屏出错: ${error}`);
    }
  }
};

export const desktop = path.join(os.homedir(), 'Desktop');

export const setNetInterface = async (ip: string) => {
  if (os.platform() === 'darwin') {
    console.error('Mac system does not support');
    return null;
  }

  // 使用 PowerShell 命令设置控制台编码为 UTF-8
  const powershellCmd = 'powershell';

  const powershellArgs = ['-Command', '$OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8'];

  // 执行 PowerShell 命令
  spawnSync(powershellCmd, powershellArgs);

  // const execPromise = promisify(exec);

  // const interfaces = getAllnetshInterface().filter(i => i.state);

  const ls = spawnSync('netsh', ['interface', 'show', 'interface'], {
    encoding: 'utf-8',
  });

  const interfaces = ls.stdout
    .toString()
    .split('\r\n')
    .filter(Boolean)
    .slice(-2)
    .map(i => i.split(' ').filter(Boolean))
    .map(i => Object.fromEntries(lodash.zip(['admin', 'state', 'type', 'name'], i)));

  for (const item of interfaces) {
    const admin = ip === item.name ? 'enable' : 'disable';

    execSync(`netsh interface set interface ${item.name} admin=${admin}`);
  }
};
