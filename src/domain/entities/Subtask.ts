import { OxtestCommand } from './OxtestCommand';

/**
 * Domain entity representing a subtask within a test task.
 * A subtask contains a sequence of commands to be executed.
 */
export class Subtask {
  public readonly id: string;
  public readonly description: string;
  public readonly commands: readonly OxtestCommand[];

  constructor(id: string, description: string, commands: OxtestCommand[]) {
    // Validation
    if (!id || id.trim() === '') {
      throw new Error('Subtask id cannot be empty');
    }

    if (!description || description.trim() === '') {
      throw new Error('Subtask description cannot be empty');
    }

    if (!commands || commands.length === 0) {
      throw new Error('Subtask must have at least one command');
    }

    this.id = id;
    this.description = description;
    this.commands = Object.freeze([...commands]);
  }

  /**
   * Returns the number of commands in this subtask.
   */
  public getCommandCount(): number {
    return this.commands.length;
  }

  /**
   * Returns the command at the specified index, or undefined if out of bounds.
   */
  public getCommandAt(index: number): OxtestCommand | undefined {
    if (index < 0 || index >= this.commands.length) {
      return undefined;
    }
    return this.commands[index];
  }

  /**
   * Checks if this subtask contains any interaction commands.
   */
  public hasInteractionCommands(): boolean {
    return this.commands.some(cmd => cmd.isInteractionCommand());
  }

  /**
   * Checks if this subtask contains any assertion commands.
   */
  public hasAssertionCommands(): boolean {
    return this.commands.some(cmd => cmd.isAssertionCommand());
  }

  /**
   * Creates a deep copy of this subtask.
   */
  public clone(): Subtask {
    return new Subtask(
      this.id,
      this.description,
      this.commands.map(cmd => cmd.clone())
    );
  }

  /**
   * Returns a string representation of the subtask.
   */
  public toString(): string {
    return `Subtask[${this.id}]: ${this.description} (${this.commands.length} commands)`;
  }
}
