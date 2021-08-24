import { Component, OnInit, HostBinding, Input, Output, EventEmitter, SimpleChanges, ElementRef, TemplateRef, ChangeDetectionStrategy, ChangeDetectorRef, Inject, Optional, NgZone, LOCALE_ID } from '@angular/core';
import { DecimalPipe, CurrencyPipe, PercentPipe, DatePipe, SlicePipe, JsonPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser'
import { trigger, transition, style, animate } from '@angular/animations';

import { fromEvent, Subject } from 'rxjs';
import { debounceTime, map, filter } from 'rxjs/operators';

// x-scrollbar 滚动条(https://gitee.com/xujz520/x-scrollbar)
import XScrollbar from 'x-scrollbar';

// 接口
import { XTableColumn, XTableColumns, CheckboxEventParams, XTableConfigService } from '../interfaces';
// 模板服务
import { XTemplateService } from '../x-template.service';

@Component({
  selector: 'x-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './x-table.component.html',
  styleUrls: [
    './x-table.component.scss',
    './xscrollbar.scss'
  ],
  providers: [XTemplateService],
  animations: [
    trigger('insertRemoveTrigger', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.3s', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('0.3s', style({ opacity: 0 }))
      ])
    ]),
    trigger('MsgInsertRemoveTrigger', [
      transition(':enter', [
        style({
          opacity: 0,
          transform: 'translate(0, -40px)'
        }),
        animate('0.3s', style({
          opacity: 1,
          transform: 'translate(0, 0)'
        }))
      ]),
      transition(':leave', [
        animate('0.3s', style({
          opacity: 0,
          transform: 'translate(0, -40px)'
        }))
      ])
    ])
  ],
})
export class XTableComponent implements OnInit {
  nativeElement: HTMLElement = null;
  // 实例引用标识
  @Input() ref: string = null;
  // 工具栏
  @Input() toolbar: TemplateRef<any> = null;
  // 是否已经固定列
  hasStickyColumn = false;
  // 懒加载模式(首次调用 reload方法 后再初始化)
  @Input() lazy = false;
  hasCallReload = false;

  // 数据源
  @Input() xData = [];
  // 当前页数据
  currentPageData = [];
  // 当前页数据渲染完成事件
  @Output() rendered = new EventEmitter<any[]>();
  // 行渲染回调
  @Input() rowCallback: ((tr: HTMLElement, rowData, index) => void) = null;

  // 列配置
  @Input() columns: XTableColumns = [];
  theadColumns = [];
  tbodyColumns = [];
  // 需要隐藏的单元格字典
  noneCellMap = {};

  theadRows = [];
  tbodyRows = [];

  /**
   * 样式
   */
  // ant-design-table 风格
  @Input() antDesignStyle = false;
  // 边框
  @Input() bordered = true;
  // 紧凑的单元格
  @Input() condensed = false;
  // 斑马线
  @Input() striped = true;
  // 水平hover高亮
  @Input() hover = true;
  // 垂直hover高亮
  @Input() verticalHover = true;
  // 内联显示(固定布局下无效)
  @HostBinding('class.x-table-inline') @Input() inline = false;
  // 固定布局
  @Input() fixedLayout = false;
  // 不换行布局(超出容器宽度, 水平滚动)
  @Input() nowrap = true;
  // 自动计算高度
  @Input() autoHeight: boolean | number = false;
  // 固定列过渡效果
  @Input() fixedColumnAnimated = true;
  setMaxHeightSubject = new Subject();
  _setMaxHeight = () => { this.setMaxHeightSubject.next(); }

  /**
   * x-scrollbar 滚动条
   */
  xscrollbar = null;
  // 滚动条配置
  @Input() scrollOption: object = { preventDefault: false, trackBackground: 'transparent' };
  // 水平滚动条事件 => 激活固定列
  onXScrollSubject = new Subject();

  /**
   * ajax
   */
  // 请求地址
  @Input() url: string = null;
  // 请求方法类型
  @Input() method: 'get' | 'post' = 'get';
  // 是否以 Form键值对 的方式提交参数, 默认 Content-Type: application/json
  @Input() isPostForm = false;
  // 自定义请求头
  @Input() headers: object | (() => object) = null;
  // 请求时是否携带 cookie
  @Input() withCredentials = false;
  // 去除参数中的 null 和 ''
  @Input() shakeNull = true;
  // 请求参数对象(引用值) | 请求前的回调(用于修改请求参数、终止请求(返回false或Promise解析的结果是false))
  @Input() params: object | ((params) => object | false | Promise<object | false>) = null;
  // 请求成功的回调, 用于修改服务器返回的数据
  @Input() success: ((res) => object) = null;
  // 成功条件(示例： data.code == 0), 为空则不验证
  @Input() successCondition = '';
  // 错误消息, 错误消息字段名(示例： data、data.msg) 或 固定文本，为空则不提示(可在上层http拦截器中统一处理)
  @Input() errorField = '';
  // 行数据 字段路径
  @Input() dataPath: string | ((res) => any[]) = 'data.data';
  // 总行数 字段路径
  @Input() totalPath: string | ((res) => number) = 'data.total';
  // 遮罩层
  @Input() loading = false;
  @Output() loadingChange = new EventEmitter<Boolean>();
  // HTTP 异常事件
  @Input() showHttpErrorMsg = true;
  @Output() httpError = new EventEmitter<any>();

  /**
   * 分页
   */
  // 是否显示分页器
  @Input() showPagination = true;
  // 是否显示每页大小选择控件
  @Input() showPageSizeChange = true;
  @Input() pageSize = 20;
  @Input() pageSizeList = [10, 20, 50, 100, 200];
  // 是否显示分页信息
  @Input() showPaginationInfo = true;
  paginationInfo = '';
  // 是否服务器端分页
  @Input() serverPagination = true;
  @Input() pageIndexField = 'pageIndex';  // 页码字段, 设置为 null 则不发送
  @Input() pageOffsetStart = 'offsetStart'; // 分页起始行的偏移字段, 设置为 null 则不发送
  @Input() pageSizeField = 'pageSize';  // 页面大小字段
  // 流式分页
  @Input() flowPagination = false;
  // 分页按钮列表
  paginationBtns = [];
  // 可显示的最大分页按钮数量(建议奇数左右对称)
  @Input() maxPaginationBtnNumber = 7;
  // 当前页码
  pageIndex = 1;
  // 最后一页的页码(流式分页)
  lastPageIndex = null;
  // 总记录数
  totalRowNumber = 0;
  // 总页数
  totalPageNumber = 0;

  /**
   * checkbox
   */
  // 是否显示 checkbox列
  @Input() showCheckbox = true;
  // 是否高亮被选中的行
  @Input() chkCheckedHighlight = true;
  // 是否可多选
  @Input() chkMultiple = true;
  // 主键字段(来标识不同的行, 用于跨页勾选)
  @Input() key: string = null;
  // 选中的行列表
  @Input() checkedRows = [];
  @Output() checkedRowsChange = new EventEmitter<any[]>();
  // 禁用的行列表
  @Input() disabledRows = [];
  @Output() disabledRowsChange = new EventEmitter<any[]>();
  // 默认选中函数
  @Input() checked: (rowData, index) => boolean = null;
  // 默认禁用函数
  @Input() disabled: (rowData, index) => boolean = null;
  // 全选状态标识
  isAllChecked = false;
  // checkbox 选择事件
  @Output() checkedChange = new EventEmitter<CheckboxEventParams>();

  /**
   * 排序
   */
  // 默认启用排序(可在列配置重写)
  @Input() enabledSort = false;
  // 开启多列排序
  @Input() sortMultiple = true;
  // 请求时的排序字段名
  @Input() sortField = 'sorts';
  // 用于记录排序顺序列的列表
  sortColumns = [];

  // 是否显示 行号
  @Input() showRowNumber = true;
  // 行号名称
  @Input() rowNumberTitle = '#';


  constructor(private elementRef: ElementRef, private http: HttpClient, private cdr: ChangeDetectorRef, @Optional() @Inject(XTableConfigService) public config: any, private ngZone: NgZone, private templateService: XTemplateService, @Inject(LOCALE_ID) private locale: string, public sanitizer: DomSanitizer) {
    // 合并默认配置
    Object.entries(config || {}).forEach(([key, value]) => {
      this[key] = value;
    });

    // 观察 激活固定列 事件
    this.onXScrollSubject.pipe(debounceTime(300)).subscribe(() => this.activeStickyColumn());
  }

  ngOnChanges(changes: SimpleChanges) {
    const { columns, url, xData } = changes;

    // 忽略首次的初始变更
    if (Object.values(changes).some(item => item.firstChange)) {
      return;
    }

    if (columns || url || xData) {
      if (columns) {
        this.initColumns();
      }

      if (xData) {
        this.sort();
      }

      if (!this.lazy || (this.lazy && this.hasCallReload)) {
        this.reload(true, false, true);
      }
    }

    // 选中的行列表 & 禁用的行列表 变更
    if (changes.checkedRows || changes.disabledRows) {
      this.syncIsAllChecked();
      this.syncCheckedStyle();
    }
  }

  ngOnInit() {
    // 实例引用标识
    if (this.ref) {
      window[this.ref] = this;
    }

    // 处理分页大小
    if (this.pageSize) {
      this.pageSize = parseInt(this.pageSize.toString())
      if (!this.pageSizeList.includes(this.pageSize)) {
        this.pageSizeList.push(this.pageSize);
        this.pageSizeList = this.pageSizeList.sort((a, b) => a - b);
      }
    } else {
      this.pageSize = this.pageSizeList[0];
    }
  }

  ngAfterViewInit() {
    window.requestAnimationFrame(() => {
      this.initColumns();
      if (this.xData) {
        this.sort();
      }
      if (!this.lazy) {
        this.reload();
      }
    });
  }

  // ngAfterViewChecked() { console.log('ngAfterViewChecked'); }

  ngOnDestroy() {
    window.removeEventListener('resize', this._setMaxHeight);

    // 实例引用标识
    if (this.ref) {
      delete window[this.ref];
    }
  }

  /**
   * 初始化 x-scrollbar 滚动条
   */
  scrollLeft = null;
  initXScrollbar() {
    const table_wrap = this.nativeElement.querySelector<HTMLElement>('.x-table-wrap');
    this.ngZone.runOutsideAngular(() => {
      this.xscrollbar = new XScrollbar(table_wrap, this.scrollOption);
      // 水平滚动事件
      this.xscrollbar.$container.addEventListener('scroll', (e) => {
        let scrollLeft = this.xscrollbar.$container.scrollLeft;
        if (scrollLeft != this.scrollLeft) {
          this.onXScrollSubject.next();
        }
        this.scrollLeft = scrollLeft;
      });
    });
  }

  /**
   * 初始化列
   */
  initColumns() {
    // 克隆
    if (Array.isArray(this.columns[0])) {
      // 多级表头
      this.theadColumns = (<Array<Array<XTableColumn>>>this.columns).map(trColumns => [...trColumns]);
    } else {
      this.theadColumns = [[...this.columns]];
    }

    // 处理列宽度值
    this.theadColumns.forEach(trColumns => {
      trColumns.forEach((col, colIndex) => {
        if (!col) col = trColumns[colIndex] = {};
        col.width = (col.width && !isNaN(col.width)) ? `${col.width}px` : col.width;
        col.minWidth = (col.minWidth && !isNaN(col.minWidth)) ? `${col.minWidth}px` : col.minWidth;
        col.maxWidth = (col.maxWidth && !isNaN(col.maxWidth)) ? `${col.maxWidth}px` : col.maxWidth;
      });
    });

    // 设置排序控制
    this.theadColumns.forEach(trColumns => {
      trColumns.forEach((col, colIndex) => {
        if (col.sort === undefined) {
          if ((typeof col.field == 'string') && (col.field[0] == '#') && !col.sortField) {
            col.sort = false;
          } else {
            col.sort = this.enabledSort;
          }
        }
      });
    });

    // 根据 rowspan 补全
    // [
    //   [{ column: 1, thAttr: { rowspan: 3 } }, { column: 2 }, { column: 3 }],
    //   [{ column: 2 }, { column: 3 }],
    //   [{ column: 2 }, { column: 3 }]
    // ]
    // =>
    // [
    //   [{ column: 1 }, { column: 2 }, { column: 3 }],
    //   [{ _none: true }, { column: 2 }, { column: 3 }],
    //   [{ _none: true }, { column: 2 }, { column: 3 }]
    // ]
    this.theadColumns.forEach((trColumns, trIndex) => {
      let colIndex = 0;
      trColumns.forEach(col => {
        if (col.thAttr && col.thAttr.rowspan > 1) {
          for (let _trIndex = trIndex + 1; _trIndex < (trIndex + Number(col.thAttr.rowspan)); _trIndex++) {
            this.theadColumns[_trIndex] && this.theadColumns[_trIndex].splice(colIndex, 0, { _none: true });
          }
        }
        colIndex += Number(col.thAttr ? (col.thAttr.colspan || 1) : 1);
      });
    });

    // 根据 colspan 补全
    // [
    //   [{ column: 1 }, { column: 2 }, { column: 3 }],
    //   [{ column: 1 }, { column: 2, thAttr: { colspan: 2 } }],
    // ]
    // =>
    // [
    //   [{ column: 1 }, { column: 2 }, { column: 3 }],
    //   [{ column: 1 }, { column: 2 }, { _none: true }],
    // ]
    this.theadColumns.forEach(trColumns => {
      [...trColumns].forEach(col => {
        if (col.thAttr && col.thAttr.colspan > 1) {
          trColumns.splice(trColumns.indexOf(col) + 1, 0, ...new Array(col.thAttr.colspan - 1).fill({ _none: true }))
        }
      });
    });

    // 提取 tbodyColumns
    // [
    //   [{ column: 1, field: 'a', thAttr: { rowspan: 2 } }, { column: 2, thAttr: { colspan: 2 } }],
    //   [{ _none: true }, { column: 21, field: 'b' }, { column: 22, field: 'c' }]
    // ]
    // =>
    // [
    //   { "column": 1, "field": "a", "thAttr": { "rowspan": 2 } },
    //   { "column": 21, "field": "b" },
    //   { "column": 22, "field": "c" }
    // ]
    this.tbodyColumns = [];
    this.theadColumns.forEach(trColumns => {
      trColumns.forEach((col, colIndex) => {
        if (!col._none && !((col.thAttr || {}).colspan > 1)) {
          this.tbodyColumns[colIndex] = col;
        }
      });
    });
    this.tbodyColumns = this.tbodyColumns.filter(col => col);

    // 设置 行号 列
    if (this.showRowNumber && this.tbodyColumns.length) {
      this.theadColumns.forEach((trColumns, trColumnsIndex) => {
        if (trColumnsIndex == 0) {
          trColumns.splice(0, 0, {
            title: this.rowNumberTitle,
            type: 'rowNumber',
            thClass: {
              'x-table-rowNumber-cell': true,
              'x-table-border-bottom-bold': true
            },
            thAttr: { rowspan: this.theadColumns.length },
            fixed: 'left'
          });
        } else {
          trColumns.splice(0, 0, { _none: true });
        }
      });
      this.tbodyColumns.splice(0, 0, {
        type: 'rowNumber',
        tdClass: { 'x-table-rowNumber-cell': true },
        fixed: 'left'
      });
    }

    // 设置 checkbox 列
    if (this.showCheckbox && this.tbodyColumns.length) {
      let chkIndex = this.showRowNumber ? 1 : 0;
      this.theadColumns.forEach((trColumns, trColumnsIndex) => {
        if (trColumnsIndex == 0) {
          trColumns.splice(chkIndex, 0, {
            type: 'chk',
            thClass: {
              'x-table-chk-cell': true,
              'x-table-border-bottom-bold': true
            },
            thAttr: { rowspan: this.theadColumns.length },
            fixed: 'left'
          });
        } else {
          trColumns.splice(chkIndex, 0, { _none: true });
        }
      });
      this.tbodyColumns.splice(chkIndex, 0, {
        type: 'chk',
        tdClass: { 'x-table-chk-cell': true },
        fixed: 'left'
      });
    }

    // 提取默认要排序的列
    this.sortColumns = [];
    if (this.sortMultiple) {
      this.sortColumns = this.theadColumns.reduce((prev, current) => {
        return [...prev, ...current.filter(column => (typeof column.field == 'string' || column.sortField) && (typeof column.sort == 'string'))]
      }, []);
    } else {
      this.theadColumns.forEach(trColumns => {
        trColumns.forEach(column => {
          if ((typeof column.field == 'string' || column.sortField) && (typeof column.sort == 'string')) {
            //单列排序
            if (this.sortColumns.length) {
              column.sort = true;
            } else {
              this.sortColumns.push(column);
            }
          }
        });
      });
    }

    this.setTheadRows();
    // 设置固定表头
    if (this.hasCallReload) {
      window.requestAnimationFrame(() => this.setStickyThead());
    }
  }

  /**
   * 首次显示初始化
   */
  showInit() {
    return new Promise<void>((resolve, reject) => {
      window.requestAnimationFrame(() => {
        this.nativeElement = this.elementRef.nativeElement;
        // 初始化 x-scrollbar 滚动条
        this.initXScrollbar();
        // 初始化垂直高亮
        this.initVerticalHover();
        // 固定表头
        this.setStickyThead();
        // 自动高度
        if (this.autoHeight !== false) {
          this.setMaxHeightSubject.pipe(debounceTime(300)).subscribe(() => this.setMaxHeight());
          window.addEventListener('resize', this._setMaxHeight);
          this.setMaxHeight();
        }
        // 大小变更
        let resizeObserver = new window['ResizeObserver'](entries => {
          let contentRect = entries[0].contentRect;
          // => 隐藏?
          if (!(contentRect.width || contentRect.height)) return;
  
          // 矫正最大高度(可能需要)
          if (this.autoHeight !== false) this._setMaxHeight();
  
          // (有水平滚动条 & 未固定列) => 固定列
          let hasXScrollbar = this.hasScrolled(this.xscrollbar.$container, 'horizontal');
          if (hasXScrollbar && !this.hasStickyColumn) {
            this.setStickyColumn();
          }
          // 激活固定列
          this.onXScrollSubject.next();
        });
        resizeObserver.observe(this.nativeElement);

        resolve();
      });
    });
  }

  /**
   * 设置最大高度
   */
  setMaxHeight() {
    let boundingClientRect = this.nativeElement.getBoundingClientRect();
    if (boundingClientRect.height == 0) return;
    let maxHeight = window.innerHeight - boundingClientRect.top;
    this.autoHeight = parseInt(String(this.autoHeight)) || 0;
    this.nativeElement.style.maxHeight = (maxHeight - Math.abs(this.autoHeight)) + 'px';
  }

  /**
   * 加载数据 & 分页
   * ------------------------------------ */

  /**
   * 加载数据
   * @param resetPage 重置分页
   * @param clearSort 清除排序
   * @param clearChecked 清除勾选
   */
  reload(resetPage = false, clearSort = false, clearChecked = false) {
    let promise = Promise.resolve();
    // 懒加载
    if (!this.hasCallReload) {
      this.hasCallReload = true;
      this.cdr.markForCheck();
      promise = this.showInit();
    }

    return promise.then(() => {
      if (resetPage) {
        this.pageIndex = 1;
        this.lastPageIndex = null;
      }
  
      if (clearSort) {
        this.sortColumns.forEach(column => column.sort = true);
        this.sortColumns = [];
      }
  
      if (clearChecked) {
        this.checkedRows = [];
      }
  
      this.cdr.markForCheck();
  
      if (this.url != null) {
        return this.loadUrlData();
      } else {
        return this.loadNativeData();
      }
    })
    
  }

  /**
   * 加载 服务器端 数据
   */
  async loadUrlData() {
    let params = await this.getParams();
    if (params === false) {
      // params() 返回 false 则终止加载
      return Promise.resolve([]);
    } else {
      params = params || {};
    }

    let request: Promise<any[]> = null;
    let headers = {};
    const withCredentials = this.withCredentials;

    // 设置请求头
    if (typeof this.headers == 'function') {
      headers = (this.headers as Function)();
    } else {
      headers = this.headers || {};
    }

    if (this.method.toLocaleLowerCase() == 'get') {
      // 格式化参数
      Object.entries(params).forEach(([key, value]) => {
        params[key] = String(value);
      });
      request = this.http.get<any>(this.url, { params, headers, withCredentials }).toPromise();
    } else {
      // 表单提交
      if (this.isPostForm) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        params = Object.entries(params).map(([key, value]) => `${key}=${String(value)}`).join('&');
      }
      request = this.http.post<any>(this.url, params, { headers, withCredentials }).toPromise();
    }

    this.loading = true;
    this.loadingChange.emit(this.loading);
    return request.then(
      async (res: any) => {
        // 请求成功的回调
        if (typeof this.success == 'function') {
          res = (await this.success(res || {})) || res || {};
        }

        // 成功判定
        if (this.successCondition) {
          let success = null;
          try {
            success = eval(`res.${this.successCondition}`);
          } catch (error) {
            success = false;
          }
          if (!success) {
            if (this.errorField) {
              try {
                this.showErrorMsg(eval(`res.${this.errorField}`) || this.errorField);
              } catch (error) {
                this.showErrorMsg('加载不成功!');
              }
            }
            this.loading = false;
            this.loadingChange.emit(this.loading);
            this.cdr.markForCheck();
            return [];
          }
        }

        // 获取数行数据
        if (typeof this.dataPath == 'string') {
          try {
            this.xData = eval(`res.${this.dataPath}`);
          } catch (error) {
            this.xData = [];
          }
        } else if (typeof this.dataPath == 'function') {
          this.xData = this.dataPath(res);
        }
        this.xData = Array.isArray(this.xData) ? this.xData : [];

        // 分页
        if (this.showPagination) {
          // 服务器端分页?
          if (this.serverPagination) {
            this.currentPageData = this.xData;

            // 获取总记录数
            if (typeof this.totalPath == 'string') {
              try {
                this.totalRowNumber = eval(`res.${this.totalPath}`);
              } catch (error) {
                this.totalRowNumber = 0;
              }
            } else if (typeof this.totalPath == 'function') {
              this.totalRowNumber = this.totalPath(res);
            }
            this.totalRowNumber = Number(this.totalRowNumber) || 0

          } else {
            // 本地排序
            this.sort();

            // 本地分页
            this.currentPageData = this.getPagingData(this.xData, this.pageIndex, this.pageSize);
            this.totalRowNumber = this.xData.length || 0;
          }

          // 更新分页
          if (this.flowPagination) {
            // 最后一页
            if (this.xData.length == 0) {
              this.lastPageIndex = this.pageIndex - 1;
            } else if (this.xData.length < this.pageSize) {
              this.lastPageIndex = this.pageIndex;
            }
            this.paginationBtns = [];
          } else {
            this.totalPageNumber = this.getTotalPageNumber(this.totalRowNumber, this.pageSize);
            this.paginationBtns = this.getPaginationBtns(this.totalPageNumber, this.pageIndex, this.maxPaginationBtnNumber);
          }
          this.paginationInfo = this.getPaginationInfo(this.pageIndex, this.pageSize, this.totalRowNumber);
        } else {
          // 不分页
          // 本地排序
          this.sort();
          this.currentPageData = [...this.xData];
        }

        this.loading = false;
        this.loadingChange.emit(this.loading);
        this.setTbodyRows();
        return this.currentPageData;
      },
      (err) => {
        this.loading = false;
        this.loadingChange.emit(this.loading);
        this.cdr.markForCheck();
        this.httpError.emit(err);
        if (this.showHttpErrorMsg) {
          let msg = (err.error || {}).msg || err.message || 'HTTP请求发生异常';
          this.showErrorMsg(msg);
        }
        return Promise.reject(err);
      }
    );
  }

  /**
   * 获取请求参数
   */
  async getParams() {
    let params: any = {};

    // 分页参数
    if (this.showPagination && this.serverPagination) {
      if (this.pageIndexField) {
        params[this.pageIndexField] = this.pageIndex;
      }
      if (this.pageOffsetStart) {
        params[this.pageOffsetStart] = (this.pageIndex - 1) * Number(this.pageSize)
      }
      if (this.pageSizeField) {
        params[this.pageSizeField] = Number(this.pageSize);
      }
    }

    // 排序参数
    if (this.serverPagination && this.sortColumns.length) {
      params[this.sortField] = this.sortColumns.map(column => ({ field: column.sortField || column.field, sort: column.sort }));
      // 非JSON提交, 则序列化
      if (this.method.toLocaleLowerCase() == 'get' || this.isPostForm) {
        params[this.sortField] = JSON.stringify(params[this.sortField]);
      }
    }

    // 执行请求发送前的回调
    if (this.params) {
      if (typeof this.params == 'function') {
        params = await (<any>this.params)(params);
      } else {
        params = { ...params, ...JSON.parse(JSON.stringify(this.params)) }
      }
    }

    // 过滤掉 null | '' | NaN
    if (this.shakeNull && params) {
      Object.entries(params).forEach(([key, value]) => {
        if (!value && (value !== false) && (value !== 0)) {
          delete params[key];
        }
      });
    }

    return Promise.resolve(params);
  }

  /**
   * 加载本地数据
   */
  loadNativeData() {
    this.xData = this.xData || [];
    if (this.showPagination) {
      this.currentPageData = this.getPagingData(this.xData, this.pageIndex, this.pageSize);
      this.totalRowNumber = this.xData.length || 0;

      // 更新分页
      this.totalPageNumber = this.getTotalPageNumber(this.totalRowNumber, this.pageSize);
      this.paginationBtns = this.getPaginationBtns(this.totalPageNumber, this.pageIndex, this.maxPaginationBtnNumber);
      this.paginationInfo = this.getPaginationInfo(this.pageIndex, this.pageSize, this.totalRowNumber);
    } else {
      this.currentPageData = [...this.xData];
    }

    this.setTbodyRows();
    return Promise.resolve(this.currentPageData);
  }

  /**
   * 本地分页, 获取当前页数据
   * @param data 
   * @param pageIndex 
   * @param pageSize 
   */
  getPagingData(data: any[], pageIndex: number, pageSize: number): any[] {
    const startIndex = (pageIndex - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }

  /**
   * 获取分页按钮数组
   * @param totalPageNumber 总页数
   * @param pageIndex 当前页码
   * @param maxPaginationBtnNumber 可显示的最大按钮数
   * @return Array [{ type: '类型', pageIndex: 页码, text: 文本 }];
   */
  getPaginationBtns(totalPageNumber, currentPageIndex, maxPaginationBtnNumber) {
    maxPaginationBtnNumber = Math.min(maxPaginationBtnNumber, totalPageNumber); // 如果总页面数小于最大页面按钮数, 则最大页面按钮数为总页面数
    const flankPages = Math.floor(maxPaginationBtnNumber / 2); // 左右两边按钮数(下舍)
    let start = 0; // 要显示的第一个页面
    let end = 0; // 要显示的最后一个页面
    const pages = [];

    if (totalPageNumber == 0) return pages; // 如果总页面为0, 返回空数组

    // 左右不饱和状态:
    // 在可视分页为偶数的情况下, 左边比右边页面数少1  ((currentPageIndex - flankPages) + 1)
    // 在可视页面为奇数的情况下, 减去(maxPaginationBtnNumber % 2), 用来保持左右对称
    start = currentPageIndex - flankPages + 1 - (maxPaginationBtnNumber % 2);
    end = currentPageIndex + flankPages;

    // 右边不饱和状态:
    if (start <= 0) {
      start = 1;
      end = maxPaginationBtnNumber;
    }
    // 左边不饱和状态:
    if (end > totalPageNumber) {
      start = totalPageNumber - maxPaginationBtnNumber + 1;
      end = totalPageNumber;
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // 省略页面[...]控制
    if (true) {
      // 要显示省略页面, 则可视页面必须>=7个 且 总页面数大于可视页面数
      if (maxPaginationBtnNumber >= 7 && totalPageNumber > maxPaginationBtnNumber) {
        if (pages[0] == 1) {
          pages[pages.length - 1] = totalPageNumber;
          pages[pages.length - 2] = "...";
        } else if (pages[pages.length - 1] == totalPageNumber) {
          pages[0] = 1;
          pages[1] = "...";
        } else {
          pages[0] = 1;
          pages[1] = "...";
          pages[pages.length - 1] = totalPageNumber;
          pages[pages.length - 2] = "...";
        }
      }
    }

    // 格式化
    const pageIndex = pages.indexOf(currentPageIndex);
    pages.forEach(function (v, i) {
      if (v == "...") {
        if (i < pageIndex) {
          pages[i] = {
            type: "...",
            pageIndex: pages[i + 1] - 1,
            text: v
          };
        } else {
          pages[i] = {
            type: "...",
            pageIndex: pages[i - 1].pageIndex + 1,
            text: v
          };
        }
      } else {
        pages[i] = {
          type: v == currentPageIndex ? "active" : "page",
          pageIndex: v,
          text: v
        };
      }
    });

    return pages;
  }

  /**
   * 获取分页信息
   * @param pageIndex 
   * @param pageSize 
   * @param totalRowNumber 
   */
  getPaginationInfo(pageIndex, pageSize, totalRowNumber): string {
    let startIndex = (pageIndex - 1) * pageSize + 1;
    let endIndex = startIndex + this.currentPageData.length - 1;
    if (this.currentPageData.length == 0) {
      startIndex = 0;
      endIndex = 0;
    }
    let str = `第 ${startIndex}-${endIndex} 条`;
    if (!this.flowPagination) {
      str += ` / 共 ${totalRowNumber} 条`;
    }
    return str;
  }

  /**
   * 获取总页数
   * @param totalRowNumber 
   * @param pageSize 
   */
  getTotalPageNumber(totalRowNumber: number, pageSize: number): number {
    return Math.ceil(totalRowNumber / pageSize);
  }

  /**
   * 分页按钮点击事件
   * @param pageIndex 
   * @param isPageSizeChange
   */
  onPaginationClick(pageIndex) {
    if (pageIndex == this.pageIndex) return;
    if (pageIndex <= 0) return;
    if (this.flowPagination) {
      if ((this.lastPageIndex != null) && (pageIndex > this.lastPageIndex)) return;
    } else {
      if (pageIndex > this.totalPageNumber) return;
    }

    this.pageIndex = pageIndex;

    if (this.url != null && this.serverPagination) {
      this.loadUrlData();
    } else {
      this.loadNativeData();
    }
  }

  /**
   * 分页大小改变事件
   */
  onPageSizeChange() {
    this.pageIndex = 1;
    this.lastPageIndex = null;
    if (this.url != null && this.serverPagination) {
      this.loadUrlData();
    } else {
      this.loadNativeData();
    }
  }


  /**
   * 排序
   * ------------------------------------ */

  /**
   * 获取 th 排序样式类
   * @prams column
   */
  getThSortClass(column) {
    const obj = {};
    if (column.type != 'chk' && (typeof column.field == 'string' || column.sortField) && (column.sort != false)) {
      obj['x-table-sort-cell'] = true;
      obj['x-desc'] = column.sort == 'desc';
      obj['x-asc'] = column.sort == 'asc';
    }
    return obj;
  }

  /**
   * 排序表头点击事件
   * @param column 
   */
  onThSortClick(column) {
    // 排除 (chk列 | 没有设置排序字段的 | 明确禁用排序的)
    if (!(column.type != 'chk' && (typeof column.field == 'string' || column.sortField) && (column.sort != false))) return;

    /**
     * 设置排序状态
     */
    switch (true) {
      // 空排序 => 降序
      case column.sort == true || column.sort === undefined: { column.sort = 'desc'; break; }
      // 降序 => 升序
      case column.sort == 'desc': { column.sort = 'asc'; break; }
      // 升序 => 空排序
      case column.sort == 'asc': { column.sort = true; break; }
    }

    /**
     * 提取要做排序的列表
     */
    if (this.sortMultiple) {
      const index = this.sortColumns.indexOf(column);
      if (index != -1) {
        // 最后被操作的列, 最后排序
        this.sortColumns.splice(index, 1);
        (column.sort != true) && this.sortColumns.push(column);
      } else {
        this.sortColumns.push(column);
      }
    } else {
      this.sortColumns = [];
      this.theadColumns.forEach(trColumns => {
        trColumns.forEach(col => ((col != column) && col.sort) && (col.sort = true));
      });
      (column.sort != true) && this.sortColumns.push(column);
    }

    /**
     * 排序
     */
    if (!(this.url != null && this.serverPagination)) {
      // 本地排序
      this.sort();
    }
    this.setTheadRows();
    this.onPageSizeChange();
  }

  /**
   * 本地排序
   */
  sort() {
    const sort = (arr, orderColumns) => {
      if (orderColumns.length) {
        let compare = (a, b, columnIndex = 0) => {
          let column = orderColumns[columnIndex];
          const field = column.sortField || column.field;

          if (column.compare) {
            /**
             * 列自己实现的比较器
             * @param a 
             * @param b 
             * @param orderColumns 需要排序列的列表
             * @param columnIndex 当前排序的列
             * @param compare 系统比较器(在相等的时候调用)
             */
            return column.compare(a, b, orderColumns, columnIndex, compare);
          }

          switch (true) {
            case b[field] > a[field]: {
              return column.sort == 'desc' ? 1 : -1;
            }
            case b[field] < a[field]: {
              return column.sort == 'desc' ? -1 : 1;
            }
            case b[field] == a[field]: {
              ++columnIndex;
              if (orderColumns[columnIndex]) {
                return compare(a, b, columnIndex);
              }
              return 0;
            }
          }
        };

        arr.sort(compare);
      }
    };

    sort(this.xData || [], this.sortColumns);
  }

  /**
   * 设置排序激活样式
   */
  setHasSortStyle() {
    this.theadRows.forEach((theadTr, theadTrIndex) => {
      theadTr.columns.forEach((th, thIndex) => {
        if (this.sortColumns.includes(th.column)) {
          // 考虑在合并的单元格上做出的排序
          let thColspan = Number(th.attr.colspan || 1);

          this.theadRows.slice(theadTrIndex + 1).forEach(nextTr => {
            nextTr.columns.slice(thIndex, (thIndex + thColspan)).forEach(nextTh => nextTh.class['x-table-has-sort'] = true);
          });

          this.tbodyRows.forEach(tbodyTr => {
            tbodyTr.columns.slice(thIndex, (thIndex + thColspan)).forEach(td => td.class['x-table-has-sort'] = true);
          });
        } else {
          th.class['x-table-has-sort'] = false;
        }
      });
    });
  }


  /**
   * checkbox
   * ------------------------------------ */

  /**
   * 行点击事件 => 切换 checked
   * @param row 
   */
  onToggleChk(row, column) {
    if (column.toggleCheckbox === false) return;
    if (this.disabledRows.includes(row)) return;

    const index = this.checkedRows.indexOf(row);
    if (index == -1) {
      //选中
      if (!this.chkMultiple && this.checkedRows.length) {
        //单选, 先清空
        this.checkedChange.emit({ checked: false, rows: this.checkedRows });
        this.checkedRows = [];
      }
      this.checkedRows.push(row);
    } else {
      //取消选中
      this.checkedRows.splice(index, 1);
    }

    this.syncIsAllChecked();
    this.syncCheckedStyle();

    this.checkedRowsChange.emit(this.checkedRows);
    this.checkedChange.emit({ checked: this.checkedRows.includes(row), rows: [row] });
  }

  /**
   * th > checkbox 全选事件
   */
  onToggleAllChk() {
    if (!this.chkMultiple) return;

    this.isAllChecked = !this.isAllChecked;
    //非禁用的行
    let enableRows = this.currentPageData.filter(row => !this.disabledRows.includes(row));
    enableRows.forEach(row => {
      if (this.isAllChecked) {
        !this.checkedRows.includes(row) && this.checkedRows.push(row);
      } else {
        this.checkedRows.splice(this.checkedRows.indexOf(row), 1);
      }
    });

    this.syncCheckedStyle();

    this.checkedRowsChange.emit(this.checkedRows);
    this.checkedChange.emit({ checked: this.isAllChecked, rows: enableRows });
  }

  /**
   * 初始化 checked 和 disabled 状态
   */
  initCheckedAndDisabled() {
    this.disabledRows = [];
    if (typeof this.disabled == 'function') {
      this.disabledRows = this.currentPageData.filter(this.disabled);
    }

    // 是否具有 主键字段(来标识不同的行, 用于跨页勾选)
    if (this.key) {
      // 引用替换
      this.checkedRows = this.checkedRows.map(row => {
        let newRow = this.currentPageData.find(v => v[this.key] == row[this.key]);
        return newRow || row;
      });
    } else {
      this.checkedRows = [];
    }

    if (typeof this.checked == 'function') {
      this.currentPageData.filter(this.checked).forEach(row => {
        !this.checkedRows.includes(row) && this.checkedRows.push(row);
      });
    }

    this.syncIsAllChecked();

    this.checkedRowsChange.emit(this.checkedRows);
    this.disabledRowsChange.emit(this.disabledRows);
  }

  /**
   * 同步 isAllChecked 勾选状态
   */
  syncIsAllChecked() {
    let enableRows = this.currentPageData.filter(row => !this.disabledRows.includes(row));
    this.isAllChecked = enableRows.length && enableRows.every(row => this.checkedRows.includes(row))
  }

  /**
   * 同步勾选状态
   */
  syncCheckedStyle() {
    this.theadRows.forEach(tr => {
      tr.class['x-table-checked'] = this.isAllChecked;
    });

    this.tbodyRows.forEach(tr => {
      tr.class['x-table-checked'] = this.checkedRows.includes(tr.rowData);
      tr.class['x-table-disabled'] = this.disabledRows.includes(tr.rowData);
    });
  }


  /**
   * 渲染相关
   * ------------------------------------ */

  /**
   * 设置thead
   */
  setTheadRows() {
    this.theadRows = this.theadColumns.map((trColumns, trIndex) => {
      let rowNumber = trIndex;
      let rowIterator = this.getIterator(this.theadColumns, trIndex);
      return {
        rowData: null,
        rowNumber,
        style: {},
        class: {
          'x-table-disabled': !this.chkMultiple,
          'x-table-checked': this.isAllChecked,
        },
        columns: trColumns.map((column, columnIndex) => {
          let columnIterator = this.getIterator(trColumns, columnIndex);
          return {
            column,
            attr: this.getCellAttr('th', null, rowNumber, rowIterator, column, columnIterator),
            style: this.getCellStyle('th', null, rowNumber, rowIterator, column, columnIterator),
            class: this.getCellClass('th', null, rowNumber, rowIterator, column, columnIterator),
            render: this.getRenderData('th', null, rowNumber, rowIterator, column, columnIterator),
          };
        })
      }
    });

    this.cdr.markForCheck();
  }

  /**
   * 设置tbody
   */
  setTbodyRows(isUpdate = false, callback = null) {
    this.noneCellMap = {};
    this.initCheckedAndDisabled();

    this.tbodyRows = this.currentPageData.filter(rowData => rowData).map((rowData, rowIndex) => {
      let rowNumber = this.getRowNumber(rowIndex);
      let rowIterator = this.getIterator(this.currentPageData, rowIndex);
      return {
        rowData,
        rowNumber,
        style: {},
        class: {
          'x-table-checked-highlight': this.chkCheckedHighlight,
        },
        columns: this.tbodyColumns.map((column, columnIndex) => {
          let columnIterator = this.getIterator(this.tbodyColumns, columnIndex);
          let colMeta = {
            column,
            attr: this.getCellAttr('td', rowData, rowNumber, rowIterator, column, columnIterator),
            style: this.getCellStyle('td', rowData, rowNumber, rowIterator, column, columnIterator),
            class: this.getCellClass('td', rowData, rowNumber, rowIterator, column, columnIterator),
            render: this.getRenderData('td', rowData, rowNumber, rowIterator, column, columnIterator),
            isNone: this.tdNone(rowIterator.index, columnIterator.index)
          };

          // 为具有显然函数的列设置 溢出title
          if (colMeta.render.renderType == 'function' && (column.ellipsis || (this.fixedLayout && this.nowrap))) {
            // 尝试换行显示
            colMeta.attr['title'] = (colMeta.render.html || '').replace(/<br>|<br\/>|<br \/>/g, '\n');
          }

          return colMeta;
        })
      }
    });

    this.setHasSortStyle();
    this.syncCheckedStyle();

    window.requestAnimationFrame(() => {
      // 重置固定列
      this.restoreStickyColumn();
      // 固定列
      let hasXScrollbar = this.hasScrolled(this.xscrollbar.$container, 'horizontal');
      if (hasXScrollbar) {
        this.setStickyColumn();
      }
      // 激活固定列
      this.onXScrollSubject.next();

      if (!isUpdate) {
        // 重置滚动条
        this.xscrollbar.$container.scrollTop = 0;
        // 行渲染完成回调
        this.runRowCallback();
        // 当前页数据渲染完成事件
        this.rendered.emit(this.currentPageData);

        if (typeof callback == 'function') {
          callback();
        }
      }
    });
    this.cdr.markForCheck();
  }

  /**
   * 更新数据
   * @param callback 
   */
  update(callback?: () => {}) {
    this.setTbodyRows(true, callback);
  }

  /**
   * 获取行号
   * @param rowIndex 
   */
  getRowNumber(rowIndex) {
    if (this.showPagination) {
      return this.pageSize * (this.pageIndex - 1) + rowIndex + 1;
    } else {
      return rowIndex + 1;
    }
  }

  /**
   * 组装渲染器数据
   */
  getRenderData(cellType, rowData = null, rowNumber, rowIterator, column, columnIterator) {

    let render = cellType == 'th' ? column.title : column.field;
    let html = null;
    let renderType = null;

    switch (true) {
      // string
      case (typeof render == 'string') && (render[0] != '#'): {
        renderType = 'string';
        if (cellType == 'td') {
          render = this.pipe(rowData[render], column.pipe);
        } else {
          // th 使用html渲染
          renderType = 'function';
          render = this.sanitizer.bypassSecurityTrustHtml(render);
        }
        break;
      }
      // function
      case typeof render == 'function': {
        renderType = 'function';
        render = render(rowData, rowNumber, rowIterator, column, columnIterator);
        if (cellType == 'td') {
          render = this.pipe(render, column.pipe);
        }
        // 过滤掉空值
        render = String(render).replace(/null|undefined/g, '');
        // 用于设置title提示
        html = render;
        // 尝试换行
        if (column.pipe != 'json') render = render.replace(/\n/g, '<br>');
        render = this.sanitizer.bypassSecurityTrustHtml(render);
        break;
      }
      // template 标识符
      case (typeof render == 'string') && (render[0] == '#'): {
        renderType = 'template';
        render = this.templateService.templateMap[render.slice(1)];
        break;
      }
      // template 引用
      case render instanceof TemplateRef: {
        renderType = 'template';
        break;
      }
    }

    return {
      // 单元格类型
      cellType,
      // 渲染器
      render,
      // 渲染的HTML(renderType = function 有效)
      html,
      // 渲染类型
      renderType,
      // 行数据
      rowData,
      // 行号
      rowNumber,
      // 行迭代元数据
      rowIterator,
      // 列配置
      column,
      // 列迭代元数据
      columnIterator
    };
  }

  /**
   * 获取单元格样式
   * @param cellType 
   * @param rowData 
   * @param column 
   */
  getCellStyle(cellType, rowData, rowNumber, rowIterator, column, columnIterator): object {
    let style = {};

    if (column.width) {
      style['width'] = column.width;
      if (column.width == 'auto') {
        style['min-width'] = column.minWidth;
      } else {
        style['min-width'] = column.width;
        style['max-width'] = column.width;
      }
      if (cellType == 'td' && !column.ellipsis) {
        style['white-space'] = 'normal';
      }
    }

    if (column.align && (column.align != 'left')) {
      style['text-align'] = column.align;
    }

    const params = [
      rowData,
      rowNumber,
      rowIterator,
      column,
      columnIterator
    ];

    if (cellType == 'th') {
      style = {
        ...(typeof column.thStyle == 'function' ? column.thStyle(...params) : column.thStyle),
        ...style,
        'display': column._none ? 'none' : null
      };
    } else {
      style = {
        ...(typeof column.tdStyle == 'function' ? column.tdStyle(...params) : column.tdStyle),
        ...style,
        'display': this.tdNone(rowIterator.index, columnIterator.index) ? 'none' : null
      };
    }

    return style;
  }

  /**
   * 获取单元格样式类
   * @param cellType 
   * @param rowData 
   * @param column 
   */
  getCellClass(cellType, rowData, rowNumber, rowIterator, column, columnIterator): object {
    const classObj = {
      'x-table-left-sticky': column.fixed == 'left',
      'x-table-right-sticky': column.fixed == 'right',
      'x-table-ellipsis': column.width && column.ellipsis
    };

    const params = [
      rowData,
      rowNumber,
      rowIterator,
      column,
      columnIterator
    ];

    if (cellType == 'th') {
      return {
        'x-table-border-bottom-bold': this.tbodyColumns.includes(column),
        ...(typeof column.thClass == 'function' ? column.thClass(...params) : column.thClass),
        ...this.getThSortClass(column),
        ...classObj,
      };
    } else {
      return {
        ...(typeof column.tdClass == 'function' ? column.tdClass(...params) : column.tdClass),
        ...classObj,
      };
    }
  }

  /**
   * 获取单元格 HTML 属性
   * @param cellType 
   * @param rowData 
   * @param column 
   */
  getCellAttr(cellType, rowData, rowNumber, rowIterator, column, columnIterator): object {
    let attrObj: any = {};

    // 溢出省略 title
    if (cellType == 'td' && (column.ellipsis || (this.fixedLayout && this.nowrap))) {
      attrObj['title'] = rowData[column.field] || '';
    }

    const params = [
      rowData,
      rowNumber,
      rowIterator,
      column,
      columnIterator
    ];
    let rowIndex = rowIterator.index;
    let columnIndex = columnIterator.index;

    if (cellType == 'th') {
      attrObj = { ...attrObj, ...(typeof column.thAttr == 'function' ? column.thAttr(...params) : column.thAttr) };
    } else {
      attrObj = { ...attrObj, ...(typeof column.tdAttr == 'function' ? column.tdAttr(...params) : column.tdAttr) };

      /**
       * 记录需要隐藏的单元格
       */
      if (attrObj.colspan > 1) {
        for (let colIndex = (columnIndex + 1); colIndex <= (columnIndex + Number(attrObj.colspan) - 1); colIndex++) {
          !this.noneCellMap[rowIndex] && (this.noneCellMap[rowIndex] = {});
          this.noneCellMap[rowIndex][colIndex] = true;
        }
      }

      if (attrObj.rowspan > 1) {
        for (let _rowIndex = (rowIndex + 1); _rowIndex <= (rowIndex + Number(attrObj.rowspan) - 1); _rowIndex++) {
          !this.noneCellMap[_rowIndex] && (this.noneCellMap[_rowIndex] = {});
          this.noneCellMap[_rowIndex][columnIndex] = true;
        }
      }
    }

    return attrObj;
  }

  /**
   * 是否隐藏特定的 td单元格
   */
  tdNone(rowIndex, columnIndex): boolean {
    return this.noneCellMap[rowIndex] && this.noneCellMap[rowIndex][columnIndex];
  }

  /**
   * 执行行渲染完成回调
   */
  runRowCallback() {
    if (typeof this.rowCallback == 'function' && this.currentPageData.length) {
      const trs = Array.from(this.nativeElement.querySelector('tbody').children);
      trs.forEach((tr: HTMLElement, index) => {
        this.rowCallback(tr, this.tbodyRows[index].rowData, index);
      });
    }
  }

  /**
   * 变更检测函数(复用dom)
   */
  trackBy(index, rowData) {
    return index;
  }


  /**
   * 滚动条 & 固定列 & 高亮
   * ------------------------------------ */

  /**
   * 清除上一次的固定列(渲染前)
   */
  restoreStickyColumn() {
    this.hasStickyColumn = false;
    if (!this.nativeElement) return;
    const trs = [
      ...Array.from(this.nativeElement.querySelector('thead').children),
      ...Array.from(this.nativeElement.querySelector('tbody').children)
    ];
    trs.forEach(tr => {
      Array.from(tr.children).forEach((cell: HTMLElement, cellIndex) => {
        switch (true) {
          case cell.classList.contains('x-table-left-sticky'): {
            cell.style.left = null;
            break;
          }
          case cell.classList.contains('x-table-right-sticky'): {
            cell.style.right = null;
            break;
          }
        }
      });
    });
  }

  /**
   * 设置固定列
   */
  setStickyColumn() {
    this.hasStickyColumn = true;

    let cellIndexMap = {};
    let leftList = [];
    let rightList = [];

    // 读取
    let table_rect = this.nativeElement.querySelector('table').getBoundingClientRect();
    let thead_trs = Array.from(this.nativeElement.querySelector('thead').children);
    thead_trs.forEach(tr => {
      Array.from(tr.children).forEach((cell: HTMLElement, cellIndex) => {
        if (cell.classList.contains('x-table-left-sticky')) {
          if (cellIndexMap[cellIndex] == null) {
            cellIndexMap[cellIndex] = cell.getBoundingClientRect().left - table_rect.left;
          }
        } else if (cell.classList.contains('x-table-right-sticky')) {
          if (cellIndexMap[cellIndex] == null) {
            cellIndexMap[cellIndex] = table_rect.right - cell.getBoundingClientRect().right;
          }
        }
      })
    });

    // 写入
    const trs = [
      ...Array.from(this.nativeElement.querySelector('thead').children),
      ...Array.from(this.nativeElement.querySelector('tbody').children)
    ];
    trs.forEach(tr => {
      Array.from(tr.children).forEach((cell: HTMLElement, cellIndex) => {
        switch (true) {
          case cell.classList.contains('x-table-left-sticky'): {
            let left = cellIndexMap[cellIndex];
            if (this.fixedColumnAnimated) {
              cell.style.left = `${left - 20}px`;
              leftList.push({ cell, left });
            } else {
              cell.style.left = `${left}px`;
            }
            break;
          }
          case cell.classList.contains('x-table-right-sticky'): {
            let right = cellIndexMap[cellIndex];
            if (this.fixedColumnAnimated) {
              cell.style.right = `${right - 20}px`;
              rightList.push({ cell, right });
            } else {
              cell.style.right = `${right}px`;
            }
            break;
          }
        }
      });
    });

    // 固定列过渡效果
    requestAnimationFrame(() => {
      leftList.forEach(({ cell, left }) => {
        cell.style.left = `${left}px`;
      })
      rightList.forEach(({ cell, right }) => {
        cell.style.right = `${right}px`;
      });
    });

  }

  /**
   * 激活固定列
   */
  activeStickyColumn() {
    const table_wrap = this.nativeElement.querySelector<HTMLElement>('.x-table-wrap');
    const table = this.nativeElement.querySelector<HTMLElement>('table');

    // 计算滚动条位置 -> 设置固定列激活样式
    let hasXScrollbar = this.hasScrolled(this.xscrollbar.$container, 'horizontal');
    if (hasXScrollbar) {
      switch (true) {
        // 左
        case this.xscrollbar.$container.scrollLeft == 0: {
          this.removeClass(table_wrap, ['x-table-scroll-right', 'x-table-scroll-middle']);
          this.addClass(table_wrap, ['x-table-scroll-left']);
          break;
        }
        // 右
        case Math.round(table_wrap.getBoundingClientRect().right) >= Math.round(table.getBoundingClientRect().right): {
          this.removeClass(table_wrap, ['x-table-scroll-middle', 'x-table-scroll-left']);
          this.addClass(table_wrap, ['x-table-scroll-right']);
          break;
        }
        default: {
          this.removeClass(table_wrap, ['x-table-scroll-left', 'x-table-scroll-right']);
          this.addClass(table_wrap, ['x-table-scroll-middle']);
          break;
        }
      }
    } else {
      this.removeClass(table_wrap, ['x-table-scroll-left', 'x-table-scroll-right', 'x-table-scroll-middle']);
    }
  }

  /**
   * 设置固定表头
   */
  setStickyThead() {
    const theadTrs = Array.from(this.nativeElement.querySelector('thead').children);
    const tableRect = this.nativeElement.querySelector('table').getBoundingClientRect();

    theadTrs.forEach(tr => {
      Array.from(tr.children).forEach((cell: HTMLElement, cellIndex) => {
        cell['_top'] = (cell.getBoundingClientRect().top - tableRect.top) + 'px';
      });
    });

    theadTrs.forEach(tr => {
      Array.from(tr.children).forEach((cell: HTMLElement, cellIndex) => {
        cell.style.top = cell['_top'];
      });
    });
  }

  /**
   * 初始化垂直高亮
   */
  initVerticalHover() {
    if (!this.verticalHover) return;
    const tbody = this.nativeElement.querySelector<HTMLElement>('tbody');
    this.ngZone.runOutsideAngular(() => {
      let prevIndex = null;
      let isLeave = false;
      fromEvent(tbody, 'mousemove').pipe(
        // 过滤
        filter(e => e.target['cellIndex'] != null),
        // 转换
        map(e => e.target['cellIndex']),
        // 防抖(ms)
        debounceTime(50)
      ).subscribe(cellIndex => {
        if (this.currentPageData.length > 100) return;
        if (prevIndex == cellIndex || isLeave) {
          isLeave = false;
          return;
        };
        prevIndex = cellIndex;

        Array.from(tbody.children).forEach(tr => {
          Array.from(tr.children).forEach((td, tdIndex) => {
            if (tdIndex == cellIndex) {
              td.classList.add('x-table-has-vhover');
            } else {
              td.classList.remove('x-table-has-vhover');
            }
          })
        })
      });

      // 清除 垂直 hover 高亮
      fromEvent(tbody, 'mouseleave').subscribe(() => {
        if (this.currentPageData.length > 100) return;
        isLeave = true;
        prevIndex = null;
        Array.from(tbody.children).forEach(tr => {
          Array.from(tr.children).forEach((td, tdIndex) => {
            td.classList.remove('x-table-has-vhover');
          })
        });
      });
    });
  }


  /**
   * 工具类
   * ------------------------------------ */

  /**
   * 检测一个元素是否有滚动条
   * @param el 
   * @param direction = 'vertical'; //vertical | horizontal
   */
  hasScrolled(el, direction = "vertical"): boolean {
    if (direction === "vertical") {
      return el.scrollHeight > el.clientHeight;
    } else if (direction === "horizontal") {
      return el.scrollWidth > el.clientWidth;
    }
    return false;
  }

  /**
   * 添加样式类
   * @param el 
   * @param classList 
   */
  addClass(el: HTMLElement, classList: string[]) {
    classList.forEach(className => {
      el.classList.add(className);
    });
  }

  /**
   * 移除样式类
   * @param el 
   * @param classList 
   */
  removeClass(el: HTMLElement, classList: string[]) {
    classList.forEach(className => {
      el.classList.remove(className);
    });
  }

  /**
   * 管道
   * https://www.angular.cn/api?type=pipe
   * @param value
   * @param pipe 管道类型 "number" | "currency" | "percent" | "date" | "slice" | "json"
   */
  pipe(value, pipe: string) {
    if (!pipe) return value;
    if (value == null) return '';

    // "currency:'CNY':'symbol-narrow':'1.2-2'"
    // "date:'yyyy-MM-dd hh:mm:SS':'456'"
    (pipe.slice(-1) == "'" || pipe.slice(-1) == '"') && (pipe = pipe.slice(0, -1))
    let arr: any = pipe.split(/':'|":"|:'|:"/g);

    switch (arr[0]) {
      /**
       * 数值格式化(千分位, 小数位)
       * pipe: "number"
       * pipe: "number:'1.0-0'"
       * @param value: number | string 
       * @param digitsInfo: string 格式化参数, 默认: '1.0-2'(保留0至2位小数)
       */
      case 'number': {
        value = isNaN(value) ? null : value;
        arr[1] = arr[1] || '1.0-2';
        return new DecimalPipe(this.locale).transform(value, arr[1], arr[2]);
        break;
      }
      /**
       * 货币显示
       * pipe: "currency"
       * pipe: "currency:'CNY':'symbol-narrow':'1.2-2'"
       * pipe: "currency:'CNY':'￥':'1.2-2'"
       * @param value: number | string 
       * @param currencyCode: string 货币代码, 默认: 'CNY'(人民币)
       * @param display: string | boolean 货币指示器的格式, 默认: ￥
       * @param digitsInfo: string 格式化参数, 默认: '1.2-2'(2位小数) 
       */
      case 'currency': {
        value = isNaN(value) ? null : value;
        arr[1] = arr[1] || 'CNY';
        arr[2] = arr[2] || 'symbol-narrow';
        arr[3] = arr[3] || '1.2-2';
        return new CurrencyPipe(this.locale).transform(value, arr[1], arr[2], arr[3], arr[4]);
        break;
      }
      /**
       * 百分比显示
       * pipe: "percent"
       * pipe: "percent:'1.0-0'"
       * @param value: number | string 
       * @param digitsInfo: string 格式化参数, 默认: '1.0-2'(保留0至2位小数)
       */
      case 'percent': {
        value = isNaN(value) ? null : value;
        arr[1] = arr[1] || '1.0-2';
        return new PercentPipe(this.locale).transform(value, arr[1], arr[2]);
        break;
      }
      /**
       * 日期格式化
       * pipe: "date"
       * pipe: "date:'yyyy-MM-dd'"
       * pipe: "date:'yyyy-MM-dd HH:mm:ss.SSS'"
       * pipe: "date:'yyyy-MM-dd HH:mm:ss.SSS':'+0800'"
       * @param value: 时间撮 | 日期对象 | 日期字符串
       * @param format: string 日期格式, 默认: 'yyyy-MM-dd HH:mm:ss'
       * @param timezone: string 时区
       */
      case 'date': {
        try {
          arr[1] = arr[1] || 'yyyy-MM-dd HH:mm:ss';
          return new DatePipe(this.locale).transform(value, arr[1], arr[2], arr[3]);
        } catch (error) { }
        break;
      }
      /**
       * 切割
       * pipe: "slice:'5'"
       * pipe: "slice:'5':'10'"
       * @param value: any
       * @param start: string 起始索引
       * @param end: string 结束索引(不包含)
       */
      case 'slice': {
        value = value != null ? String(value) : null;
        arr[1] = Number(arr[1]) || 0;
        arr[2] = Number(arr[2]) || undefined;
        return new SlicePipe().transform(value, arr[1], arr[2]);
        break;
      }
      /**
       * JSON 序列化
       * pipe: "json"
       */
      case 'json': {
        return new JsonPipe().transform(value);
        break;
      }
    }
  }

  /**
   * 获取迭代元数据
   * @param arr 
   * @param index 
   */
  getIterator(arr, index) {
    return {
      index,
      isFirst: index == 0,
      isLast: index == (arr.length - 1),
      isEven: !Boolean(index % 2),
      idOdd: Boolean(index % 2),
    };
  }

  /**
   * 显示错误消息
   * @param msg 
   */
  msg = '';
  msgSetIntervalId = null;
  showErrorMsg(msg) {
    this.msg = '';
    this.cdr.markForCheck();
    window.setTimeout(() => {
      this.msg = msg;
      this.cdr.markForCheck();
      window.clearInterval(this.msgSetIntervalId);
      this.msgSetIntervalId = window.setInterval(() => {
        this.msg = '';
        this.cdr.markForCheck();
      }, 3000);
    }, 0);

  }

}
