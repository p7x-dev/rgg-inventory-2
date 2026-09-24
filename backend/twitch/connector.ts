import type { Application } from 'express';
import crypto from 'node:crypto';
import {
	findDatInTable,
	insertDataInTAble as insertDataInTable,
	updateDataOnTable,
} from '../database/connector';

interface TwitchOAuthResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
	scope: string[];
}

interface TwitchUser {
	id: string;
	login: string;
	display_name: string;
}

interface User {
	id: string;
	display_name: string;
	username: string;
	twitch_user_id: string;
}

interface TwitchUsersResponse {
	data: TwitchUser[];
}

interface TwitchFollowersResponse {
	total: number;
}

interface TwitchSubscribersResponse {
	total: number;
	points: number;
}

interface TwitchChattersResponse {
	total: number;
}

interface TwitchStream {
	id: string;
	user_id: string;
	user_login: string;
	user_name: string;
	game_id: string;
	game_name: string;
	type: 'live' | '';
	title: string;
	viewer_count: number;
	started_at: string;
	language: string;
	thumbnail_url: string;
	tags: string[];
}

interface TwitchStreamsResponse {
	data: TwitchStream[];
}
export function useTwitch(app: Application) {
	const twitchBaseLink = process.env['TWITCH_ID_URL'];
	const twitchOAuthUrl = process.env['TWITCH_APP_URL'];
	const twitchClientKey = process.env['TWITCH_CLIENT_KEY'];
	const twitchSecretKey = process.env['TWITCH_SECRET_KEY'];

	if (!twitchBaseLink || !twitchOAuthUrl || !twitchClientKey || !twitchSecretKey) {
		throw new Error('Twitch OAuth environment variables are not configured');
	}

	const cookieOptions = {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: process.env['IS_PROD'] === '1',
	};

	const headers = (accessToken: string) => ({
		Authorization: `Bearer ${accessToken}`,
		'Client-Id': twitchClientKey,
	});

	app.get('/twitch', (req, res) => {
		const state = crypto.randomBytes(32).toString('hex');

		res.cookie('e-hub_twitch_oauth_state', state, cookieOptions);

		const params = new URLSearchParams({
			client_id: twitchClientKey,
			redirect_uri: twitchOAuthUrl,
			response_type: 'code',
			state,
			scope: [
				'moderator:read:followers',
				'moderator:read:chatters',
				'channel:read:subscriptions',
				'user:read:chat',
			].join(' '),
		});

		return res.redirect(`${twitchBaseLink}?${params}`);
	});

	app.get('/twitch/callback', async (req, res) => {
		const { state, code } = req.query;
		const savedState = req.cookies['e-hub_twitch_oauth_state'];

		if (
			typeof code !== 'string' ||
			typeof state !== 'string' ||
			typeof savedState !== 'string' ||
			state !== savedState
		) {
			return res.status(400).send('Invalid OAuth data');
		}

		res.clearCookie('e-hub_twitch_oauth_state', cookieOptions);

		try {
			const params = new URLSearchParams({
				client_id: twitchClientKey,
				client_secret: twitchSecretKey,
				code,
				grant_type: 'authorization_code',
				redirect_uri: twitchOAuthUrl,
			});

			const response = await fetch('https://id.twitch.tv/oauth2/token', {
				method: 'POST',
				body: params,
			});

			if (!response.ok) {
				return res.status(400).send('Failed to get Twitch token');
			}

			const data = (await response.json()) as TwitchOAuthResponse;

			res.cookie('e-hub_twitch_refresh_token', data.refresh_token, cookieOptions);

			return res.redirect('/twitch/validate');
		} catch {
			return res.status(502).send('Failed to connect to Twitch');
		}
	});

	app.get('/twitch/validate', async (req, res) => {
		const refreshToken = req.cookies['e-hub_twitch_refresh_token'];

		if (!refreshToken) {
			return res.status(401).send('Invalid token');
		}

		try {
			const params = new URLSearchParams({
				client_id: twitchClientKey,
				client_secret: twitchSecretKey,
				grant_type: 'refresh_token',
				refresh_token: refreshToken,
			});

			const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
				method: 'POST',
				body: params,
			});

			if (!tokenResponse.ok) {
				res.clearCookie('e-hub_twitch_refresh_token', cookieOptions);

				return res.status(401).send('Invalid Twitch token');
			}

			const tokenData = (await tokenResponse.json()) as TwitchOAuthResponse;

			res.cookie('e-hub_twitch_refresh_token', tokenData.refresh_token, cookieOptions);

			const twitchHeaders = headers(tokenData.access_token);

			const userResponse = await fetch('https://api.twitch.tv/helix/users', {
				headers: twitchHeaders,
			});

			if (!userResponse.ok) {
				return res.status(401).send('Failed to validate Twitch user');
			}

			const userData = (await userResponse.json()) as TwitchUsersResponse;

			const twitchUser = userData.data[0];

			if (!twitchUser) {
				return res.status(401).send('Twitch user not found');
			}

			const queryResult = await findDatInTable<User>('users', {
				twitch_user_id: twitchUser.id,
				username: twitchUser.login,
			});

			let localUser = queryResult.rows[0];

			if (!localUser) {
				const userResult = await insertDataInTable('users', {
					twitch_user_id: twitchUser.id,
					username: twitchUser.login,
					display_name: twitchUser.display_name,
				});

				localUser = userResult.rows[0] as User;

				await insertDataInTable('tokens', {
					user_id: localUser['id'],
					refresh_token: tokenData.refresh_token,
				});
			} else {
				await updateDataOnTable(
					'users',
					{ id: localUser.id },
					{
						username: twitchUser.login,
						display_name: twitchUser.display_name,
					},
				);

				const tokenResult = await findDatInTable('tokens', {
					user_id: localUser.id,
				});

				if (tokenResult.rows[0]) {
					await updateDataOnTable(
						'tokens',
						{ user_id: localUser.id },
						{
							refresh_token: tokenData.refresh_token,
						},
					);
				} else {
					await insertDataInTable('tokens', {
						user_id: localUser.id,
						refresh_token: tokenData.refresh_token,
					});
				}
			}

			const [followersResponse, subscribersResponse, chattersResponse, streamResponse] =
				await Promise.all([
					fetch(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${twitchUser.id}`, {
						headers: twitchHeaders,
					}),
					fetch(`https://api.twitch.tv/helix/subscriptions?broadcaster_id=${twitchUser.id}`, {
						headers: twitchHeaders,
					}),
					fetch(
						// eslint-disable-next-line max-len
						`https://api.twitch.tv/helix/chat/chatters?broadcaster_id=${twitchUser.id}&moderator_id=${twitchUser.id}`,
						{
							headers: twitchHeaders,
						},
					),
					fetch(`https://api.twitch.tv/helix/streams?user_id=${twitchUser.id}`, {
						headers: twitchHeaders,
					}),
				]);

			const followers = followersResponse.ok
				? ((await followersResponse.json()) as TwitchFollowersResponse)
				: { total: 0 };

			const subscribers = subscribersResponse.ok
				? ((await subscribersResponse.json()) as TwitchSubscribersResponse)
				: { total: 0, points: 0 };

			const chatters = chattersResponse.ok
				? ((await chattersResponse.json()) as TwitchChattersResponse)
				: { total: 0 };

			const streams = streamResponse.ok
				? ((await streamResponse.json()) as TwitchStreamsResponse)
				: { data: [] };

			const stream = streams.data[0] ?? null;

			const streamOnlineInfo = {
				online: true,
				id: stream.id,
				title: stream.title,
				gameId: stream.game_id,
				gameName: stream.game_name,
				viewerCount: stream.viewer_count,
				startedAt: stream.started_at,
				language: stream.language,
				thumbnailUrl: stream.thumbnail_url,
				tags: stream.tags,
			};

			const streamOfflineInfo = {
				online: followers,
			};

			return res.json({
				valid: true,
				user: {
					id: localUser.id,
					twitchId: twitchUser.id,
					username: twitchUser.login,
					displayName: twitchUser.display_name,
				},
				stats: {
					followers: followers.total,
					subscribers: subscribers.total,
					chatters: chatters.total,
				},
				stream: stream ? streamOnlineInfo : streamOfflineInfo,
			});
		} catch {
			return res.status(502).send('Failed to connect to Twitch');
		}
	});
}
