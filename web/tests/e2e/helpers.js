export async function loginAsAdmin(page) {
    await page.goto('/login')
    await page.getByTestId('login-email').fill('admin@demo.com')
    await page.getByTestId('login-password').fill('Admin123!')
    await page.getByTestId('login-submit').click()
    await page.getByTestId('users-table').waitFor()
}

export function uniqueEmail(prefix = 'e2e') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}

export async function registerUser(page, email = uniqueEmail()) {
    await page.goto('/registro')
    await page.getByTestId('register-name').fill('Usuario de pruebas')
    await page.getByTestId('register-email').fill(email)
    await page.getByTestId('register-password').fill('Usuario123')
    await page.getByTestId('register-confirmation').fill('Usuario123')
    await page.getByTestId('register-submit').click()
    await page.getByTestId('profile-role').waitFor()
    return email
}

export async function createUsersForPagination(request, count = 9) {
    const login = await request.post('http://localhost:3000/api/auth/login', {
        data: { email: 'admin@demo.com', password: 'Admin123!' },
    })
    if (!login.ok()) throw new Error(`No se pudo iniciar sesión como admin: ${login.status()}`)
    const { token } = await login.json()

    for (let index = 0; index < count; index += 1) {
        const response = await request.post('http://localhost:3000/api/usuarios', {
            headers: { 'x-token': token },
            data: {
                nombre: `Paginacion ${Date.now()} ${index}`,
                email: uniqueEmail('pagina'),
                password: 'Usuario123',
                rol: 'usuario',
            },
        })
        if (response.status() !== 201) {
            throw new Error(`No se pudo preparar el usuario de paginación: ${response.status()} ${await response.text()}`)
        }
    }
}
