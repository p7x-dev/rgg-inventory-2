import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { Hotbar } from './components/hotbar/hotbar';

@Component({
	selector: 'app-root',
	imports: [RouterOutlet, TuiRoot, Hotbar],
	templateUrl: './app.html',
})
export class App {}
