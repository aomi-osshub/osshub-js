import React, { useState } from 'react';
import { Checkbox, Image, Radio, Tooltip } from 'antd';


import fileIcon from './GenericDocumentIcon.svg';
import folderIcon from './GenericFolderIcon.svg';

import styles from './filexplorer.module.scss';
import { AllFileType, FileType } from '../FileType';
import { VirtualFile } from '../VirtualFile';
import { FileExplorerService, isImage, isVideo } from '../FileExplorerService';

const thumbnailStyle = { width: 'auto', height: 80 };

export function renderThumbnail(service,file, { onImageClick }) {
  const { type, name } = file;
  if (type === FileType.DIRECTORY) {
    return <img alt={name} src={folderIcon} style={thumbnailStyle} />;
  }

  const source = service.getSource(file);
  if (isImage(name)) {
    return (
      <Image style={thumbnailStyle} src={source} fallback={file} preview={{ visible: false }} onClick={onImageClick} />
    );
  } else if (isVideo(name)) {
    return <video src={source} style={thumbnailStyle} />;
  }

  return <img alt={name} src={fileIcon} style={thumbnailStyle} />;
}

export type FileItemProps = {
  service: FileExplorerService
  /**
   * 当前显示的文件信息
   */
  file: VirtualFile;
  /**
   * 当前目录所有文件
   */
  files: Array<VirtualFile>;
  /**
   * 是否启用文件选择功能
   */
  selectEnabled?: boolean;

  /**
   * 文件选择模式
   */
  selectMode?: 'checkbox' | 'radio';

  /**
   * 当前选择的文件ID
   */
  selectedFileIds?: Array<string>;

  /**
   * 选择的文件类型
   * 默认所有文件类型都可选择
   */
  selectFileTypes?: Array<string>;
};

export function FileItem(props: FileItemProps) {
  const {
    service,
    file,
    files,
    selectEnabled = true,
    selectMode = 'checkbox',
    selectFileTypes = [],
    selectedFileIds = [],
  } = props;
  const { type, name, directory } = file;

  // 图片浏览弹框启用关闭状态
  const [visiblePreview, setVisiblePreview] = useState(false);

  // 当前文件夹中的所有图片,用于放大预览
  const images = files.filter(item => isImage(item.name));

  function handleClick() {
    if (type === FileType.DIRECTORY) {
      service.browse(`${directory === '/' ? '' : directory}/${name}`);
      return;
    }
  }

  const checked = selectedFileIds.includes(file.id);
  const checkboxProps: any = {
    checked,
    value: file.id,
  };
  if (selectFileTypes.length > 0 && !selectFileTypes.includes(name.substring(name.lastIndexOf('.'))) || AllFileType.includes(type)) {
    checkboxProps.disabled = true;
  }
  if (checked) {
    checkboxProps.style = { display: 'block' };
  }

  if (!selectEnabled) {
    checkboxProps.style = { display: 'none' };
  }

  const SelectItem = selectMode === 'radio' ? Radio : Checkbox;

  return (
    <Tooltip title={name} placement="bottom">
      <div className={styles.item}>
        <div className={styles.itemContent} onClick={handleClick}>
          {renderThumbnail(service,file, { onImageClick: () => setVisiblePreview(true) })}
          <p className={styles.itemName}>{name}</p>
          <div style={{ display: 'none' }}>
            <Image.PreviewGroup
              preview={{
                visible: visiblePreview,
                onVisibleChange: vis => setVisiblePreview(vis),
                current: images.findIndex(item => item.id === file.id),
              }}>
              {images.map((item, index) => (
                <Image key={index} src={service.getSource(item)} />
              ))}
            </Image.PreviewGroup>
          </div>
        </div>
        <SelectItem {...checkboxProps} className={styles.itemCheckbox} />
      </div>
    </Tooltip>
  );
}
