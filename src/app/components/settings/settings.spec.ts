import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Settings } from './settings';

describe('settings', () => {
	let component: Settings;
	let fixture: ComponentFixture<Settings>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Settings],
		}).compileComponents();

		fixture = TestBed.createComponent(Settings);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
