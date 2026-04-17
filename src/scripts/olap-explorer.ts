import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractOlapDimensions,
  extractOlapResults,
  renderOlapExplorer,
  toggleSelection,
  type OlapDimensionsPayload,
  type OlapQueryPayload,
} from '../lib/olap-explorer';

type OlapRoot = HTMLElement & { dataset: DOMStringMap };

function setSelections(root: OlapRoot, kind: 'dimensions' | 'measures', value: string[]) {
  if (kind === 'dimensions') {
    root.dataset.selectedDimensions = JSON.stringify(value);
    return;
  }

  root.dataset.selectedMeasures = JSON.stringify(value);
}

function readSelections(root: OlapRoot, kind: 'dimensions' | 'measures'): string[] {
  const raw =
    kind === 'dimensions' ? root.dataset.selectedDimensions : root.dataset.selectedMeasures;
  if (!raw) return [];

  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

function writeDimensionsPayload(root: OlapRoot, payload: OlapDimensionsPayload | null) {
  if (!payload) {
    delete root.dataset.dimensionsPayload;
    return;
  }
  root.dataset.dimensionsPayload = JSON.stringify(payload);
}

function readDimensionsPayload(root: OlapRoot): OlapDimensionsPayload | null {
  const raw = root.dataset.dimensionsPayload;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OlapDimensionsPayload;
  } catch {
    return null;
  }
}

function writeQueryPayload(root: OlapRoot, payload: OlapQueryPayload | null) {
  if (!payload) {
    delete root.dataset.queryPayload;
    return;
  }
  root.dataset.queryPayload = JSON.stringify(payload);
}

function readQueryPayload(root: OlapRoot): OlapQueryPayload | null {
  const raw = root.dataset.queryPayload;
  if (!raw) return null;

  try {
    return JSON.parse(raw) as OlapQueryPayload;
  } catch {
    return null;
  }
}

function setError(root: OlapRoot, message: string | null) {
  if (message) root.dataset.error = message;
  else delete root.dataset.error;
}

function setLoading(root: OlapRoot, loading: boolean) {
  if (loading) root.dataset.loading = 'true';
  else delete root.dataset.loading;
}

async function fetchDimensions(root: OlapRoot) {
  const response = await fetch('/api/warehouse/dimensions', { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error('Boyutlar yüklenemedi');
  }

  const payload = (await response.json()) as OlapDimensionsPayload;
  if (!payload.success) {
    throw new Error('Boyutlar yüklenemedi');
  }

  writeDimensionsPayload(root, payload);
  setError(root, null);
}

async function executeQuery(root: OlapRoot) {
  const selectedDimensions = readSelections(root, 'dimensions');
  const selectedMeasures = readSelections(root, 'measures');
  if (selectedDimensions.length === 0 || selectedMeasures.length === 0) {
    throw new Error('En az bir boyut ve bir ölçü seçmelisiniz.');
  }

  const response = await fetch('/api/warehouse/query', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      cube: 'place_activity',
      dimensions: selectedDimensions,
      measures: selectedMeasures,
      limit: 100,
    }),
  });

  if (!response.ok) {
    throw new Error('Sorgu çalıştırılamadı');
  }

  const payload = (await response.json()) as OlapQueryPayload;
  if (!payload.success) {
    throw new Error('Sorgu çalıştırılamadı');
  }

  writeQueryPayload(root, payload);
  setError(root, null);
}

function bindInteractions(root: OlapRoot, content: HTMLElement) {
  for (const checkbox of Array.from(content.querySelectorAll<HTMLInputElement>('[data-olap-dimension]'))) {
    checkbox.addEventListener('change', async () => {
      const name = checkbox.dataset.olapDimension;
      if (!name) return;

      setSelections(root, 'dimensions', toggleSelection(readSelections(root, 'dimensions'), name));
      await renderRoot(root);
    });
  }

  for (const checkbox of Array.from(content.querySelectorAll<HTMLInputElement>('[data-olap-measure]'))) {
    checkbox.addEventListener('change', async () => {
      const name = checkbox.dataset.olapMeasure;
      if (!name) return;

      setSelections(root, 'measures', toggleSelection(readSelections(root, 'measures'), name));
      await renderRoot(root);
    });
  }

  const runButton = content.querySelector<HTMLElement>('[data-olap-run-query]');
  if (runButton) {
    runButton.addEventListener('click', async () => {
      setLoading(root, true);
      setError(root, null);
      await renderRoot(root);

      try {
        await executeQuery(root);
      } catch (error) {
        setError(root, error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
      } finally {
        setLoading(root, false);
      }

      await renderRoot(root);
    });
  }
}

async function renderRoot(root: OlapRoot) {
  const loading = root.querySelector<HTMLElement>('[data-olap-explorer-loading]');
  const content = root.querySelector<HTMLElement>('[data-olap-explorer-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'py-8 text-center text-gray-500');
  setElementClassName(content, 'hidden');

  try {
    if (!root.dataset.dimensionsPayload && !root.dataset.error) {
      await fetchDimensions(root);
    }

    const dimensionsPayload = readDimensionsPayload(root);
    const queryPayload = readQueryPayload(root);
    const { dimensions, measures } = extractOlapDimensions(dimensionsPayload);
    const { rows, cached } = extractOlapResults(queryPayload);

    setElementHtml(
      content,
      renderOlapExplorer({
        dimensions,
        measures,
        selectedDimensions: readSelections(root, 'dimensions'),
        selectedMeasures: readSelections(root, 'measures'),
        rows,
        cached,
        loading: root.dataset.loading === 'true',
        error: root.dataset.error || null,
      }),
    );
    bindInteractions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
    setElementHtml(
      content,
      renderOlapExplorer({
        dimensions: [],
        measures: [],
        selectedDimensions: readSelections(root, 'dimensions'),
        selectedMeasures: readSelections(root, 'measures'),
        rows: [],
        cached: false,
        loading: root.dataset.loading === 'true',
        error: root.dataset.error || 'Bilinmeyen bir hata oluştu',
      }),
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initOlapExplorer() {
  const roots = Array.from(document.querySelectorAll<OlapRoot>('[data-olap-explorer]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderRoot(root);
  }
}
