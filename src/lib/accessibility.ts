export const keyboardHelper = {
  isEnter(event: Pick<KeyboardEvent, 'key'> | { key?: string }): boolean {
    return event.key === 'Enter';
  },
  isSpace(event: Pick<KeyboardEvent, 'key'> | { key?: string }): boolean {
    return event.key === ' ' || event.key === 'Spacebar';
  }
};

