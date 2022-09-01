import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AutoFocusModule } from 'primeng/autofocus';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MenuModule } from 'primeng/menu';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { RippleModule } from 'primeng/ripple';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { TabMenuModule } from 'primeng/tabmenu';
import { TabViewModule } from 'primeng/tabview';
import { TooltipModule } from 'primeng/tooltip';

const modules = [
  // primeng
  AutoFocusModule,
  ButtonModule,
  CardModule,
  CheckboxModule,
  ConfirmDialogModule,
  DialogModule,
  DropdownModule,
  InputNumberModule,
  InputTextModule,
  MenuModule,
  MultiSelectModule,
  ProgressSpinnerModule,
  RippleModule,
  ScrollPanelModule,
  SplitButtonModule,
  TableModule,
  TabMenuModule,
  TabViewModule,
  TooltipModule,

  // ngx-translate
  TranslateModule,
];

@NgModule({
  imports: [CommonModule, ...modules],
  exports: [...modules],
})
export class VendorModule {}
