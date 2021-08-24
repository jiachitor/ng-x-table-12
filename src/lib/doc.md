columns
theadColumns
tbodyColumns

xData = [];
currentPageData = [];

theadRows: [{
    rowData: null,
    rowNumber: number,
    style: {},
    class: {},
    columns: [{
        column,
        attr: {},
        style: {},
        class: {},
        renderType,
        render
    }]
}]
tbodyRows: [{
    rowData: {},
    rowNumber: number,
    style: {},
    class: {},
    columns: [{
        column,
        attr: {},
        style: {},
        class: {},
        renderType,
        render
    }]
}]

# 加载流程
[constructor]
[ngOnChanges]
    // 忽略首次的初始变更
    if(columns.firstChange) return;

    if (columns || url || xData) {
        columns && initColumns();
        xData && sort();

        if(!lazy) {
            reload();
        }
    }
    if (((changes.checkedRows || changes.disabledRows))) {
        this.syncIsAllChecked();
        this.syncCheckedStyle();
    }
[ngAfterViewInit]
    // 等待 x-template 指令初始完成
    window.requestAnimationFrame(() => {
      this.initColumns();
      if (this.xData) {
        this.sort();
      }
      if (!this.lazy) {
        this.reload();
      }
    });
[initColumns]
    ...
    setTheadRows()
    // 设置固定表头
    if (this.hasCallReload) {
      window.requestAnimationFrame(() => this.setStickyThead());
    }
[showInit]
    window.requestAnimationFrame(() => {
        // 初始化垂直高亮
        this.initVerticalHover();
        // 固定表头
        this.setStickyThead();
        // 自动高度
        window.addEventListener('resize', this.setMaxHeight);
        [initXScrollbar] 
            table_wrap.addEventListener('scroll', (e) => {
                // 水平滚动 => 激活固定列
                activeStickyColumn()
            });
        // .x-table_wrap大小变更
        ResizeObserver.observe(.x-table_wrap)
            if(hasXScrollbar && !hasStickyColumn) {
                setStickyColumn();
            }
            activeStickyColumn()
    });
[reload]
    // 懒加载
    if (!this.hasCallReload) {
      this.hasCallReload = true;
      this.showInit();
    }
    ajax().then((res) => {
        currentPageData = res;
        setTbodyRows();
    });

# 渲染
[setTbodyRows]
    [渲染前]
    noneCellMap = {};
    initCheckedAndDisabled();
    ...
    setHasSortStyle();
    syncCheckedStyle();
    window.requestAnimationFrame(() => {
        [渲染后]
        restoreStickyColumn();
        hasXScrollbar && setStickyColumn();
        activeStickyColumn();
    });
    markForCheck()
[update] 
    setTbodyRows()

# 分页
    if (this.url != null && this.serverPagination) {
      this.loadUrlData();
    } else {
      this.loadNativeData();
    }

# 排序
    ...
    setTheadRows()
    if (!(this.url != null && this.serverPagination)) {
      // 本地排序
      this.sort();
    }
    this.onPageSizeChange();

# checkbox
    设置 checkedRows
    this.syncIsAllChecked();
    this.syncCheckedStyle();

# 布局
    固定表头
        initColumns() {
            ...
            setTimeout(() => {
                this.setStickyThead();
            }, 0)
        }
    自动高度
        显示指定了高度(height、max-height) 则无效
        监听页面高度变化
        手动调用API
    布局模式
        固定布局(width: 100%) 列等宽
        自动布局(width :100%) 自适应
        内联(max-width: 100%) 
        不换行(溢出水平滚动)
            固定列
                内容渲染 if(hasXScrollbar) { ... }
                ResizeObserver if(hasXScrollbar && !hasStickyColumn) { ... }
            激活固定列
                X滚动事件
                内容渲染
                ResizeObserver
    列宽配置
        设置列宽
            width | maxWidth 换行展示
        溢出隐藏(必须设置列宽width | maxWidth)
            ellipsis: true
        不换行布局中的弹性列(占用剩余宽度)
            width: 'auto'; 可以设置一个 minWidth
    [restoreStickyColumn]
        hasStickyColumn = false;
    [activeStickyColumn]
        if(hasXScrollbar) {
            ...
        } else {
            removeClass(...)
        }
    [setStickyColumn] 
        hasStickyColumn = true;
        
# IDEA
固定列动画
分页UI改造
虚拟滚动

======================
自动布局算法
    (使用 colgroup > col 效果一样)
    宽度充足 width: 100%
        width 有效
        min-width 无效(没意义)
        max-width 无效
    宽度不足
        width 有效
        min-width 有效
        max-width 无效(没意义)
    宽度不足(不换行)
        width 无效
        min-width 有效
        max-width 有效(必须在所有的行设置)
    内联
        width 有效
        min-width 有效
        max-width 有效(必须在所有的行设置)

固定布局算法 width: 100%
    (使用 colgroup > col 效果一样)
    宽度充足 width: 100%
        width 有效
        min-width 无效(没意义)
        max-width 无效
    宽度不足 & 宽度不足(不换行)
        width 有效
        min-width 无效
        max-width 无效(没意义)