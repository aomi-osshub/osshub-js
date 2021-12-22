import React, { Component } from 'react';
import { autoBind } from 'jsdk/autoBind';
import { observer } from 'mobx-react';
import { Breadcrumb, Button, Card, Checkbox, Empty, Popover, Radio, Row, Space, Tooltip } from 'antd';
import { DeleteOutlined, FolderAddOutlined, HomeOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { ModalForm, ProFormText, ProFormUploadDragger } from '@ant-design/pro-form';
import { VirtualFile } from '../VirtualFile';
import { FileExplorerService } from '../FileExplorerService';
import { FileItem } from './FileItem';

const ModalConfig = {
  directory: {
    title: '创建文件夹'
  },
  upload: {
    title: '文件上传'
  }
};

export type FileExplorerProps = {
  service: FileExplorerService
  userId: string
  /**
   * 文件选择模式
   */
  selectMode?: 'checkbox' | 'radio';

  /**
   * 选择的文件类型
   * 默认所有文件类型都可选择
   */
  selectFileTypes?: Array<string>;

  /**
   * 默认选择的文件
   */
  defaultValue?: Array<string>;

  /**
   * 选择的文件
   */
  value?: Array<string>;

  /**
   * 发送选择回调事件
   * @param selectedFileIds 选择的文件ID集合
   */
  onSelect?: (selectedFileIds: Array<string>, selectedFiles: Array<VirtualFile>) => void;

  /**
   * 模式
   * browser 浏览模式,当为该值时files必填
   * explorer 管理模式
   *
   * 默认管理模式
   */
  mode?: 'browser' | 'explorer';

  /**
   * 文件列表
   * @see mode
   */
  files?: Array<VirtualFile>;

  accept?: string
};

/**
 * 文件浏览
 * @constructor
 */
@observer
@autoBind
export class FileExplorer extends Component<FileExplorerProps, any> {
  state: any = {
    formVisible: false,
    confirmDeleteVisible: false,
    modalType: ''
  };

  constructor(props) {
    super(props);
    this.init(props.service);
    props.service.selected(props.defaultValue || []);
  }

  async init(service: FileExplorerService) {
    await service.updateToken();
    await service.browse('/');
  }

  switchFormVisible() {
    this.setState({ formVisible: !this.state.formVisible });
  }

  toggleConfirmDelete() {
    this.setState({ confirmDeleteVisible: !this.state.confirmDeleteVisible });
  }

  handleSelect(e) {
    const { selectMode, onSelect, service } = this.props;
    const { files } = service;
    let selectedFileIds = service.selectedFileIds;
    let selectedFiles = service.selectedFiles;
    if (selectMode === 'checkbox') {
      selectedFileIds = e;
      selectedFiles = [];
      Object.values(files).forEach((item: Array<VirtualFile>) => {
        selectedFiles.push(...item.filter(file => selectedFileIds.includes(file.id)));
      });
    } else if (selectMode === 'radio') {
      const selectedFileId = e.target.value;
      let selectedFile: VirtualFile | undefined;
      Object.values(files).forEach((item: Array<VirtualFile>) => {
        const tmp = item.find(file => file.id === selectedFileId);
        tmp && (selectedFile = tmp);
      });
      selectedFileIds = [selectedFileId];
      selectedFile && (selectedFiles = [selectedFile]);
    }
    service.selected(selectedFileIds, selectedFiles);
    onSelect?.(selectedFileIds, selectedFiles);
  }

  handleSelectAll(e) {
    const checked = e.target.checked;
    const { files, currentDirectory } = this.props.service;
    if (checked) {
      const selectedFiles = files[currentDirectory];
      const selectedFileIds = selectedFiles.map(item => item.id);
      this.props.service.selected(selectedFileIds, selectedFiles);
    } else {
      this.props.service.selected([], []);
    }
  }

  /**
   * 处理表单提交
   */
  async handleFormSubmit(formData) {
    const { service, userId } = this.props;
    const { modalType } = this.state;
    switch (modalType) {
      case 'directory':
        await service.createDirectory({ ...formData, userId });
        break;
    }
    this.setState({ formVisible: false });
  }

  renderTitle() {
    const { service, selectMode } = this.props;
    const { currentDirectory } = service;
    const breadcrumbs = currentDirectory.split('/').filter(item => !!item);

    return (
        <>
          <Row>
            <span>{'文件管理器'}</span>
            <Breadcrumb>
              <Breadcrumb.Item onClick={() => service.browse('/')}>
            <span style={{ cursor: 'pointer' }}>
              <HomeOutlined/>
            </span>
              </Breadcrumb.Item>
              {breadcrumbs.map((item, index) => (
                  <Breadcrumb.Item
                      key={index}
                      onClick={() => service.browse(`/${breadcrumbs.slice(0, index + 1).join('/')}`)}>
                    <span style={{ cursor: 'pointer' }}>{item}</span>
                  </Breadcrumb.Item>
              ))}
            </Breadcrumb>
          </Row>
          {selectMode === 'checkbox' && (
              <Checkbox onChange={this.handleSelectAll}>{'全选'}</Checkbox>
          )}
        </>
    );
  }

  renderAction() {
    const { service, value } = this.props;
    const { confirmDeleteVisible } = this.state;

    const selectedFileIds = value || service.selectedFileIds;

    return (
        <Space>
          <Tooltip title="文件删除">
            <Popover
                content={
                  <Space>
                    <Button size="small" onClick={this.toggleConfirmDelete}>{'取消'}</Button>
                    <Button size="small" type="primary" danger onClick={() => {
                      this.toggleConfirmDelete();
                      service.del(selectedFileIds);
                    }}>{'确认'}</Button>
                  </Space>
                }
                title="文件删除后无法恢复,请确认是否要删除选中的文件"
                trigger="click"
                visible={confirmDeleteVisible}
                onVisibleChange={this.toggleConfirmDelete}
            >
              <Button type="primary" shape="circle" danger icon={<DeleteOutlined/>} disabled={selectedFileIds?.length === 0}/>
            </Popover>
          </Tooltip>
          <Tooltip title="新建文件夹">
            <Button
                type="primary"
                shape="circle"
                icon={<FolderAddOutlined/>}
                onClick={() => this.setState({ formVisible: true, modalType: 'directory' })}
            />
          </Tooltip>
          <Tooltip title="文件上传">
            <Button
                type="primary"
                shape="circle"
                icon={<UploadOutlined/>}
                onClick={() => this.setState({ formVisible: true, modalType: 'upload' })}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <Button type="primary" shape="circle" icon={<ReloadOutlined/>} onClick={service.refresh}/>
          </Tooltip>
        </Space>
    );
  }

  render() {
    const { selectFileTypes, selectMode = 'checkbox', mode = 'explorer', files: userFiles = [], value, service, userId, accept } = this.props;
    const { formVisible, modalType } = this.state;
    const { files, currentDirectory, loading } = service;

    const currentFiles = mode === 'browser' ? userFiles : files[currentDirectory] || [];

    const modalConfig = ModalConfig[modalType] || {};

    const SelectGroup = selectMode === 'radio' ? Radio.Group : Checkbox.Group;

    const selectedFileIds: any = value || service.selectedFileIds;

    const cardProps: any = {};
    if (mode === 'explorer') {
      cardProps.extra = this.renderAction();
    }

    return (
        <>
          <Card {...cardProps} title={this.renderTitle()} loading={loading} bordered={false}>
            <SelectGroup
                onChange={this.handleSelect}
                value={selectMode === 'radio' ? selectedFileIds?.[0] : selectedFileIds}>
              <Space wrap>
                {currentFiles.map((file, index) => (
                    <FileItem
                        service={service}
                        file={file}
                        files={currentFiles}
                        selectFileTypes={selectFileTypes}
                        selectMode={selectMode}
                        selectedFileIds={selectedFileIds}
                        key={index}
                    />
                ))}
              </Space>
            </SelectGroup>
            {currentFiles.length === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Empty/>
                </div>
            )}
          </Card>
          <ModalForm
              title={modalConfig?.title}
              visible={formVisible}
              modalProps={{ onCancel: this.switchFormVisible }}
              onFinish={this.handleFormSubmit}>
            {modalType === 'directory' && (
                <ProFormText name="name" label="文件夹名称" required/>
            )}
            {modalType === 'upload' && (
                <ProFormUploadDragger name="file" required fieldProps={{
                  multiple: true,
                  accept: accept || '.jpg,.jpeg,.png,.mp4',
                  // 直接返回文件，不执行上传动作,等待最终提交
                  customRequest: (args: any) => service.upload({ ...args, userId })
                }}/>
            )}
          </ModalForm>
        </>
    );
  }
}
