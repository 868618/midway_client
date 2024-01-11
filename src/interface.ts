/**
 * @description User-Service parameters
 */
export interface IUserOptions {
  uid: number;
}

export interface Tasks {
  date: string;

  folder: string;

  status?: 'waiting' | 'running' | 'done';

  ip?: string;

  platforms: ('xhs' | 'bili')[];

  uuid?: string;
}

export interface ITask {
  tasks: Tasks[];

  ipMap: {
    floder: string;
    ip: string;
  }[];
}
