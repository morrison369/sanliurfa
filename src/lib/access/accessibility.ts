export const keyboardHelper = {
  isEnter(event: KeyboardEvent | { key?: string; code?: string }) {
    return event.key === 'Enter' || event.code === 'Enter';
  },
  isSpace(event: KeyboardEvent | { key?: string; code?: string }) {
    return event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';
  }
};
