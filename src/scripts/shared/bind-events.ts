export function bindAll<T extends Element>(
  root: ParentNode,
  selector: string,
  binder: (element: T) => void,
) {
  root.querySelectorAll<T>(selector).forEach((element) => {
    binder(element);
  });
}

export function bindFirst<T extends Element>(
  root: ParentNode,
  selector: string,
  binder: (element: T) => void,
) {
  const element = root.querySelector<T>(selector);
  if (element) {
    binder(element);
  }
}
