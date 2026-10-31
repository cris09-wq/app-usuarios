import { expect, test } from '@playwright/test'
import { createUsersForPagination, loginAsAdmin, registerUser, uniqueEmail } from './helpers.js'

test('login con credenciales incorrectas muestra el error sin salir de login', async ({ page }) => {
    await page.goto('/login')
    await page.getByTestId('login-email').fill('no-existe@example.com')
    await page.getByTestId('login-password').fill('Incorrecta123')
    await page.getByTestId('login-submit').click()

    await expect(page.getByTestId('alert')).toContainText('Credenciales inválidas')
    await expect(page).toHaveURL(/\/login$/)
})

test('registro crea una cuenta con rol Usuario y abre el perfil', async ({ page }) => {
    await registerUser(page)

    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByTestId('profile-role')).toHaveText('Usuario')
})

test('sin sesión, abrir usuarios redirige a login', async ({ page }) => {
    await page.goto('/usuarios')

    await expect(page).toHaveURL(/\/login/)
})

test('un usuario autenticado que abre usuarios es redirigido al perfil', async ({ page }) => {
    await registerUser(page)
    await page.goto('/usuarios')

    await expect(page).toHaveURL(/\/perfil$/)
})

test('admin crea, busca y edita un usuario', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByTestId('users-new').click()

    const email = uniqueEmail('admin-crea')
    await page.getByTestId('user-name').fill('Usuario creado')
    await page.getByTestId('user-email').fill(email)
    await page.getByTestId('user-password').fill('Usuario123')
    await page.getByTestId('user-submit').click()

    await page.getByTestId('users-search').fill(email)
    const row = page.getByTestId('user-row').filter({ hasText: email })
    await expect(row).toBeVisible()
    await row.getByTestId('user-edit').click()
    await page.getByTestId('user-name').fill('Usuario editado')
    await page.getByTestId('user-submit').click()

    await page.getByTestId('users-search').fill(email)
    await expect(page.getByTestId('user-row').filter({ hasText: 'Usuario editado' })).toBeVisible()
})

test('admin elimina un usuario y este ya no puede iniciar sesión', async ({ page }) => {
    await loginAsAdmin(page)
    await page.getByTestId('users-new').click()

    const email = uniqueEmail('admin-elimina')
    await page.getByTestId('user-name').fill('Usuario temporal')
    await page.getByTestId('user-email').fill(email)
    await page.getByTestId('user-password').fill('Usuario123')
    await page.getByTestId('user-submit').click()

    await page.getByTestId('users-search').fill(email)
    const row = page.getByTestId('user-row').filter({ hasText: email })
    await expect(row).toBeVisible()
    await row.getByTestId('user-delete').click()
    await page.getByTestId('confirm-accept').click()
    await expect(page.getByTestId('user-row').filter({ hasText: email })).toHaveCount(0)

    await page.getByTestId('logout').click()
    await page.getByTestId('login-email').fill(email)
    await page.getByTestId('login-password').fill('Usuario123')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('alert')).toContainText('Usuario desactivado')
})

test('filtro de rol y paginación muestran una página siguiente', async ({ page, request }) => {
    await createUsersForPagination(request)
    await loginAsAdmin(page)
    await page.getByTestId('users-role-filter').selectOption('usuario')

    await expect(page.getByTestId('pagination-info')).toContainText('Mostrando 1–8 de')
    await page.getByTestId('pagination-next').click()
    await expect(page.getByTestId('pagination-page')).toContainText('Página 2 de')
    await expect(page.getByTestId('pagination-info')).toContainText('Mostrando 9–')
})

test('usuario cambia su contraseña, cierra sesión e inicia con la nueva', async ({ page }) => {
    const email = await registerUser(page)
    await page.getByTestId('password-current').fill('Usuario123')
    await page.getByTestId('password-new').fill('NuevaClave123')
    await page.getByTestId('password-confirmation').fill('NuevaClave123')
    await page.getByTestId('password-submit').click()

    await page.getByTestId('logout').click()
    await page.getByTestId('login-email').fill(email)
    await page.getByTestId('login-password').fill('NuevaClave123')
    await page.getByTestId('login-submit').click()
    await expect(page.getByTestId('profile-role')).toHaveText('Usuario')
})

test('ruta inexistente muestra la página 404', async ({ page }) => {
    await page.goto('/ruta-que-no-existe')

    await expect(page.getByTestId('not-found-page')).toBeVisible()
})
