import {
  ChangeDetectionStrategy,
  Component,
  effect,
  HostBinding,
  inject,
  Input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { combineLatest, map } from 'rxjs';

import { APP } from '~/models/constants';
import { Game, gameOptions } from '~/models/enum/game';
import { gameInfo } from '~/models/game-info';
import { MenuItem } from '~/models/menu-item';
import { isRecipeObjective } from '~/models/objective';
import { IconSmClassPipe } from '~/pipes/icon-class.pipe';
import { TranslatePipe } from '~/pipes/translate.pipe';
import { ContentService } from '~/services/content.service';
import { TranslateService } from '~/services/translate.service';
import { ObjectivesService } from '~/store/objectives.service';
import { PreferencesService } from '~/store/preferences.service';
import { SettingsService } from '~/store/settings.service';

interface MenuLink {
  label: string;
  icon: string;
  href: string;
}

@Component({
  selector: 'lab-header',
  standalone: true,
  imports: [RouterLink, IconSmClassPipe, TranslatePipe],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
  title = inject(Title);
  contentSvc = inject(ContentService);
  objectivesSvc = inject(ObjectivesService);
  preferencesSvc = inject(PreferencesService);
  settingsSvc = inject(SettingsService);
  translateSvc = inject(TranslateService);

  @HostBinding('class.sticky') @Input() sticky = false;
  @HostBinding('class.settings-xl-hidden') @Input() settingsXlHidden = false;

  gameInfo = this.settingsSvc.gameInfo;
  gameOptions = toSignal(
    combineLatest([
      toObservable(this.settingsSvc.game),
      ...gameOptions.map((o) => this.translateSvc.get(gameInfo[o.value].label)),
    ]).pipe(
      map(([game, ...labels]): MenuItem[] => {
        return gameOptions
          .map((o, i): [Game, string] => [o.value, labels[i]])
          .filter(([g]) => g !== game)
          .map(
            ([g, label]): MenuItem => ({
              icon: 'lab-icon small ' + gameInfo[g].icon,
              label,
              routerLink: gameInfo[g].route,
            }),
          );
      }),
    ),
  );

  links: MenuLink[] = [
    {
      label: 'header.source',
      icon: 'fa-brands fa-github',
      href: 'https://github.com/factoriolab/factoriolab',
    },
    {
      label: 'header.discord',
      icon: 'fa-brands fa-discord',
      href: 'https://discord.gg/N4FKV687x2',
    },
    {
      label: 'header.support',
      icon: 'fa-solid fa-mug-hot',
      href: 'https://ko-fi.com/dcbroad3',
    },
  ];

  constructor() {
    effect(() => {
      const objectives = this.objectivesSvc.baseObjectives();
      const data = this.settingsSvc.dataset();

      const name = objectives
        .map((o) =>
          isRecipeObjective(o)
            ? data.recipeEntities[o.targetId]?.name
            : data.itemEntities[o.targetId]?.name,
        )
        .find((n) => n != null);
      this.title.setTitle(name != null ? `${name} | ${APP}` : APP);
    });
  }

  cancelRouterLink(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
  }
}
