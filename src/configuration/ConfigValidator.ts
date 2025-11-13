import { TestSuiteYaml, OxtestCommandYaml } from './YamlSchema';
import { Task } from '../domain/entities/Task';
import { Subtask } from '../domain/entities/Subtask';
import { OxtestCommand } from '../domain/entities/OxtestCommand';
import { SelectorSpec } from '../domain/entities/SelectorSpec';
import { isInteractionCommand, isAssertionCommand, CommandType } from '../domain/enums/CommandType';

/**
 * Validation error.
 */
export interface ValidationError {
  type: 'error';
  message: string;
  location?: string;
}

/**
 * Validation warning.
 */
export interface ValidationWarning {
  type: 'warning';
  message: string;
  location?: string;
}

/**
 * Result of configuration validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validates test suite configuration and converts to domain entities.
 */
export class ConfigValidator {
  /**
   * Performs comprehensive validation of configuration.
   */
  public validate(config: TestSuiteYaml): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for duplicate IDs
    const duplicateSubtasks = this.findDuplicateIds(config.subtasks.map(s => s.id));
    duplicateSubtasks.forEach(id => {
      errors.push({
        type: 'error',
        message: `Duplicate subtask ID: ${id}`,
        location: 'subtasks',
      });
    });

    const duplicateTasks = this.findDuplicateIds(config.tasks.map(t => t.id));
    duplicateTasks.forEach(id => {
      errors.push({
        type: 'error',
        message: `Duplicate task ID: ${id}`,
        location: 'tasks',
      });
    });

    // Validate subtask references
    const refErrors = this.validateSubtaskReferences(config);
    refErrors.forEach(msg => {
      errors.push({
        type: 'error',
        message: msg,
        location: 'tasks',
      });
    });

    // Validate command selectors
    const selectorErrors = this.validateCommandSelectors(config);
    selectorErrors.forEach(msg => {
      errors.push({
        type: 'error',
        message: msg,
        location: 'subtasks.commands',
      });
    });

    // Warnings for suspicious patterns
    config.tasks.forEach(task => {
      if (task.subtasks.length === 0 && !task.setup && !task.teardown) {
        warnings.push({
          type: 'warning',
          message: `Task "${task.id}" has no subtasks, setup, or teardown commands`,
          location: `tasks.${task.id}`,
        });
      }
    });

    config.subtasks.forEach(subtask => {
      const hasAssertions = subtask.commands.some(cmd =>
        isAssertionCommand(cmd.type as CommandType)
      );
      if (!hasAssertions) {
        warnings.push({
          type: 'warning',
          message: `Subtask "${subtask.id}" has no assertions - tests may not verify anything`,
          location: `subtasks.${subtask.id}`,
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates all subtask references in tasks.
   */
  public validateSubtaskReferences(config: TestSuiteYaml): string[] {
    const errors: string[] = [];
    const subtaskIds = new Set(config.subtasks.map(s => s.id));

    config.tasks.forEach(task => {
      task.subtasks.forEach(subtaskId => {
        if (!subtaskIds.has(subtaskId)) {
          errors.push(`Task "${task.id}" references non-existent subtask "${subtaskId}"`);
        }
      });
    });

    return errors;
  }

  /**
   * Validates command selectors are present when required.
   */
  public validateCommandSelectors(config: TestSuiteYaml): string[] {
    const errors: string[] = [];

    config.subtasks.forEach(subtask => {
      subtask.commands.forEach((cmd, index) => {
        if (isInteractionCommand(cmd.type as CommandType) && !cmd.selector) {
          errors.push(`Subtask "${subtask.id}", command ${index}: ${cmd.type} requires a selector`);
        }
      });
    });

    return errors;
  }

  /**
   * Converts YAML configuration to domain entities.
   */
  public convertToDomainEntities(config: TestSuiteYaml): {
    subtasks: Map<string, Subtask>;
    tasks: Map<string, Task>;
  } {
    const subtasks = new Map<string, Subtask>();
    const tasks = new Map<string, Task>();

    // Convert subtasks
    config.subtasks.forEach(yamlSubtask => {
      const commands = yamlSubtask.commands.map(cmd => this.convertCommand(cmd));
      const subtask = new Subtask(yamlSubtask.id, yamlSubtask.description, commands);
      subtasks.set(yamlSubtask.id, subtask);
    });

    // Convert tasks
    config.tasks.forEach(yamlTask => {
      const setup = yamlTask.setup?.map(cmd => this.convertCommand(cmd));
      const teardown = yamlTask.teardown?.map(cmd => this.convertCommand(cmd));

      const task = new Task(yamlTask.id, yamlTask.description, yamlTask.subtasks, setup, teardown);
      tasks.set(yamlTask.id, task);
    });

    return { subtasks, tasks };
  }

  /**
   * Converts YAML command to domain OxtestCommand.
   */
  private convertCommand(yamlCmd: OxtestCommandYaml): OxtestCommand {
    const selector = yamlCmd.selector ? this.convertSelector(yamlCmd.selector) : undefined;
    return new OxtestCommand(yamlCmd.type as CommandType, yamlCmd.params || {}, selector);
  }

  /**
   * Converts YAML selector to domain SelectorSpec.
   */
  private convertSelector(yamlSelector: {
    strategy: string;
    value: string;
    fallbacks?: Array<{ strategy: string; value: string }>;
    metadata?: Record<string, unknown>;
  }): SelectorSpec {
    return new SelectorSpec(
      yamlSelector.strategy as 'css' | 'text' | 'role' | 'xpath' | 'testid' | 'placeholder',
      yamlSelector.value,
      yamlSelector.fallbacks as Array<{
        strategy: 'css' | 'text' | 'role' | 'xpath' | 'testid' | 'placeholder';
        value: string;
      }>,
      yamlSelector.metadata
    );
  }

  /**
   * Finds duplicate IDs in an array.
   */
  private findDuplicateIds(ids: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    ids.forEach(id => {
      if (seen.has(id)) {
        duplicates.add(id);
      } else {
        seen.add(id);
      }
    });

    return Array.from(duplicates);
  }
}
