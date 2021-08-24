import { Directive, ElementRef, Input } from '@angular/core';

/**
 * 为元素设置html属性
 */

@Directive({
  selector: '[x-attr]'
})
export class XAttrDirective {
  @Input('x-attr') attr = null;

  constructor(private elementRef: ElementRef) {}

  ngOnChanges() {
    if(this.attr) {
      Object.entries(this.attr).forEach(([key, value]) => {
        if(value != null) {
          this.elementRef.nativeElement.setAttribute(key, value);
        }
      });
    }
  }

  ngOnInit() {
    
  }

}
