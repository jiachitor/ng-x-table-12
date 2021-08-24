# ng-x-table

## 概述
`x-table` 是一款可配置化的 Angular 数据表格组件。并不依赖于其他UI组件库。

## 文档与示例  
<h3><a target="_blank" href="https://xujz520.gitee.io/ng-easy-mock/x-table/">https://xujz520.gitee.io/ng-easy-mock/x-table/</a></h3>

![](https://xujz520.gitee.io/ng-easy-mock/x-table/assets/docs/20210707163137.png "")

## 浏览器环境
| ![](https://xujz520.gitee.io/ng-easy-mock/x-table/assets/docs/edge.png) | ![](https://xujz520.gitee.io/ng-easy-mock/x-table/assets/docs/chrome.png) | ![](https://xujz520.gitee.io/ng-easy-mock/x-table/assets/docs/firefox.png) | ![](https://xujz520.gitee.io/ng-easy-mock/x-table/assets/docs/safari.png) |
| ---- | ---- | ---- | :----: |
| Edge | Chrome | Firefox | Safari 13.1+|

## 安装
```bash
npm i @ng-dms/x-table --save
```

## 如何使用
#### 导入模块
在根模块 `AppModule` 导入 `BrowserAnimationsModule` `HttpClientModule`.
```ts
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

import { SharedModule } from './shared/shared.module';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,

    BrowserAnimationsModule,
    HttpClientModule,
    
    SharedModule,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

在业务级模块 或 `sharedModule` 导入 `@ng-dms/x-table`
```ts
import { XTableModule } from '@ng-dms/x-table';

@NgModule({
  declarations: [],
  imports: [
    SharedModule
  ]
})
export class SharedModule { }
```

#### 组件代码

<a href="https://stackblitz.com/edit/ng-x-table-demo?file=src/app/routes/routes.module.ts" target="_blank">在 StackBlitz 上打开</a>

```ts
import { Component, OnInit } from '@angular/core';

import { XTableColumns } from '@ng-dms/x-table';

@Component({
  selector: 'x-table-base',
  template: `
    <x-table [columns]="columns" [xData]="rows"></x-table>
  `,
  styles: []
})
export class XTableBaseComponent implements OnInit {
  columns: XTableColumns = [
    { title: '学号', field: 'no' },
    { title: '姓名', field: 'name' },
    { title: '性别', field: 'sex' },
    { title: '年龄', field: 'age' },
    { title: '学院', field: 'college' },
    { title: '专业', field: 'major' },
    { title: '班级', field: 'class' },
  ];

  rows = [
    { "id": 1, "no": 7107320614, "name": "黎勇", "sex": 0, "age": 28, "college": "外语外贸学院", "major": "国际邮轮乘务管理", "class": 1 },
    { "id": 2, "no": 7107320615, "name": "黎秀兰", "sex": 1, "age": 26, "college": "外语外贸学院", "major": "国际贸易实务", "class": 1 },
    { "id": 3, "no": 7107320616, "name": "董霞", "sex": 0, "age": 26, "college": "外语外贸学院", "major": "国际贸易实务", "class": 2 },
    { "id": 4, "no": 7107320617, "name": "梁磊", "sex": 0, "age": 21, "college": "土木工程学院", "major": "建筑工程技术", "class": 1 },
    { "id": 5, "no": 7107320618, "name": "潘娟", "sex": 0, "age": 24, "college": "外语外贸学院", "major": "国际邮轮乘务管理", "class": 1 }
  ];

  constructor() { }

  ngOnInit() { }

}
```