// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'

import { applyPanelA11yFixes } from '@/lib/admin/a11y-fixes'

// A-21: los controles de Payload que axe encuentra sin nombre. El HTML de cada caso es el que
// pinta Payload 3.92 (copiado del panel), recortado.

const more = '<svg class="icon icon--more"></svg>'

function render(html: string) {
  document.body.innerHTML = html
  applyPanelA11yFixes(document.body)
}

const $ = (selector: string) => document.querySelector(selector)!

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('applyPanelA11yFixes', () => {
  it('el asa de arrastre dice qué hace y cómo usarla con el teclado', () => {
    render('<div class="collapsible__drag" role="button" tabindex="0"></div>')
    expect($('.collapsible__drag').getAttribute('aria-label')).toBe(
      'Mover la fila: arrástrala, o pulsa Espacio y usa las flechas',
    )
  })

  it('los botones «…» se llaman por lo que abren', () => {
    render(`
      <div class="array-actions popup"><button class="popup-button" id="fila">${more}</button></div>
      <div class="clipboard-action__popup popup"><button class="popup-button" id="portapapeles">${more}</button></div>
      <div class="doc-controls__popup popup"><button class="popup-button" id="documento">${more}</button></div>
      <div class="btn--withPopup"><button id="action-save"><span class="btn__label">Publicar cambios</span></button>
        <div class="popup"><button class="popup-button" id="publicar"><svg class="icon icon--chevron"></svg></button></div></div>
      <div class="popup"><button class="popup-button" id="otro">${more}</button></div>
    `)
    const label = (id: string) => $(`#${id}`).getAttribute('aria-label')
    expect(label('fila')).toBe('Más acciones de la fila: mover, duplicar o quitar')
    expect(label('portapapeles')).toBe('Copiar o pegar')
    expect(label('documento')).toBe('Más acciones de esta página')
    expect(label('publicar')).toBe('Más opciones de «Publicar cambios»')
    expect(label('otro')).toBe('Más opciones')
  })

  it('no toca un botón que ya tiene texto o nombre', () => {
    render(`
      <div class="popup"><button class="popup-button" id="texto">Columnas</button></div>
      <div class="popup"><button class="popup-button" id="nombre" aria-label="Filtros">${more}</button></div>
    `)
    expect($('#texto').hasAttribute('aria-label')).toBe(false)
    expect($('#nombre').getAttribute('aria-label')).toBe('Filtros')
  })

  it('las casillas de la lista dicen qué eligen', () => {
    render(`
      <table><thead><tr><th><input aria-label="" aria-labelledby="select-all" id="select-all" type="checkbox"></th></tr></thead>
      <tbody><tr><td><input aria-label="" id="fila-1" type="checkbox"></td><td><a href="#">Dofawa</a></td></tr>
      <tr><td><input aria-label="" id="fila-2" type="checkbox"></td></tr></tbody></table>
    `)
    const all = $('#select-all')
    expect(all.getAttribute('aria-label')).toBe('Elegir todas')
    // Se apuntaba a sí misma: con ella, el nombre seguiría vacío.
    expect(all.hasAttribute('aria-labelledby')).toBe(false)
    expect($('#fila-1').getAttribute('aria-label')).toBe('Elegir Dofawa')
    expect($('#fila-2').getAttribute('aria-label')).toBe('Elegir esta fila')
  })

  it('el editor de texto y los desplegables toman la etiqueta de su campo', () => {
    render(`
      <div class="field-type"><label class="field-label">Introducción<span class="required">*</span></label>
        <div class="ContentEditable__root" role="textbox"></div></div>
      <div class="field-type"><label class="field-label">Misión de DofusDB</label>
        <input class="rs__input" id="rs"></div>
      <div class="ContentEditable__root" role="textbox" id="suelto"></div>
    `)
    expect($('.field-type .ContentEditable__root').getAttribute('aria-label')).toBe('Introducción')
    expect($('#rs').getAttribute('aria-label')).toBe('Misión de DofusDB')
    expect($('#suelto').getAttribute('aria-label')).toBe('Texto')
  })

  it('la vista previa en vivo tiene título', () => {
    render('<iframe id="live-preview-iframe"></iframe>')
    expect($('iframe').getAttribute('title')).toBe('Vista previa de la página')
  })

  it('la pestaña de versiones dice también cuántas hay, como se ve', () => {
    render(
      `<a class="doc-tab" aria-label="Versiones"><span class="doc-tab__label">Versiones&nbsp;<span class="pill-version-count">3</span></span></a>`,
    )
    expect($('a').getAttribute('aria-label')).toBe('Versiones 3')
    // Al cambiar la cuenta, el nombre la sigue.
    $('.pill-version-count').textContent = '4'
    applyPanelA11yFixes(document.body)
    expect($('a').getAttribute('aria-label')).toBe('Versiones 4')
  })

  it('las pestañas del documento no se anuncian como una lista rota', () => {
    render('<ul class="doc-tabs__tabs"><div></div><a href="#">Editar</a></ul>')
    expect($('ul').getAttribute('role')).toBe('none')
  })

  it('repetirla no cambia nada', () => {
    render(
      '<div class="collapsible__drag" role="button"></div><iframe id="live-preview-iframe"></iframe>',
    )
    const before = document.body.innerHTML
    expect(applyPanelA11yFixes(document.body)).toBe(0)
    expect(document.body.innerHTML).toBe(before)
  })

  it('la flecha de react-select sale del tabulador; los dibujos se dejan como están', () => {
    render(`<div class="rs__indicators">
      <button class="dropdown-indicator" aria-hidden="true" type="button">
        <svg aria-hidden="true" class="icon"></svg></button></div>`)
    expect($('.dropdown-indicator').getAttribute('tabindex')).toBe('-1')
    expect($('svg').hasAttribute('tabindex')).toBe(false)
  })

  it('la cruz de react-select sigue a mano con el teclado (Intro la vacía), con nombre', () => {
    render(`<div class="rs__indicators">
      <div class="clear-indicator" aria-hidden="true" role="button" tabindex="0">
        <svg aria-hidden="true"></svg></div></div>`)
    const clear = $('.clear-indicator')
    expect(clear.getAttribute('tabindex')).toBe('0')
    expect(clear.hasAttribute('aria-hidden')).toBe(false)
    expect(clear.getAttribute('aria-label')).toBe('Vaciar el campo')
    expect($('svg').getAttribute('aria-hidden')).toBe('true')
  })

  it('los botones de una imagen elegida dicen qué hacen', () => {
    render(`<div class="upload-relationship-details__actions">
      <button class="upload-relationship-details__edit btn--icon-only"><svg></svg></button>
      <button class="upload-relationship-details__remove btn--icon-only"><svg></svg></button></div>`)
    expect($('.upload-relationship-details__edit').getAttribute('aria-label')).toBe(
      'Editar esta imagen',
    )
    expect($('.upload-relationship-details__remove').getAttribute('aria-label')).toBe(
      'Quitar esta imagen',
    )
  })

  it('el ancho y el alto de la vista previa tienen nombre', () => {
    render(`<input class="toolbar-input" name="live-preview-width" type="number">
      <input class="toolbar-input" name="live-preview-height" type="number">`)
    expect($('[name="live-preview-width"]').getAttribute('aria-label')).toBe(
      'Ancho de la vista previa, en px',
    )
    expect($('[name="live-preview-height"]').getAttribute('aria-label')).toBe(
      'Alto de la vista previa, en px',
    )
  })

  it('el candado de una página que otra cuenta edita dice quién la edita', () => {
    render(`<div class="locked" role="button" tabindex="0">
      <div class="tooltip locked__tooltip">e2e@torrentearcano.test está editando</div><svg></svg></div>
      <div class="locked" role="button" tabindex="0" id="sin-texto"><svg></svg></div>`)
    expect($('.locked').getAttribute('aria-label')).toBe('e2e@torrentearcano.test está editando')
    expect($('#sin-texto').getAttribute('aria-label')).toBe('Otra cuenta está editando esta página')
  })

  it('el nombre de una casilla sigue al título de su fila', () => {
    render(`<table><tbody><tr><td><input aria-label="" id="f" type="checkbox"></td>
      <td><a href="#">Dofawa</a></td></tr></tbody></table>`)
    $('a').textContent = 'Dofawa Abisal'
    applyPanelA11yFixes(document.body)
    expect($('#f').getAttribute('aria-label')).toBe('Elegir Dofawa Abisal')
  })

  it('el candado sigue a quien edita ahora', () => {
    render(`<div class="locked" role="button" tabindex="0">
      <div class="locked__tooltip">ana@torrentearcano.test está editando</div></div>`)
    $('.locked__tooltip').textContent = 'luis@torrentearcano.test está editando'
    applyPanelA11yFixes(document.body)
    expect($('.locked').getAttribute('aria-label')).toBe('luis@torrentearcano.test está editando')
  })

  it('si Payload vacía un nombre nuestro, vuelve a ponerse', () => {
    render('<div class="collapsible__drag" role="button"></div>')
    $('.collapsible__drag').setAttribute('aria-label', '')
    expect(applyPanelA11yFixes(document.body)).toBe(1)
    expect($('.collapsible__drag').getAttribute('aria-label')).toContain('Mover la fila')
  })

  it('si Payload pone su propio nombre después, no se pisa', () => {
    render('<div class="collapsible__drag" role="button"></div>')
    $('.collapsible__drag').setAttribute('aria-label', 'Arrastrar')
    expect(applyPanelA11yFixes(document.body)).toBe(0)
    expect($('.collapsible__drag').getAttribute('aria-label')).toBe('Arrastrar')
  })

  it('un nombre fijo ya puesto no se vuelve a calcular', () => {
    render(`<div class="field-type"><label class="field-label">Introducción</label>
      <div class="ContentEditable__root" role="textbox"></div></div>`)
    $('.field-label').textContent = 'Otra etiqueta'
    expect(applyPanelA11yFixes(document.body)).toBe(0)
    expect($('.ContentEditable__root').getAttribute('aria-label')).toBe('Introducción')
  })
})
