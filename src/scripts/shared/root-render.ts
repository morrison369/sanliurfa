import { setElementClassName, setElementHtml } from '../../lib/admin-dom';

type RenderableRoot = HTMLElement & { dataset: DOMStringMap };

type RenderRootContentOptions = {
  root: RenderableRoot;
  contentSelector: string;
  html: string;
  bind?: (content: HTMLElement) => void;
  loadingSelector?: string;
  loadingHiddenClass?: string;
  contentVisibleClass?: string;
};

export function getRootContent(root: RenderableRoot, contentSelector: string) {
  return root.querySelector<HTMLElement>(contentSelector);
}

export function getRootPanels(
  root: RenderableRoot,
  loadingSelector: string,
  contentSelector: string,
) {
  return {
    loading: root.querySelector<HTMLElement>(loadingSelector),
    content: root.querySelector<HTMLElement>(contentSelector),
  };
}

export function renderRootContent({
  root,
  contentSelector,
  html,
  bind,
  loadingSelector,
  loadingHiddenClass = 'hidden',
  contentVisibleClass = '',
}: RenderRootContentOptions) {
  const content = getRootContent(root, contentSelector);
  if (!content) return;

  setElementHtml(content, html);
  bind?.(content);

  if (loadingSelector) {
    const loading = root.querySelector<HTMLElement>(loadingSelector);
    if (loading) {
      setElementClassName(loading, loadingHiddenClass);
    }
  }

  setElementClassName(content, contentVisibleClass);
}
