import { FileType } from './FileType';

export type VirtualFile = {
  id: string;
  name: string;
  fullName: string;
  type: FileType;
  directory: string;
  directoryId?: string;
  accessSource: string;
};
