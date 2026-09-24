import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Hotbar } from './hotbar';

describe('hotbar', () => {
	let component: Hotbar;
	let fixture: ComponentFixture<Hotbar>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [Hotbar],
		}).compileComponents();

		fixture = TestBed.createComponent(Hotbar);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
