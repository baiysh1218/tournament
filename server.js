require('dotenv').config();

const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// ✅ Инициализация пула соединений
let pool;
try {
    pool = new Pool({
        user: 'postgres',         // Убедись, что эти данные соответствуют твоей БД
        host: 'localhost',
        database: 'postgres',     // База данных
        password: '1218',         // Пароль
        port: 5432,
    });

    pool.query('SELECT NOW()', (err) => {
        if (err) {
            console.error('⚠️ Ошибка подключения к PostgreSQL:', err);
        } else {
            console.log('✅ Успешное подключение к PostgreSQL');
        }
    });
} catch (err) {
    console.error('❌ Ошибка при создании пула соединений:', err);
    process.exit(1);
}

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Проверка и создание таблицы users при необходимости
async function checkUsersTable() {
    try {
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'users'
            )
        `);
        if (!result.rows[0].exists) {
            console.log('🛠 Создаем таблицу users...');
            await pool.query(`
                CREATE TABLE users (
                                       id SERIAL PRIMARY KEY,
                                       username VARCHAR(50) NOT NULL UNIQUE,
                                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        }
    } catch (err) {
        console.error('❌ Ошибка при проверке таблицы users:', err);
    }
}

checkUsersTable();

// ✅ Маршрут регистрации пользователя
app.post('/api/register', async (req, res) => {
    const { username } = req.body;

    if (!username || typeof username !== 'string' || username.trim() === '') {
        return res.status(400).json({
            error: 'Username is required and must be a non-empty string'
        });
    }

    const cleanUsername = username.trim();

    try {
        console.log(`🔄 Попытка регистрации пользователя: "${cleanUsername}"`);
        const result = await pool.query(
            'INSERT INTO users (username) VALUES ($1) RETURNING id, username, created_at',
            [cleanUsername]
        );

        if (result.rows.length === 0) {
            throw new Error('No data returned from query');
        }

        console.log('✅ Успешная регистрация:', result.rows[0]);
        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('❌ Ошибка регистрации:', err);

        if (err.code === '23505') {
            res.status(409).json({
                error: 'Username already exists',
                suggestion: 'Please choose a different username'
            });
        } else {
            res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }
});

// ✅ Получение списка пользователей
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, created_at FROM users ORDER BY created_at DESC'
        );

        res.json({
            success: true,
            count: result.rowCount,
            users: result.rows
        });
    } catch (err) {
        console.error('❌ Ошибка при получении пользователей:', err);
        res.status(500).json({
            error: 'Failed to fetch users',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ✅ Обработка несуществующих маршрутов
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// ✅ Общий обработчик ошибок
app.use((err, req, res, next) => {
    console.error('🔥 Необработанная ошибка:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ✅ Запуск сервера
app.listen(port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${port}`);
});

// ✅ Завершение работы сервера (Ctrl+C)
process.on('SIGINT', async () => {
    console.log('\n🛑 Завершение работы...');
    await pool.end();
    process.exit(0);
});
