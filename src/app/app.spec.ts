import { TestBed } from '@angular/core/testing';
import { provideTaiga } from '@taiga-ui/core';
import { of } from 'rxjs';
import { HotbarService } from '../../shared/services/hotbar.service';
import { YamlParser } from '../../shared/services/yaml-parser';
import { App } from './app';

describe('app', () => {
	beforeEach(async () => {
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});

		await TestBed.configureTestingModule({
			imports: [App],
			providers: [
				provideTaiga(),
				{
					provide: HotbarService,
					useValue: {
						initialLoad: () => of(null),
						updateState: () => of(null),
					},
				},
				{
					provide: YamlParser,
					useValue: {
						parse: () => of([]),
					},
				},
			],
		}).compileComponents();
	});

	it('should create the app', () => {
		const fixture = TestBed.createComponent(App);
		expect(fixture.componentInstance).toBeTruthy();
	});

	it('should render the hotbar', () => {
		const fixture = TestBed.createComponent(App);
		fixture.detectChanges();
		expect(fixture.nativeElement.querySelector('app-hotbar')).toBeTruthy();
	});
});
