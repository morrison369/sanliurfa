export function setTextContent(id: string, value: string) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

export function setLinkHref(id: string, href: string) {
  const element = document.getElementById(id) as HTMLAnchorElement | null;
  if (element) {
    element.href = href;
  }
}

export function setElementClassName(id: string, className: string) {
  const element = document.getElementById(id);
  if (element) {
    element.className = className;
  }
}

export function setElementHtml(id: string, html: string) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = html;
  }
}
