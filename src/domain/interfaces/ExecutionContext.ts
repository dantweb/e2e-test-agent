/**
 * Cookie data structure for browser automation.
 */
export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Execution context shared across test execution.
 * Maintains state, variables, cookies, and session information.
 */
export interface ExecutionContext {
  /**
   * Variables extracted or set during execution.
   * Can be used for assertions or passing data between steps.
   */
  variables: Record<string, string>;

  /**
   * Browser cookies captured during execution.
   */
  cookies: readonly Cookie[];

  /**
   * Unique session identifier for this execution.
   */
  sessionId: string;

  /**
   * Optional current URL.
   */
  currentUrl?: string;

  /**
   * Optional page title.
   */
  pageTitle?: string;

  /**
   * Optional custom metadata.
   */
  metadata?: Record<string, unknown>;
}
