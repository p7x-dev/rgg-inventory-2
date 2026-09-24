import type { AppState } from '../shared/types/timer-state';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { config } from 'dotenv';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { runner } from 'node-pg-migrate';
import { connect } from './database/connector';
import { useTwitch } from './twitch/connector';

config();

export const app = express();
const limiter = rateLimit({
	windowMs: 1000,
	limit: 100,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	ipv6Subnet: 56,
});

export const INITIAL_STATE: AppState = {
	appMode: 'solo',
	timerState: {
		mode: 'pause',
		time: {
			minutes: 0,
			seconds: 0,
			hours: 0,
		},
	},
	hotbarState: {
		platforms: [],
	},
};

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json());
app.use(limiter);
app.use(cookieParser());

let currentState: AppState = { ...INITIAL_STATE };

function buildDbUrl() {
	// eslint-disable-next-line max-len
	return `postgresql://${process.env['DB_USER']}:${process.env['DB_PASSWORD']}@${process.env['DB_HOST']}:${process.env['DB_PORT']}/${process.env['DB_NAME']}`;
}

connect().then(async () => {
	await runner({
		dir: './backend/migrations',
		databaseUrl: buildDbUrl(),
		direction: 'up',
		migrationsTable: 'migrations',
	});
});
useTwitch(app);
app.get('/rgg-sync', (_, res) => {
	res.json(currentState);
});

app.post('/rgg-sync', (req, res) => {
	const data = req.body as Partial<AppState>;
	currentState = {
		...currentState,
		...data,
	};
	res.json(currentState);
});

app.listen(3000, '127.0.0.1');
