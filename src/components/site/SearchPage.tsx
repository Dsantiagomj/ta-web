import { DoorIcon, SearchIcon } from './icons'
import { MAX_QUERY_LENGTH, type SearchPageView } from './search-page'
import { searchPageStrings as s } from './search-page-strings'
import { SearchList } from './SearchList'

const INPUT_ID = 'buscar-q'

/**
 * /buscar (DESIGN.md, Layout: Search page): el título, el campo con lo buscado y los
 * resultados de la portada, en los mismos grupos y con las filas del diálogo de búsqueda.
 * Todo en el servidor: es lo que ve quien busca en la portada sin JavaScript.
 */
export function SearchPage({ view }: { view: SearchPageView }) {
  const status = view.kind === 'results' ? view.status : view.kind === 'short' ? s.short : s.empty
  return (
    <main id="contenido" className="srch">
      <h1 className="srch__t">{s.title}</h1>
      <form className="srch__f" role="search" aria-label={s.form} action="/buscar">
        <label className="srch__l" htmlFor={INPUT_ID}>
          {s.label}
        </label>
        <div className="srch__bar">
          <SearchIcon className="srch__i" />
          <input
            id={INPUT_ID}
            type="search"
            name="q"
            defaultValue={view.query}
            autoComplete="off"
            enterKeyHint="search"
            maxLength={MAX_QUERY_LENGTH}
          />
          <button className="srch__b" type="submit">
            {s.submit}
          </button>
        </div>
      </form>
      <p className="srch__st" role="status">
        {status}
      </p>
      {view.kind === 'results' && view.groups.length > 0 && (
        <SearchList index={[]} groups={view.groups} query={view.query} door={<DoorIcon />} />
      )}
    </main>
  )
}
