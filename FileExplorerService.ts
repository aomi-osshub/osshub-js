import { action, makeAutoObservable, observable } from 'mobx';
import { HttpMethod } from '@aomi/common-service/constants/HttpMethod';
import { execute, HttpRequest, HttpResponse } from '@aomi/common-service/HttpService';
import { VirtualFile } from './VirtualFile';
import ErrorCode from '@aomi/common-service/constants/ErrorCode';
import { ServiceError } from '@aomi/common-service/exception/ServiceError';
import { ObjectUtils } from '@aomi/utils/ObjectUtils';

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
   * 公网可访问 osshub api 地址
   */
  publicBaseApi;
  /**
   * 获取token的url地址
   */
  tokenUrl;

  getTokenArgs: (() => Omit<HttpRequest, 'url' | 'method'>) | undefined;

  requestArgs: Omit<HttpRequest, 'url' | 'method'> | undefined = {};

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

  constructor({ baseApi, publicBaseApi, tokenUrl, getTokenArgs, requestArgs }: {
    baseApi: string,
    publicBaseApi: string,
    tokenUrl: string
    getTokenArgs?: (() => Omit<HttpRequest, 'url' & 'method'>)
    requestArgs?: Omit<HttpRequest, 'url' | 'method'>
  }) {
    makeAutoObservable(this, undefined, {
      autoBind: true
    });
    this.baseApi = baseApi;
    this.publicBaseApi = publicBaseApi;
    this.tokenUrl = tokenUrl;
    this.getTokenArgs = getTokenArgs;
    this.requestArgs = requestArgs;
  }

  @action
  async updateToken() {
    this.token = handleResponse(await execute({
      url: this.tokenUrl,
      method: HttpMethod.POST,
      ...(this.getTokenArgs?.() || {})
    }));
  }

  @action
  async browse(directory) {
    if (this.loading) {
      return;
    }
    this.loading = true;
    try {
      this.files[directory] = handleResponse(await this.execute({
        url: `${this.baseApi}/files`,
        body: {
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

  /**
   *
   * @param onSuccess 上传成功
   * @param onError 上传失败
   * @param data 附加数据
   * @param file 文件信息
   * @param fileName 文件名
   * @param userId 用户ID
   */
  @action
  async upload({ onSuccess, onError, data, file, fileName, userId }: {
    onSuccess?: (res: HttpResponse) => void,
    onError?: (e: any) => void,
    data?: any
    file: any,
    fileName?: string
    userId: string
  }) {
    const body = new FormData();
    body.append('file', file, fileName);
    body.append('directory', this.currentDirectory);
    body.append('userId', userId);
    data &&
    Object.keys(data).forEach(key => {
      body.append(key, data[key]);
    });

    try {
      const payload = await this.execute({
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
      await this.execute({
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
    return `${this.publicBaseApi}/files/${file.accessSource}${withToken ? `?token=${this.token?.id}` : ''}`;
  }

  private execute({ headers = {}, ...args }: HttpRequest) {
    const newHeaders = {
      ...headers,
      'X-token': this.token?.id
    };
    const requestArgs = ObjectUtils.deepmerge({ timeout: 60000 * 3, ...args, headers: newHeaders }, this.requestArgs);

    return execute(requestArgs);
  }
}
