'use client'

import { TextareaInput, useForm } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { useState } from 'react'
import { flushSync } from 'react-dom'

import { guideStrings } from '@/lib/guides/strings'
import { parseSpreadsheet } from '@/lib/guides/table-paste'

const t = guideStrings.admin.table

/**
 * «Pegar desde una hoja de cálculo» del bloque Tabla: Torre pega lo copiado en Google Sheets
 * o Excel y el botón cambia las columnas y las filas del bloque por lo pegado, en el
 * formulario, sin guardar. El recuadro es un campo `ui`: no se guarda en ningún sitio.
 */
export const TablePaste: UIFieldClientComponent = ({ path }) => {
  const { addFieldRow, getDataByPath, removeFieldRow } = useForm()
  const [text, setText] = useState('')
  const [status, setStatus] = useState('')
  // El bloque es lo que va antes del nombre de este campo: body.3, o body.2.body.0 en un paso.
  const block = path.slice(0, path.lastIndexOf('.'))

  function fill() {
    // El aviso se vacía antes, para que un lector de pantalla anuncie cada pulsación.
    flushSync(() => setStatus(''))
    const table = parseSpreadsheet(text)
    if (!table) {
      setStatus(text.trim() ? t.pasteHeadOnly : t.pasteEmpty)
      return
    }

    const columnsPath = `${block}.columns`
    const rowsPath = `${block}.rows`
    for (const listPath of [columnsPath, rowsPath]) {
      const current = getDataByPath(listPath)
      const count = Array.isArray(current) ? current.length : 0
      for (let rowIndex = count - 1; rowIndex >= 0; rowIndex -= 1) {
        removeFieldRow({ path: listPath, rowIndex })
      }
    }

    const field = (value: string) => ({ initialValue: value, value, valid: true })
    table.columns.forEach(({ header, align }, rowIndex) => {
      addFieldRow({
        path: columnsPath,
        rowIndex,
        schemaPath: columnsPath,
        subFieldState: { header: field(header), align: field(align) },
      })
    })
    table.rows.forEach((cells, rowIndex) => {
      addFieldRow({ path: rowsPath, rowIndex, schemaPath: rowsPath, subFieldState: {} })
      cells.forEach((cell, cellIndex) => {
        addFieldRow({
          path: `${rowsPath}.${rowIndex}.cells`,
          rowIndex: cellIndex,
          schemaPath: `${rowsPath}.cells`,
          subFieldState: { text: field(cell) },
        })
      })
    })
    setText('')
    setStatus(t.pasteDone(table.columns.length, table.rows.length))
  }

  return (
    <div className="ta-paste">
      <TextareaInput
        path={path}
        label={t.paste}
        description={t.pasteDescription}
        rows={6}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="ta-fill">
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small ta-fill__button"
          onClick={fill}
        >
          {t.pasteButton}
        </button>
        <span role="status" className="ta-fill__status">
          {status}
        </span>
      </div>
    </div>
  )
}
