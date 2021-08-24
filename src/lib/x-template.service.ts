import { Injectable, TemplateRef } from '@angular/core';

/**
 * 模板服务, 在 x-table 组件注册
 */

@Injectable()
export class XTemplateService {

  templateMap: { [templateName: string]: TemplateRef<any> } = {};

  constructor() { }
}
