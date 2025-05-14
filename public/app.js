document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const usersList = document.getElementById('usersList');
    const refreshBtn = document.getElementById('refreshUsers');
    const messageDiv = document.getElementById('message');
    const usernameInput = registerForm.querySelector('input[name="username"]');
    const submitButton = registerForm.querySelector('button[type="submit"]');

    // Проверить, зарегистрирован ли пользователь (по localStorage)
    const storedUsername = localStorage.getItem('registeredUsername');
    if (storedUsername) {
        disableForm(storedUsername);
    }

    // Загрузить пользователей при загрузке страницы
    loadUsers();

    // Обработка формы регистрации
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(registerForm);
        const username = formData.get('username');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username }),
            });

            const data = await response.json();

            if (response.ok) {
                const registeredUsername = data.user.username;
                localStorage.setItem('registeredUsername', registeredUsername);
                showMessage(`User ${registeredUsername} registered successfully!`, 'success');
                registerForm.reset();
                disableForm(registeredUsername);
                loadUsers();
            } else {
                showMessage(data.error || 'Registration failed', 'error');
            }

        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
            console.error('Error:', error);
        }
    });

    // Кнопка обновления списка пользователей
    refreshBtn.addEventListener('click', loadUsers);

    // Функция загрузки пользователей
    async function loadUsers() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();

            usersList.innerHTML = '';
            if (users.users.length === 0) {
                usersList.innerHTML = '<li>No users registered yet</li>';
            } else {
                const count = document.createElement("p")
                const line = document.createElement("hr")
                count.innerText = `${users.users.length} челов`;
                usersList.appendChild(count)
                usersList.appendChild(line)
                users.users.forEach(user => {
                    const li = document.createElement('li');
                    li.textContent = `${user.username}`;
                    usersList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error loading users:', error);
            usersList.innerHTML = '<li>Error loading users</li>';
        }
    }

    // Функция показа сообщений
    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.className = type;
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 3000);
    }

    // Отключение формы после регистрации
    function disableForm(username) {
        usernameInput.disabled = true;
        usernameInput.value = username;
        submitButton.disabled = true;
        showMessage(`You are already registered as ${username}`, 'success');
    }
});
