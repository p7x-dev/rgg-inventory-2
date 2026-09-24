import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Timer } from './timer';

describe('timer', () => {
	let component: Timer;
	let fixture: ComponentFixture<Timer>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Timer],
		}).compileComponents();

		fixture = TestBed.createComponent(Timer);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
