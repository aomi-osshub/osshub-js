import { action, makeAutoObservable, observable } from 'mobx';
import { HttpMethod } from '@aomi/common-service/constants/HttpMethod';
import { execute, HttpResponse } from '@aomi/common-service/HttpService';
import { VirtualFile } from './VirtualFile';
import ErrorCode from '@aomi/common-service/constants/ErrorCode';
import { ServiceError } from '@aomi/common-service/exception/ServiceError';

export const IMAGE_SUFFIX = ['.jpg', '.jpeg', '.png', '.gif'];
export const VIDEO_SUFFIX = ['.mp4'];


/**
 * 是否是图片
 * @param name 文件名称
 */
export function isImage(name): boolean {
  const suffix = name.substring(name.lastIndexOf('.'));
  return IMAGE_SUFFIX.includes(suffix);
}

/**
 * 是否是视频
 * @param name 文件名称
 */
export function isVideo(name): boolean {
  const suffix = name.substring(name.lastIndexOf('.'));
  return VIDEO_SUFFIX.includes(suffix);
}

/**
 * 处理响应结果
 * @param res
 */
function handleResponse(res: HttpResponse) {
  const { status, payload } = res;
  if (status === ErrorCode.SUCCESS) {
    return payload;
  }

  throw new ServiceError(res as any);
}

/**
 * 文件浏览服务
 */
export class FileExplorerService {

  /**
   * osshub api 地址
   */
  baseApi;
  /**
   * 获取token的url地址
   */
  tokenUrl;

  @observable
  files: { [key: string]: Array<VirtualFile> } = {
    '/': []
  };

  @observable
  currentDirectory = '/';

  @observable
  token: any = {};

  @observable
  loading = false;

  constructor({ baseApi, tokenUrl }) {
    makeAutoObservable(this, undefined, {
      autoBind: true
    });
    this.baseApi = baseApi;
    this.tokenUrl = tokenUrl;
  }

  @action
  async browse(directory) {
    if (this.loading) {
      return;
    }
    this.loading = true;
    try {
      this.files[directory] = handleResponse(await execute({
        url: `${this.baseApi}/files`,
        body: {
          token: this.token?.id,
          directory
        }
      }));
      this.currentDirectory = directory;
    } finally {
      this.loading = false;
    }
  }

  @action
  async refresh() {
    this.browse(this.currentDirectory);
  }

  @action
  async updateToken() {
    this.token = handleResponse(await execute({
      url: this.tokenUrl,
      method: HttpMethod.POST
    }));
  }

  @action
  async upload({ onSuccess, onError, data, file, fileOptions, userId }) {
    const body = new FormData();
    body.append('file', file, fileOptions);
    body.append('directory', this.currentDirectory);
    body.append('userId', userId);
    body.append('token', this.token?.id);
    data &&
    Object.keys(data).forEach(key => {
      body.append(key, data[key]);
    });

    try {
      const payload = await execute({
        url: `${this.baseApi}/files`,
        method: HttpMethod.POST,
        body,
        upload: true
      });
      onSuccess && onSuccess(payload);
      return payload;
    } catch (e) {
      console.warn('文件上传失败', e);
      onError && onError(e);
    }
  }

  @action
  async createDirectory(args) {
    if (this.loading) {
      return;
    }
    this.loading = true;
    try {
      await execute({
        url: `${this.baseApi}/files/directories`,
        method: HttpMethod.POST,
        body: {
          parent: this.currentDirectory,
          ...args
        }
      });
      this.loading = false;
      await this.browse(this.currentDirectory);
    } finally {
      this.loading = false;
    }
  }

  getSource(file, withToken?: boolean): string {
    return `${this.baseApi}/files/${file.accessSource}${withToken ? `?token=${this.token?.id}` : ''}`;
  }

}