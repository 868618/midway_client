/**
 * @description User-Service parameters
 */
export interface IUserOptions {
  uid: number;
}

export interface ITask {
  tasks: {
    date: string;

    folder: string;

    status?: 'waiting' | 'running' | 'done';

    ip?: string;

    platforms: ('xhs' | 'bili')[];
  }[];

  ipMap: {
    floder: string;
    ip: string;
  }[];
}
