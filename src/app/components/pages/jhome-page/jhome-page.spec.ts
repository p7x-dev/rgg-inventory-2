import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { JhomePage } from './jhome-page';

describe('jhomePage', () => {
	let component: JhomePage;
	let fixture: ComponentFixture<JhomePage>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [JhomePage],
		}).compileComponents();

		fixture = TestBed.createComponent(JhomePage);
		component = fixture.componentInstance;
		await fixture.whenStable();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
