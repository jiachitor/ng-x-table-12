import { NgModule, Optional } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { XTableComponent } from './x-table/x-table.component';
import { XAttrDirective } from './x-attr.directive';
import { XTemplateDirective } from './x-template.directive';

@NgModule({
  declarations: [XTableComponent, XAttrDirective, XTemplateDirective],
  exports: [XTableComponent, XTemplateDirective, XAttrDirective],
  imports: [
    CommonModule,
    FormsModule,
  ]
})
export class XTableModule { 
  constructor(@Optional() browserAnimationsModule: BrowserAnimationsModule, @Optional() httpClientModule: HttpClientModule) {
    if(!browserAnimationsModule) {
      throw new Error(`请在 AppModule 导入 BrowserAnimationsModule`);
    }
    if(!httpClientModule) {
      throw new Error(`请在 AppModule 导入 HttpClientModule`);
    }
  }
}
