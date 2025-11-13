import { ExecutionContext, Cookie } from '../../domain/interfaces';

/**
 * Manages execution context for test runs.
 * Maintains variables, cookies, session state, and other contextual information.
 */
export class ExecutionContextManager {
  private context: ExecutionContext;

  constructor() {
    this.context = {
      variables: {},
      cookies: [],
      sessionId: this.generateSessionId(),
    };
  }

  /**
   * Gets a copy of the current execution context.
   * @returns Copy of execution context
   */
  public getContext(): ExecutionContext {
    return {
      ...this.context,
      variables: { ...this.context.variables },
      cookies: [...this.context.cookies],
      metadata: this.context.metadata ? { ...this.context.metadata } : undefined,
    };
  }

  /**
   * Sets a variable in the execution context.
   * @param key Variable name
   * @param value Variable value
   */
  public setVariable(key: string, value: string): void {
    this.context = {
      ...this.context,
      variables: {
        ...this.context.variables,
        [key]: value,
      },
    };
  }

  /**
   * Gets a variable from the execution context.
   * @param key Variable name
   * @returns Variable value or undefined
   */
  public getVariable(key: string): string | undefined {
    return this.context.variables[key];
  }

  /**
   * Updates cookies in the execution context.
   * Replaces all existing cookies.
   * @param cookies New cookies array
   */
  public updateCookies(cookies: readonly Cookie[]): void {
    this.context = {
      ...this.context,
      cookies: [...cookies],
    };
  }

  /**
   * Sets the current URL.
   * @param url Current page URL
   */
  public setCurrentUrl(url: string): void {
    this.context = {
      ...this.context,
      currentUrl: url,
    };
  }

  /**
   * Sets the page title.
   * @param title Current page title
   */
  public setPageTitle(title: string): void {
    this.context = {
      ...this.context,
      pageTitle: title,
    };
  }

  /**
   * Sets a metadata entry.
   * @param key Metadata key
   * @param value Metadata value
   */
  public setMetadata(key: string, value: unknown): void {
    this.context = {
      ...this.context,
      metadata: {
        ...this.context.metadata,
        [key]: value,
      },
    };
  }

  /**
   * Clones this context manager.
   * Creates a new manager with a copy of the current context.
   * @returns New ExecutionContextManager
   */
  public clone(): ExecutionContextManager {
    const cloned = new ExecutionContextManager();
    cloned.context = {
      variables: { ...this.context.variables },
      cookies: [...this.context.cookies],
      sessionId: this.context.sessionId,
      currentUrl: this.context.currentUrl,
      pageTitle: this.context.pageTitle,
      metadata: this.context.metadata ? { ...this.context.metadata } : undefined,
    };
    return cloned;
  }

  /**
   * Merges another context into this one.
   * Variables are overridden, cookies are appended.
   * @param other Context to merge
   */
  public merge(other: ExecutionContext): void {
    this.context = {
      variables: { ...this.context.variables, ...other.variables },
      cookies: [...this.context.cookies, ...other.cookies],
      sessionId: this.context.sessionId, // Preserve own session ID
      currentUrl: other.currentUrl || this.context.currentUrl,
      pageTitle: other.pageTitle || this.context.pageTitle,
      metadata: {
        ...this.context.metadata,
        ...other.metadata,
      },
    };
  }

  /**
   * Resets the context to initial state.
   * Preserves the session ID.
   */
  public reset(): void {
    const sessionId = this.context.sessionId;
    this.context = {
      variables: {},
      cookies: [],
      sessionId,
    };
  }

  /**
   * Generates a unique session identifier.
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
