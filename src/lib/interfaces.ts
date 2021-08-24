import { TemplateRef, InjectionToken } from '@angular/core';

// 配置令牌
export const XTableConfigService = new InjectionToken('config');

/**
 * 迭代器元数据
 */
export interface XTableIteratorMeta {
  /**迭代索引 */
  index: number,
  /**第一个? */
  isFirst: boolean,
  /**最后一个? */
  isLast: boolean,
  /**偶数? */
  isEven: boolean,
  /**奇数? */
  isOdd: boolean,
}

/**
 * 迭代回调
 * @param rowData 行数据
 * @param rowNumber 行号
 * @param rowIterator 行迭代元数据
 * @param column 列配置
 * @param columnIterator 列迭代元数据
 */
export interface XTableIteratorCallback<T> {
  (
    rowData: { [key: string]: any }, 
    rowNumber: number, 
    rowIterator: XTableIteratorMeta, 
    column: XTableColumn, 
    columnIterator: XTableIteratorMeta
  ): T;
}


/**
 * 列
 */
export interface XTableColumn {
  /**
   * 表头:   
   * * 字符串(静态html字符串)
   * * 渲染函数(迭代回调): (row, rowNumber, rowIterator, column, columnIterator) => 静态html字符串
   * * #模板标识
   * * 模板引用(TemplateRef) */
  title: string | XTableIteratorCallback<string> | TemplateRef<any>,
  /**
   * 数据源:
   * * 字符串(数据源字段名)
   * * 渲染函数(迭代回调): (row, rowNumber, rowIterator, column, columnIterator) => 静态html字符串
   * * #模板标识
   * * 模板引用(TemplateRef)  */
  field?: string | XTableIteratorCallback<string> | TemplateRef<any>,
  /**
   * 管道:  
   * "number" | "currency" | "percent" | "date" | "slice" | "json"  
   * pipe: "number:'1.1-3'"*/
  pipe?: string,
  /**
   * 固定列:  
   * 'left'(左固定) | 'right'(右固定) */
  fixed?: 'left' | 'right',
  /**
   * 列宽:  
   * 数字(默认px) | 字符串 */
  width?: number | string,
  /**
   * 弹性列(width: 'auto')最小宽度:  
   * 数字(默认px) | 字符串 */
  minWidth?: number | string,
  /**
   * 溢出省略显示(...):  
   * true | false(默认) 
   * 
   * * 鼠标悬停 title 显示完整内容  
   * * 必须配置宽度(width)*/
  ellipsis?: boolean,
  /**
   * 对齐方式 (作用于 th、td):  
   * 'left'(默认) | 'center' | 'right' */
  align?: 'left' | 'center' | 'right'
  /**
   * 允许切换 checkbox:  
   * true(开启, 默认) | false  */
  toggleCheckbox?: boolean,
  /**
   * 排序控制:  
   * true(开启, 默认) | false(禁用排序) | 'desc'(默认降序) | 'asc'(默认升序) */
  sort?: true | false | 'desc' | 'asc',
  /**
   * 排序字段(在没有设置 field 的情况下) */
  sortField?: string,
  /**
   * 自定义排序比较器(注意考虑多列排序的情况) */
  compare?: (a, b, orderColumns: XTableColumn[], columnIndex: number, compare: (a, b, columnIndex: number) => number) => number,
  /**
   * th 样式:  
   * 迭代回调(row, rowNumber, rowIterator, column, columnIterator) | 对象 */
  thStyle?: XTableIteratorCallback<{ [key: string]: string }> | { [key: string]: string },
  /**
   * td 样式:  
   * 迭代回调(row, rowNumber, rowIterator, column, columnIterator) | 对象 */
  tdStyle?: XTableIteratorCallback<{ [key: string]: string }> | { [key: string]: string },
  /**
   * th 样式class:  
   * 迭代回调(row, rowNumber, rowIterator, column, columnIterator) | 对象 */
  thClass?: XTableIteratorCallback<{ [key: string]: boolean }> | { [key: string]: boolean },
  /**
   * td 样式class:  
   * 迭代回调(row, rowNumber, rowIterator, column, columnIterator) | 对象 */
  tdClass?: XTableIteratorCallback<{ [key: string]: boolean }> | { [key: string]: boolean },
  /**
   * th html属性(用于合并单元格):  
   * 迭代回调(row, rowNumber, rowIterator, column, columnIterator) | 对象 */
  thAttr?: XTableIteratorCallback<{ [key: string]: string | number }> | { [key: string]: string | number },
  /**
   * td html属性(用于合并单元格):  
   * 迭代回调(row, rowNumber, rowIterator, column, columnIterator) | 对象 */
  tdAttr?: XTableIteratorCallback<{ [key: string]: string | number }> | { [key: string]: string | number },
}

/**
 * 表头列表
 */
export type XTableColumns = Array<XTableColumn> | Array<Array<XTableColumn>>;

/**
 * checkboxChange 事件参数
 */
export interface CheckboxEventParams {
  // checked 勾选状态
  checked: boolean,
  // 本次操作的行列表
  rows: any[]
}