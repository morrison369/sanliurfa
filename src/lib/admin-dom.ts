type ElementTarget =
  | string
  | null
  | undefined
  | {
      textContent?: string | null;
      className?: string;
      innerHTML?: string;
      href?: string;
    };

function resolveElement(target: ElementTarget) {
  if (!target) return null;
  if (typeof target === 'string') {
    return document.getElementById(target);
  }

  return target;
}

export function setTextContent(target: ElementTarget, value: string) {
  const element = resolveElement(target);
  if (element) {
    element.textContent = value;
  }
}

export function setLinkHref(target: ElementTarget, href: string) {
  const element = resolveElement(target) as HTMLAnchorElement | null;
  if (element) {
    element.href = href;
  }
}

export function setElementClassName(target: ElementTarget, className: string) {
  const element = resolveElement(target);
  if (element) {
    element.className = className;
  }
}

export function setElementHtml(target: ElementTarget, html: string) {
  const element = resolveElement(target);
  if (element) {
    element.innerHTML = html;
  }
}
