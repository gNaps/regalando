import { expect, test } from '@playwright/test';

test('carica e rimuove foto di lista e regalo senza cambiare le card', async ({page}) => {
  await page.goto('/');
  await page.getByRole('button',{name:'Modifica lista',exact:true}).click();
  let dialog = page.getByRole('dialog',{name:'Modifica lista',exact:true});
  await dialog.locator('input[type=file]').setInputFiles('tests/fixtures/photo.jpg');
  await expect(dialog.getByRole('status')).toContainText('Foto pronta');
  await dialog.getByRole('button',{name:'Salva modifiche'}).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.detail-hero .uploaded-cover img')).toBeVisible();

  await page.getByRole('button',{name:'Modifica lista',exact:true}).click();
  await page.getByRole('button',{name:'Rimuovi foto'}).click();
  await page.getByRole('button',{name:'Salva modifiche'}).click();
  await expect(page.locator('.detail-hero .uploaded-cover')).toHaveCount(0);
  await page.getByRole('button',{name:'Dettagli di Un libro',exact:true}).click();
  await page.getByRole('dialog',{name:'Un libro',exact:true}).getByRole('button',{name:'Aggiungi foto',exact:true}).click();
  dialog = page.getByRole('dialog',{name:'Foto del regalo',exact:true});
  await dialog.locator('input[type=file]').setInputFiles('tests/fixtures/photo.jpg');
  await dialog.getByRole('button',{name:'Salva foto'}).click();
  await expect(page.getByRole('dialog',{name:'Un libro',exact:true})).toBeVisible();
  await expect(page.locator('.gift-card .uploaded-product img')).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('file non valido e salvataggio fallito conservano il controllo della modale', async ({page}) => {
  await page.goto('/?image-error');
  await page.getByRole('button',{name:'Modifica lista',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Modifica lista'});
  await dialog.locator('input[type=file]').setInputFiles({name:'bad.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')});
  await expect(dialog.getByRole('alert')).toContainText('Immagine non valida');
  await dialog.locator('input[type=file]').setInputFiles('tests/fixtures/photo.jpg');
  await dialog.getByRole('button',{name:'Salva modifiche'}).click();
  await expect(dialog.getByRole('alert')).toContainText('Non siamo riusciti a salvare');
  await expect(dialog.getByRole('img',{name:'Anteprima della foto'})).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Salva modifiche'})).toBeEnabled();
});
