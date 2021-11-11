import { FileType } from './FileType';

export type VirtualFile = {
  id: string;
  name: string;
  type: FileType;
  directory: string;
  accessSource: string;
};
