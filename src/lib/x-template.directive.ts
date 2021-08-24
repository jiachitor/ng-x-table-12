import { Directive, Host, Input, TemplateRef } from '@angular/core';

import { XTemplateService } from './x-template.service';

/**
 * 模板标识指令
 */

@Directive({
  selector: '[x-template]'
})
export class XTemplateDirective {
  @Input('x-template') templateName = null;

  constructor(@Host() private templateService: XTemplateService, private templateRef: TemplateRef<any>) {}

  ngOnInit() {
    this.templateService.templateMap[this.templateName] = this.templateRef;
  }

}
