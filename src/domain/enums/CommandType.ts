/**
 * Supported Oxtest command types.
 * These correspond to Playwright actions and assertions.
 */
export type CommandType =
  // Navigation
  | 'navigate'
  | 'goBack'
  | 'goForward'
  | 'reload'
  // Interaction
  | 'click'
  | 'fill'
  | 'type'
  | 'press'
  | 'check'
  | 'uncheck'
  | 'selectOption'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'clear'
  // Assertions
  | 'assertVisible'
  | 'assertHidden'
  | 'assertText'
  | 'assertValue'
  | 'assertEnabled'
  | 'assertDisabled'
  | 'assertChecked'
  | 'assertUnchecked'
  | 'assertUrl'
  | 'assertTitle'
  // Utility
  | 'wait'
  | 'waitForSelector'
  | 'screenshot'
  | 'setViewport';

/**
 * Valid command types that can be used in the system.
 */
export const VALID_COMMAND_TYPES: readonly CommandType[] = [
  'navigate',
  'goBack',
  'goForward',
  'reload',
  'click',
  'fill',
  'type',
  'press',
  'check',
  'uncheck',
  'selectOption',
  'hover',
  'focus',
  'blur',
  'clear',
  'assertVisible',
  'assertHidden',
  'assertText',
  'assertValue',
  'assertEnabled',
  'assertDisabled',
  'assertChecked',
  'assertUnchecked',
  'assertUrl',
  'assertTitle',
  'wait',
  'waitForSelector',
  'screenshot',
  'setViewport',
] as const;

/**
 * Interaction commands that require a selector.
 */
export const INTERACTION_COMMANDS: readonly CommandType[] = [
  'click',
  'fill',
  'type',
  'press',
  'check',
  'uncheck',
  'selectOption',
  'hover',
  'focus',
  'blur',
  'clear',
] as const;

/**
 * Assertion commands.
 */
export const ASSERTION_COMMANDS: readonly CommandType[] = [
  'assertVisible',
  'assertHidden',
  'assertText',
  'assertValue',
  'assertEnabled',
  'assertDisabled',
  'assertChecked',
  'assertUnchecked',
  'assertUrl',
  'assertTitle',
] as const;

/**
 * Type guard to check if a string is a valid CommandType.
 */
export function isValidCommandType(value: string): value is CommandType {
  return VALID_COMMAND_TYPES.includes(value as CommandType);
}

/**
 * Check if a command type is an interaction command.
 */
export function isInteractionCommand(type: CommandType): boolean {
  return INTERACTION_COMMANDS.includes(type);
}

/**
 * Check if a command type is an assertion command.
 */
export function isAssertionCommand(type: CommandType): boolean {
  return ASSERTION_COMMANDS.includes(type);
}
