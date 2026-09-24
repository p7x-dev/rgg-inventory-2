import Postgres from 'pg';

const client = new Postgres.Client({
	port: Number(process.env['DB_PORT']) ?? 5432,
	host: process.env['DB_HOST'],
	user: process.env['DB_USER'] ?? 'postgres',
	password: process.env['DB_PASSWORD'],
	database: process.env['DB_NAME'],
});

export async function connect() {
	return await client.connect();
}

export async function insertDataInTAble<T extends Postgres.QueryResultRow>(
	tableName: string,
	data: T,
) {
	const columns = Object.keys(data).join(',');
	const values = Object.values(data);
	const placeholders = values.map((_, id) => `${id + 1}`).join(',');

	return await client.query<T>(
		`insert into (${columns}) ${tableName} values (${placeholders}) returning (*)`,
		values,
	);
}

export async function updateDataOnTable<
	T extends Postgres.QueryResultRow,
	V extends Postgres.QueryResultRow,
>(tableName: string, where: Partial<T>, values: Partial<V>) {
	const valueEntries = Object.entries(values);
	const whereEntries = Object.entries(where);

	const set = valueEntries.map(([column], index) => `${column} = $${index + 1}`).join(', ');

	const whereClause = whereEntries
		.map(([column], index) => `${column} = $${valueEntries.length + index + 1}`)
		.join(' AND ');

	const queryValues = [
		...valueEntries.map(([, value]) => value),
		...whereEntries.map(([, value]) => value),
	];

	return client.query<T>(`UPDATE ${tableName} SET ${set} WHERE ${whereClause}`, queryValues);
}

export async function removeDataFromTable<T extends Postgres.QueryResultRow>(
	tableName: string,
	where: Partial<T>,
) {
	const values = Object.values(where);

	const whereClause = Object.keys(where)
		.map((column, index) => `${column} = $${index + 1}`)
		.join(' AND ');
	return await client.query<T>(`delete from ${tableName} where ${whereClause}`, values);
}

export async function findDatInTable<T extends Postgres.QueryResultRow>(
	table: string,
	where: Partial<T>,
) {
	const value = Object.values(where);
	const colums = Object.keys(where).join(', ');
	const whereClause = Object.keys(where)
		.map((column, index) => `${column} = $${index + 1}`)
		.join(' AND ');

	return await client.query<T>(`select (${colums}) from ${table} where ${whereClause}`, value);
}
