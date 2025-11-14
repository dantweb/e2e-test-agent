/**
 * Reporters module - exports all available reporters
 */

export { IReporter, ExecutionReport, SubtaskReport } from './IReporter';
export { JSONReporter } from './JSONReporter';
export { ConsoleReporter } from './ConsoleReporter';
export { JUnitReporter } from './JUnitReporter';
export { HTMLReporter } from './HTMLReporter';

/**
 * Factory function to create reporters by name
 */
import { IReporter } from './IReporter';
import { JSONReporter } from './JSONReporter';
import { ConsoleReporter } from './ConsoleReporter';
import { JUnitReporter } from './JUnitReporter';
import { HTMLReporter } from './HTMLReporter';

export function createReporter(name: string): IReporter {
  const normalized = name.toLowerCase();
  switch (normalized) {
    case 'json':
      return new JSONReporter();
    case 'console':
      return new ConsoleReporter();
    case 'junit':
    case 'xml':
      return new JUnitReporter();
    case 'html':
      return new HTMLReporter();
    default:
      throw new Error(`Unknown reporter: ${name}. Available reporters: json, console, junit, html`);
  }
}

export function getAllReporters(): IReporter[] {
  return [new JSONReporter(), new ConsoleReporter(), new JUnitReporter(), new HTMLReporter()];
}
