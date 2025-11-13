import { z } from 'zod';
import { VALID_SELECTOR_STRATEGIES } from '../domain/enums/SelectorStrategy';
import { VALID_COMMAND_TYPES } from '../domain/enums/CommandType';

/**
 * Zod schema for selector specification in YAML.
 */
export const SelectorSpecSchema = z.object({
  strategy: z.enum(VALID_SELECTOR_STRATEGIES as [string, ...string[]]),
  value: z.string().min(1, 'Selector value cannot be empty'),
  fallbacks: z
    .array(
      z.object({
        strategy: z.enum(VALID_SELECTOR_STRATEGIES as [string, ...string[]]),
        value: z.string().min(1),
      })
    )
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Zod schema for command parameters.
 */
export const CommandParamsSchema = z.record(z.string(), z.unknown()).optional();

/**
 * Zod schema for Oxtest command in YAML.
 */
export const OxtestCommandSchema = z.object({
  type: z.enum(VALID_COMMAND_TYPES as [string, ...string[]]),
  params: CommandParamsSchema,
  selector: SelectorSpecSchema.optional(),
});

/**
 * Zod schema for subtask in YAML.
 */
export const SubtaskSchema = z.object({
  id: z.string().min(1, 'Subtask id cannot be empty'),
  description: z.string().min(1, 'Subtask description cannot be empty'),
  commands: z.array(OxtestCommandSchema).min(1, 'Subtask must have at least one command'),
});

/**
 * Zod schema for task in YAML.
 */
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task id cannot be empty'),
  description: z.string().min(1, 'Task description cannot be empty'),
  subtasks: z.array(z.string()),
  setup: z.array(OxtestCommandSchema).optional(),
  teardown: z.array(OxtestCommandSchema).optional(),
});

/**
 * Zod schema for test suite in YAML.
 */
export const TestSuiteSchema = z.object({
  name: z.string().min(1, 'Test suite name cannot be empty'),
  description: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  subtasks: z.array(SubtaskSchema),
  tasks: z.array(TaskSchema),
});

/**
 * Type inference for TypeScript from Zod schemas.
 */
export type SelectorSpecYaml = z.infer<typeof SelectorSpecSchema>;
export type OxtestCommandYaml = z.infer<typeof OxtestCommandSchema>;
export type SubtaskYaml = z.infer<typeof SubtaskSchema>;
export type TaskYaml = z.infer<typeof TaskSchema>;
export type TestSuiteYaml = z.infer<typeof TestSuiteSchema>;

/**
 * Parses and validates a test suite from YAML data.
 * Throws ZodError if validation fails.
 */
export function parseTestSuite(data: unknown): TestSuiteYaml {
  return TestSuiteSchema.parse(data);
}

/**
 * Safely parses a test suite, returning success or error result.
 */
export function safeParseTestSuite(data: unknown): {
  success: boolean;
  data?: TestSuiteYaml;
  error?: z.ZodError;
} {
  const result = TestSuiteSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}
