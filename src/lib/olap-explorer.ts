export interface OlapDimension {
  name: string;
  label: string;
  levels: string[];
}

export interface OlapMeasure {
  name: string;
  label: string;
  type: string;
}

export interface OlapDimensionsPayload {
  success: boolean;
  data?: {
    dimensions?: OlapDimension[];
    measures?: OlapMeasure[];
    cubes?: string[];
    description?: string;
  };
}

export interface OlapQueryPayload {
  success: boolean;
  data?: {
    rows?: Array<Record<string, unknown>>;
    total?: number;
    cached?: boolean;
    duration_ms?: number;
    cube?: string;
    dimensions?: string[];
    measures?: string[];
  };
}

export function extractOlapDimensions(payload: OlapDimensionsPayload | null | undefined): {
  dimensions: OlapDimension[];
  measures: OlapMeasure[];
} {
  return {
    dimensions: payload?.success ? payload.data?.dimensions || [] : [],
    measures: payload?.success ? payload.data?.measures || [] : [],
  };
}

export function extractOlapResults(payload: OlapQueryPayload | null | undefined): {
  rows: Array<Record<string, unknown>>;
  cached: boolean;
} {
  return {
    rows: payload?.success ? payload.data?.rows || [] : [],
    cached: Boolean(payload?.success && payload.data?.cached),
  };
}

export function toggleSelection(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderCheckbox(options: {
  kind: 'dimension' | 'measure';
  name: string;
  label: string;
  selected: boolean;
}): string {
  return `
    <label class="flex items-center">
      <input
        type="checkbox"
        data-olap-${options.kind}="${options.name}"
        ${options.selected ? 'checked' : ''}
        class="mr-2"
      />
      <span>${escapeHtml(options.label)}</span>
    </label>
  `;
}

function renderResultsTable(options: {
  rows: Array<Record<string, unknown>>;
  dimensions: string[];
  measures: string[];
}): string {
  if (options.rows.length === 0) {
    return '';
  }

  return `
    <div class="space-y-3">
      <h3 class="font-semibold">Sonuçlar (${options.rows.length} satır)</h3>
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr class="border-b bg-gray-100">
              ${options.dimensions
                .map(
                  (dimension) =>
                    `<th class="border-r px-3 py-2 text-left font-semibold">${escapeHtml(dimension)}</th>`,
                )
                .join('')}
              ${options.measures
                .map(
                  (measure) =>
                    `<th class="border-r px-3 py-2 text-right font-semibold">${escapeHtml(measure)}</th>`,
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${options.rows
              .map(
                (row) => `
                  <tr class="border-b hover:bg-gray-50">
                    ${options.dimensions
                      .map(
                        (dimension) =>
                          `<td class="border-r px-3 py-2">${escapeHtml(String(row[dimension] ?? '-'))}</td>`,
                      )
                      .join('')}
                    ${options.measures
                      .map((measure) => {
                        const value = row[measure];
                        const display =
                          typeof value === 'number'
                            ? String(Math.round(value * 100) / 100)
                            : value == null
                              ? '-'
                              : String(value);
                        return `<td class="border-r px-3 py-2 text-right">${escapeHtml(display)}</td>`;
                      })
                      .join('')}
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

export function renderOlapExplorer(options: {
  dimensions: OlapDimension[];
  measures: OlapMeasure[];
  selectedDimensions: string[];
  selectedMeasures: string[];
  rows: Array<Record<string, unknown>>;
  cached: boolean;
  loading: boolean;
  error: string | null;
}): string {
  return `
    <div class="space-y-6">
      ${
        options.error
          ? `<div class="rounded border border-red-200 bg-red-50 p-4 text-red-800">${escapeHtml(options.error)}</div>`
          : ''
      }

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="space-y-3">
          <h3 class="text-lg font-semibold">Boyutlar</h3>
          <div class="space-y-2 rounded border bg-gray-50 p-4">
            ${
              options.dimensions.length === 0
                ? '<p class="text-sm text-gray-500">Boyut bulunamadı.</p>'
                : options.dimensions
                    .map((dimension) =>
                      renderCheckbox({
                        kind: 'dimension',
                        name: dimension.name,
                        label: dimension.label,
                        selected: options.selectedDimensions.includes(dimension.name),
                      }),
                    )
                    .join('')
            }
          </div>
        </div>

        <div class="space-y-3">
          <h3 class="text-lg font-semibold">Ölçüler</h3>
          <div class="space-y-2 rounded border bg-gray-50 p-4">
            ${
              options.measures.length === 0
                ? '<p class="text-sm text-gray-500">Ölçü bulunamadı.</p>'
                : options.measures
                    .map((measure) =>
                      renderCheckbox({
                        kind: 'measure',
                        name: measure.name,
                        label: measure.label,
                        selected: options.selectedMeasures.includes(measure.name),
                      }),
                    )
                    .join('')
            }
          </div>
        </div>
      </div>

      <div class="space-y-2">
        <button
          type="button"
          data-olap-run-query
          ${options.loading ? 'disabled' : ''}
          class="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          ${options.loading ? 'Sorgulanıyor...' : 'Sorguyu Çalıştır'}
        </button>
        ${options.cached ? '<div class="text-xs text-gray-600">✓ Sonuç cache üzerinden geldi</div>' : ''}
      </div>

      ${renderResultsTable({
        rows: options.rows,
        dimensions: options.selectedDimensions,
        measures: options.selectedMeasures,
      })}
    </div>
  `;
}
