const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const redis = require('redis');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

const pool = new Pool({
	user: 'postgres',
	host: 'localhost',
	database: 'redis',
	password: 'SmartWork@123',
	port: 5432,
});

const redisClient = redis.createClient();

app.get('/users/:id', async (req, res) => {
	const userId = req.params.id;
	redisClient.get(userId, async (err, data) => {
		if (err) throw err;
		if (data) {
			res.send(JSON.parse(data));
		} else {
			const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [
				userId,
			]);
			res.send(rows[0]);
			redisClient.setex(userId, 3600, JSON.stringify(rows[0]));
		}
	});
});

app.post('/users', async (req, res) => {
	console.log(req.body);
	const { username, email } = req.body;
	const { rows } = await pool.query(
		'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
		[username, email],
	);
	res.send(rows[0]);
});

app.put('/users/:id', async (req, res) => {
	const userId = req.params.id;
	const { username, email } = req.body;
	const { rows } = await pool.query(
		'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING *',
		[username, email, userId],
	);
	res.send(rows[0]);
	redisClient.del(userId);
});

app.delete('/users/:id', async (req, res) => {
	const userId = req.params.id;
	await pool.query('DELETE FROM users WHERE id = $1', [userId]);
	res.send(`User with ID ${userId} has been deleted.`);
	redisClient.del(userId);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
