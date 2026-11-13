import { expect, test } from '@playwright/test'

test.describe('portada', () => {
  test('pinta el título en Arcano oscuro por defecto @smoke', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { level: 1, name: 'Torrente Arcano' })).toBeVisible()
    const html = page.locator('html')
    await expect(html).toHaveAttribute('lang', 'es')
    await expect(html).toHaveAttribute('data-theme', 'arcano')
    await expect(html).toHaveAttribute('data-mode', 'dark')
  })

  test('el interruptor cambia a modo claro y el modo sobrevive a la recarga', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const toggle = page.getByRole('switch', { name: 'Modo claro' })
    const background = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)

    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    const darkBackground = await background()

    await toggle.click()

    await expect(html).toHaveAttribute('data-mode', 'light')
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(await background()).not.toBe(darkBackground)

    await page.reload()

    await expect(html).toHaveAttribute('data-mode', 'light')
    await expect(page.getByRole('switch', { name: 'Modo claro' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  test('el interruptor es el medallón de huevos: Ébano en oscuro, Marfil en claro', async ({
    page,
  }) => {
    await page.goto('/')
    const toggle = page.getByRole('switch', { name: 'Modo claro' })
    const eggs = toggle.locator('img')

    await expect(eggs).toHaveCount(2)
    // Arte real del juego, cargado, con tamaño explícito para no mover el contenido.
    // Cada huevo es un <picture> con AVIF y WebP a 1x y 2x, y el PNG de respaldo.
    for (const picture of await toggle.locator('picture').all()) {
      await expect(picture.locator('source[type="image/avif"]')).toHaveAttribute(
        'srcset',
        /\.avif 1x, .*\.avif 2x/,
      )
      await expect(picture.locator('source[type="image/webp"]')).toHaveAttribute(
        'srcset',
        /\.webp 1x, .*\.webp 2x/,
      )
    }
    for (const egg of await eggs.all()) {
      expect(await egg.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\.avif$/)
      await expect(egg).toHaveAttribute('width', '28')
      await expect(egg).toHaveAttribute('height', '28')
      expect(await egg.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    }
    await expect(toggle).toHaveAttribute('title', /Dofus Ébano/)

    const box = await toggle.boundingBox()
    await toggle.click()
    await expect(toggle).toHaveAttribute('title', /Dofus Marfil/)
    expect(await toggle.boundingBox()).toEqual(box)
  })

  test('el medallón tiene un estado hover con el ratón', async ({ page }) => {
    await page.goto('/')
    const toggle = page.getByRole('switch', { name: 'Modo claro' })
    const track = toggle.locator('[data-part="track"]')
    const border = () => track.evaluate((el) => getComputedStyle(el).borderColor)
    const accent = await page.evaluate(() => {
      const probe = document.createElement('span')
      probe.style.color = 'var(--color-accent)'
      document.body.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    })

    expect(await border()).not.toBe(accent)
    await toggle.hover()
    await expect.poll(border).toBe(accent)
  })

  test('el script del head recupera el modo de localStorage si falta la cookie', async ({
    page,
    context,
  }) => {
    await page.goto('/')
    const stored = await page.evaluate(() => {
      try {
        localStorage.setItem('ta-mode', 'light')
        return true
      } catch {
        return false
      }
    })
    expect(stored, 'localStorage no está disponible en el navegador de pruebas').toBe(true)
    await context.clearCookies()

    await page.reload()

    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light')
  })
})

test('el panel de Payload responde en /admin @smoke', async ({ page }) => {
  const response = await page.goto('/admin')

  expect(response?.status()).toBeLessThan(400)
  // Sin usuarios, Payload pide crear el primero; con ellos, iniciar sesión.
  await expect(page).toHaveURL(/\/admin(\/create-first-user|\/login)?/)
})

// Con la base de E2E, que ya tiene el usuario del panel de las guías sembradas
// (tests/e2e/seed/guides.ts), así que el panel pide iniciar sesión. No es smoke: no
// envía nada a un entorno desplegado, pero depende de esa base.
test('el panel de Payload hidrata el formulario de inicio de sesión sin errores', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/admin/login')
  await expect(page.locator('input[name="email"]')).toBeVisible()

  // La validación del formulario vacío corre en el cliente: solo aparece si React
  // hidrató el panel.
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByText('Por favor, introduce un correo electrónico válido.')).toBeVisible()
  await expect(page.getByText('Este campo es obligatorio.')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/login$/)
  expect(errors).toEqual([])
})

// Solo lectura: los smoke tests corren también contra entornos desplegados.
test('la comprobación de vida responde ok en /api/health, sin hablar de la base @smoke', async ({
  request,
}) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toBe('no-store')
  const body = await response.json()
  expect(body).toMatchObject({ status: 'ok' })
  expect(body.commit).toEqual(expect.any(String))
  expect(body).not.toHaveProperty('db')
})

test('la comprobación de la base responde ok en /api/ready @smoke', async ({ request }) => {
  const response = await request.get('/api/ready')

  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toBe('no-store')
  expect(await response.json()).toMatchObject({ status: 'ok', db: 'ok' })
})
