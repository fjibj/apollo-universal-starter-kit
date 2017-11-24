import { Component, ElementRef, Input, OnInit, Renderer2, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'row',
  template: `
    <ng-content></ng-content>
	`,
  encapsulation: ViewEncapsulation.None
})
export default class Row implements OnInit {
  @Input() public noGutters: boolean;
  @Input() public justifyContent: string;
  @Input() public justifyContentSm: string;
  @Input() public justifyContentMd: string;
  @Input() public justifyContentLg: string;
  @Input() public justifyContentXs: string;
  @Input() public classNames: string;

  private justifies: any[] = [
    { justifyContent: 'justify-content' },
    { justifyContentSm: 'justify-content-sm' },
    { justifyContentMd: 'justify-content-md' },
    { justifyContentLg: 'justify-content-lg' },
    { justifyContentXl: 'justify-content-xl' }
  ];

  constructor(private element: ElementRef, private renderer: Renderer2) {}

  public ngOnInit(): void {
    this.addClassToElement('row');
    this.setGutters();
    this.generateUiClasses(this.justifies);
    this.classNames.split(' ').forEach((className: string) => this.addClassToElement(className));
  }

  private setGutters() {
    if (this.noGutters) {
      this.addClassToElement('no-gutters');
    }
  }

  private generateUiClasses(values: any[]) {
    values.forEach(item => {
      const key = this[Object.keys(item)[0]];
      const value = item[Object.keys(item)[0]];
      if (key) {
        this.addClassToElement(value, key);
      }
    });
  }

  private addClassToElement(className: string, value?: string) {
    const colClass = value ? `${className}-${value}` : className;
    this.renderer.addClass(this.element.nativeElement, colClass);
  }
}
