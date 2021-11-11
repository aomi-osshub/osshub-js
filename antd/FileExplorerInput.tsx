import React, { useState } from 'react';
import { Button, ButtonProps, Modal, Space } from 'antd';
import { VirtualFile } from '../VirtualFile';
import { FileExplorer, FileExplorerProps } from './FileExplorer';
import { FileItem } from './FileItem';

export type FileExplorerInputProps = {
  /**
   * 选择的文件ID
   */
  value?: Array<VirtualFile> | VirtualFile | undefined;
  onChange?: (value: Array<VirtualFile> | VirtualFile) => void;
  buttonProps?: ButtonProps;
} & FileExplorerProps;

export function FileExplorerInput({
  value,
  onChange,
  buttonProps,

  selectFileTypes,
  selectMode,
  ...props
}: FileExplorerInputProps) {
  const [visible, setVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState();

  // 触发change
  const triggerChange = params => {
    onChange?.(params);
  };

  function handleOk() {
    triggerChange(selectMode === 'radio' ? selectedFiles?.[0] : selectedFiles);
    setVisible(false);
  }

  function handleSelect(_, files) {
    setSelectedFiles(files);
  }

  let files: Array<VirtualFile> = [];
  switch (selectMode) {
    case 'checkbox':
      value && !Array.isArray(value) && console.warn('[FileExplorerInput] 当mode为none时,value值必须是数组');
      files = value as Array<VirtualFile>;
      break;
    case 'radio':
      value && Array.isArray(value) && console.warn('[FileExplorerInput] 当mode为none时,value值不能是数组');
      files = [];
      value && files.push(value as VirtualFile);
      break;
    default:
      console.warn(`[FileExplorerInput] 不支持的模式${selectMode}`);
      break;
  }
  const defaultSelectedFileIds = files.map(file => file.id);

  return (
    <>
      <Space wrap>
        {files?.map((item, index) => (
          <FileItem service={props.service} file={item} files={files} key={index} selectEnabled={false} />
        ))}
      </Space>
      <Button children="选择" {...buttonProps} onClick={() => setVisible(true)} />
      <Modal
        visible={visible}
        onCancel={() => setVisible(false)}
        width="80%"
        title={null}
        onOk={handleOk}
        bodyStyle={{ padding: 0 }}
        closable={false}>
        <FileExplorer
          selectMode={selectMode}
          selectFileTypes={selectFileTypes}
          onSelect={handleSelect}
          defaultValue={defaultSelectedFileIds}
          {...props}
        />
      </Modal>
    </>
  );
}
