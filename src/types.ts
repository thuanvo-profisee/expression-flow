// ─── Core Data Model ──────────────────────────────────────────────

export type BlockType = 'FUNCTION' | 'ATTRIBUTE' | 'LITERAL';

export interface Block {
  id: string;
  type: BlockType;
  name: string;
  value?: string;
  args: (Block | null)[];
  isCollapsed?: boolean;
}

// ─── Function / Operator Metadata ─────────────────────────────────

export type FunctionCategory = 'function' | 'comparison' | 'arithmetic' | 'grouping';

export type FunctionSubcategory =
  | 'logic'
  | 'string'
  | 'datetime'
  | 'conversion'
  | 'change'
  | 'set'
  | 'comparison'
  | 'arithmetic'
  | 'grouping';

export interface FunctionMeta {
  name: string;
  label: string;
  argLabels: string[];
  description?: string;
  details?: string;    // Full syntax + parameter info shown in info popover
  color: string;
  category: FunctionCategory;
  subcategory: FunctionSubcategory;
  isInfix?: boolean;
  variadic?: boolean;
  /** Index from which variadic add/remove applies (default 0). Use to protect leading fixed args. */
  variadicFrom?: number;
  /** Per-argument suggested literal values, keyed by arg index */
  argSuggestions?: Record<number, string[]>;
}

/** Registry of all known functions and operators */
export const FUNCTION_REGISTRY: Record<string, FunctionMeta> = {

  // ━━ LOGIC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IF: {
    name: 'IF', label: 'IF',
    argLabels: ['Condition', 'True Case', 'False Case'],
    description: 'Conditional: if/then/else',
    details: 'Syntax: IF(<conditionExpression>, <trueExpression>, <falseExpression>)\n\nParameters:\n• conditionExpression — Boolean expression to evaluate\n• trueExpression — Returned when condition is true\n• falseExpression — Returned when condition is false',
    color: 'indigo', category: 'function', subcategory: 'logic',
  },
  AND: {
    name: 'AND', label: 'AND',
    argLabels: ['Condition 1', 'Condition 2'],
    description: 'Logical AND',
    details: 'Syntax: AND(<condition1>, <condition2>)\n\nReturns true only when both conditions are true.\n\nParameters:\n• condition1 — First boolean expression\n• condition2 — Second boolean expression',
    color: 'rose', category: 'function', subcategory: 'logic',
  },
  OR: {
    name: 'OR', label: 'OR',
    argLabels: ['Condition 1', 'Condition 2'],
    description: 'Logical OR',
    details: 'Syntax: OR(<condition1>, <condition2>)\n\nReturns true when at least one condition is true.\n\nParameters:\n• condition1 — First boolean expression\n• condition2 — Second boolean expression',
    color: 'purple', category: 'function', subcategory: 'logic',
  },
  NOT: {
    name: 'NOT', label: 'NOT',
    argLabels: ['Condition'],
    description: 'Logical NOT',
    details: 'Syntax: NOT(<condition>)\n\nReturns the opposite boolean value.\n\nParameters:\n• condition — Boolean expression to negate',
    color: 'pink', category: 'function', subcategory: 'logic',
  },

  // ━━ STRING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONCAT: {
    name: 'CONCAT', label: 'CONCAT',
    argLabels: ['String 1', 'String 2', 'String 3'],
    description: 'Concatenate two or more strings',
    details: 'Syntax: CONCAT(<string1>, <string2>, ...)\n\nConcatenates two or more strings together.\n\nParameters:\n• string1 — First string expression\n• string2 — Second string expression\n• (variadic) — Add more strings as needed',
    color: 'sky', category: 'function', subcategory: 'string',
    variadic: true,
  },
  CONTAINS: {
    name: 'CONTAINS', label: 'CONTAINS',
    argLabels: ['Expression to Search', 'Expression to Find'],
    description: 'Checks if string contains substring',
    details: 'Syntax: CONTAINS(<expressionToSearch>, <expressionToFind>)\n\nChecks if a string contains a specified string.\n\nParameters:\n• expressionToSearch — String to search within\n• expressionToFind — String to find',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  CONTAINSPATTERN: {
    name: 'CONTAINSPATTERN', label: 'CONTAINSPATTERN',
    argLabels: ['Expression to Search', 'Pattern to Find'],
    description: 'Checks if string contains pattern',
    details: 'Syntax: CONTAINSPATTERN(<expressionToSearch>, <patternExpressionToFind>)\n\nChecks if a string contains a specified pattern.\n\nParameters:\n• expressionToSearch — String to search within\n• patternExpressionToFind — Pattern string to find',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  ENDSWITH: {
    name: 'ENDSWITH', label: 'ENDSWITH',
    argLabels: ['Expression', 'Suffix'],
    description: 'Checks if string ends with value',
    details: 'Syntax: ENDSWITH(<expressionToSearch>, <expressionToFind>)\n\nChecks if a string ends with a specified string.\n\nParameters:\n• expressionToSearch — String to check\n• expressionToFind — Suffix string to match',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  STARTSWITH: {
    name: 'STARTSWITH', label: 'STARTSWITH',
    argLabels: ['Expression', 'Prefix'],
    description: 'Checks if string starts with value',
    details: 'Syntax: STARTSWITH(<expressionToSearch>, <expressionToFind>)\n\nChecks if a string starts with a specified string.\n\nParameters:\n• expressionToSearch — String to check\n• expressionToFind — Prefix string to match',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  INDEXOF: {
    name: 'INDEXOF', label: 'INDEXOF',
    argLabels: ['Expression to Search', 'Expression to Find'],
    description: 'Finds index of string within string',
    details: 'Syntax: INDEXOF(<expressionToSearch>, <expressionToFind>)\n\nFinds the index of a given string within the specified string.\n\nParameters:\n• expressionToSearch — String to search within\n• expressionToFind — String to locate',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  LEFT: {
    name: 'LEFT', label: 'LEFT',
    argLabels: ['String', 'Count'],
    description: 'Returns N chars from the left',
    details: 'Syntax: LEFT(<stringExpression>, <numberOfCharactersToReturn>)\n\nReturns the specified number of characters from the left of a string.\n\nParameters:\n• stringExpression — Source string\n• numberOfCharactersToReturn — Number of characters',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  RIGHT: {
    name: 'RIGHT', label: 'RIGHT',
    argLabels: ['String', 'Count'],
    description: 'Returns N chars from the right',
    details: 'Syntax: RIGHT(<stringExpression>, <numberOfCharactersToReturn>)\n\nReturns the specified number of characters from the right of a string.\n\nParameters:\n• stringExpression — Source string\n• numberOfCharactersToReturn — Number of characters',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  LENGTH: {
    name: 'LENGTH', label: 'LENGTH',
    argLabels: ['String'],
    description: 'Returns string length',
    details: 'Syntax: LENGTH(<stringExpression>)\n\nCalculates the length of the string.\n\nParameters:\n• stringExpression — String to measure',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  SUBSTRING: {
    name: 'SUBSTRING', label: 'SUBSTRING',
    argLabels: ['String', 'Start Position', 'Count'],
    description: 'Returns a subset of a string',
    details: 'Syntax: SUBSTRING(<stringExpression>, <startPosition>, <numberOfCharactersToReturn>)\n\nReturns a subset of a string from a given starting position.\n\nParameters:\n• stringExpression — Source string\n• startPosition — Position of the first character (0-based)\n• numberOfCharactersToReturn — Number of characters to return',
    color: 'sky', category: 'function', subcategory: 'string',
  },

  // ━━ DATE & TIME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DATE: {
    name: 'DATE', label: 'DATE',
    argLabels: ['DD', 'MM', 'YYYY'],
    description: 'Returns a Date from DD/MM/YYYY',
    details: 'Syntax: DATE(<DD>, <MM>, <YYYY>)\n\nReturns a Date expression for the values provided.\n\nParameters:\n• DD — Day (numeric)\n• MM — Month (numeric)\n• YYYY — Year (numeric)',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  DATEADD: {
    name: 'DATEADD', label: 'DATEADD',
    argLabels: ['Date', 'Number', 'Interval'],
    description: 'Add day/month/year to a date',
    details: 'Syntax: DATEADD(<dateOrDateTimeExpression>, <numberToAdd>, <interval>)\n\nAdds the corresponding day/month/year to a given Date.\n\nParameters:\n• dateOrDateTimeExpression — Date or DateTime to augment\n• numberToAdd — Number to add\n• interval — Day, Month, or Year',
    color: 'teal', category: 'function', subcategory: 'datetime',
    argSuggestions: { 2: ['DAY', 'MONTH', 'YEAR'] },
  },
  DATEDIFF: {
    name: 'DATEDIFF', label: 'DATEDIFF',
    argLabels: ['Start Date', 'End Date'],
    description: 'Days between two dates',
    details: 'Syntax: DATEDIFF(<startDate>, <endDate>)\n\nCalculates the number of days between start date and end date.\n\nParameters:\n• startDate — Start Date or DateTime\n• endDate — End Date or DateTime',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  DATETIMEUTC: {
    name: 'DATETIMEUTC', label: 'DATETIMEUTC',
    argLabels: ['DD', 'MM', 'YYYY', 'HH', 'Minutes', 'SS', 'MS (opt)'],
    description: 'Returns a DateTime from components',
    details: 'Syntax: DATETIMEUTC(<DD>, <MM>, <YYYY>, <HH>, <MM>, <SS>, <MS>)\n\nReturns the date and time expression for the values provided.\n\nParameters:\n• DD — Day\n• MM — Month\n• YYYY — Year\n• HH — Hour\n• Minutes — Minutes\n• SS — Seconds\n• MS (optional) — Milliseconds',
    color: 'teal', category: 'function', subcategory: 'datetime',
    variadic: true,
  },
  RELATIVEDATE: {
    name: 'RELATIVEDATE', label: 'RELATIVEDATE',
    argLabels: ['Date', 'Interval'],
    description: 'Relative date (StartOfMonth, etc.)',
    details: 'Syntax: RELATIVEDATE(<givenDateOrDateTime>, <interval>)\n\nCalculates the relative date based on the Date or DateTime provided.\n\nParameters:\n• givenDateOrDateTime — Base Date or DateTime\n• interval — StartOfWeek, EndOfWeek, NextWeek, StartOfMonth, EndOfMonth, NextMonth, StartOfQuarter, EndOfQuarter, NextQuarter, StartOfYear, EndOfYear, NextYear',
    color: 'teal', category: 'function', subcategory: 'datetime',
    argSuggestions: { 1: ['StartOfWeek', 'EndOfWeek', 'NextWeek', 'StartOfMonth', 'EndOfMonth', 'NextMonth', 'StartOfQuarter', 'EndOfQuarter', 'NextQuarter', 'StartOfYear', 'EndOfYear', 'NextYear'] },
  },
  NOW: {
    name: 'NOW', label: 'NOW',
    argLabels: [],
    description: 'Current date and time',
    details: 'Syntax: NOW\n\nSets the value to the current date and time. Takes no parameters.',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  TODAY: {
    name: 'TODAY', label: 'TODAY',
    argLabels: [],
    description: "Today's date",
    details: "Syntax: TODAY\n\nSets the value to today's date. Takes no parameters.",
    color: 'teal', category: 'function', subcategory: 'datetime',
  },

  // ━━ CONVERSION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEXT: {
    name: 'TEXT', label: 'TEXT',
    argLabels: ['Expression'],
    description: 'Convert to string',
    details: 'Syntax: TEXT(<anyExpression>)\n\nReturns a string representation of a given expression.\n\nParameters:\n• anyExpression — Date, DateTime, or Numeric expression to convert',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  TONUMBER: {
    name: 'TONUMBER', label: 'TONUMBER',
    argLabels: ['String'],
    description: 'Convert string to number',
    details: 'Syntax: TONUMBER(<stringExpression>)\n\nReturns a numeric representation of a given string.\n\nParameters:\n• stringExpression — String to convert into a number',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  TODATE: {
    name: 'TODATE', label: 'TODATE',
    argLabels: ['String (YYYY-MM-DD)'],
    description: 'Convert string to Date',
    details: 'Syntax: TODATE(<stringExpression>)\n\nReturns a Date for the string value provided.\n\nParameters:\n• stringExpression — String in YYYY-MM-DD format',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  TODATETIMEUTC: {
    name: 'TODATETIMEUTC', label: 'TODATETIMEUTC',
    argLabels: ['String (YYYY-MM-DD HH:mm:ss)'],
    description: 'Convert string to DateTime',
    details: 'Syntax: TODATETIMEUTC(<stringExpression>)\n\nReturns the date and time for the string value provided.\n\nParameters:\n• stringExpression — String in YYYY-MM-DD HH:mm:ss format',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  NEWGUID: {
    name: 'NEWGUID', label: 'NEWGUID',
    argLabels: [],
    description: 'Returns a new GUID string',
    details: 'Syntax: NEWGUID\n\nReturns a new globally unique identifier (GUID) string. Takes no parameters.',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },

  // ━━ CHANGE DETECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CHANGED: {
    name: 'CHANGED', label: 'CHANGED',
    argLabels: ['Attribute 1', 'Attribute 2', 'Attribute 3'],
    description: 'Checks for value change in attributes',
    details: 'Syntax: CHANGED(<attribute1>, <attribute2>, ..., <attributeN>)\n\nChecks for any value change in the specified list of attributes. Cannot be Multi-level Attributes. Only used as a conditionExpression in an IF statement.\n\nParameters:\n• attribute1..N — Attributes to monitor for changes',
    color: 'orange', category: 'function', subcategory: 'change',
    variadic: true,
  },
  CHANGEDFROM: {
    name: 'CHANGEDFROM', label: 'CHANGEDFROM',
    argLabels: ['Attribute', 'Values / Attribute'],
    description: 'Value changed from listed values',
    details: "Syntax: CHANGEDFROM(<attribute>, (List of Values | <attribute>))\n\nAn attribute value has changed and changed from any one of the listed values or attribute's values.\n\nParameters:\n• attribute — The attribute to check\n• values — List of values or another attribute to compare against",
    color: 'orange', category: 'function', subcategory: 'change',
  },
  CHANGEDTO: {
    name: 'CHANGEDTO', label: 'CHANGEDTO',
    argLabels: ['Attribute', 'Values / Attribute'],
    description: 'Value changed to listed values',
    details: "Syntax: CHANGEDTO(<attribute>, (List of Values | <attribute>))\n\nAn attribute value has changed and changed to any one of the listed values or attribute's values.\n\nParameters:\n• attribute — The attribute to check\n• values — List of values or another attribute to compare against",
    color: 'orange', category: 'function', subcategory: 'change',
  },
  PRIOR: {
    name: 'PRIOR', label: 'PRIOR',
    argLabels: ['Attribute'],
    description: "Reference to attribute's prior value",
    details: "Syntax: PRIOR(<attribute>)\n\nA reference to the attribute's prior value. Unlike CHANGEDFROM, PRIOR does not test to see if the value changed.\n\nParameters:\n• attribute — The attribute to get the prior value of",
    color: 'orange', category: 'function', subcategory: 'change',
  },

  // ━━ SET OPERATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IN: {
    name: 'IN', label: 'IN',
    argLabels: ['Attribute', 'Values'],
    description: 'Value is in the list',
    details: "Syntax: <attribute> IN (List of Values | <attribute>)\n\nCompares whether an attribute value is in any one of the listed values or attribute's values. Can compare current, changed, or prior values.\n\nParameters:\n• attribute — The attribute to check\n• values — Use ( ) grouping to provide a list of values",
    color: 'lime', category: 'function', subcategory: 'set',
    isInfix: true,
  },

  // ━━ COMPARISON OPERATORS (infix) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '>': {
    name: '>', label: 'Greater than >',
    argLabels: ['Left', 'Right'],
    description: 'Greater than',
    details: 'Syntax: <left> > <right>\n\nReturns true if the left expression is greater than the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<': {
    name: '<', label: 'Less than  <',
    argLabels: ['Left', 'Right'],
    description: 'Less than',
    details: 'Syntax: <left> < <right>\n\nReturns true if the left expression is less than the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '>=': {
    name: '>=', label: 'Greater or equal  >=',
    argLabels: ['Left', 'Right'],
    description: 'Greater or equal',
    details: 'Syntax: <left> >= <right>\n\nReturns true if the left expression is greater than or equal to the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<=': {
    name: '<=', label: 'Less or equal  <=',
    argLabels: ['Left', 'Right'],
    description: 'Less or equal',
    details: 'Syntax: <left> <= <right>\n\nReturns true if the left expression is less than or equal to the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<>': {
    name: '<>', label: 'Not equal  <>',
    argLabels: ['Left', 'Right'],
    description: 'Not equal to',
    details: 'Syntax: <left> <> <right>\n\nReturns true if the left expression is not equal to the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '=': {
    name: '=', label: 'Equal  =',
    argLabels: ['Left', 'Right'],
    description: 'Equal to',
    details: 'Syntax: <left> = <right>\n\nReturns true if the left expression equals the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },

  // ━━ ARITHMETIC OPERATORS (infix) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '+': {
    name: '+', label: 'Add  +',
    argLabels: ['Left', 'Right'],
    description: 'Addition',
    details: 'Syntax: <left> + <right>\n\nReturns the sum of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '-': {
    name: '-', label: 'Subtract  -',
    argLabels: ['Left', 'Right'],
    description: 'Subtraction',
    details: 'Syntax: <left> - <right>\n\nReturns the difference of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '*': {
    name: '*', label: 'Multiply  *',
    argLabels: ['Left', 'Right'],
    description: 'Multiplication',
    details: 'Syntax: <left> * <right>\n\nReturns the product of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '/': {
    name: '/', label: 'Divide  /',
    argLabels: ['Left', 'Right'],
    description: 'Division',
    details: 'Syntax: <left> / <right>\n\nReturns the quotient of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },

  // ━━ GROUPING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GROUP: {
    name: 'GROUP', label: 'LIST ( )',
    argLabels: ['Item 1'],
    description: 'Parentheses grouping / value list',
    details: 'Syntax: ( <item1>, <item2>, ..., <itemN> )\n\nReturns a list of the items provided. Can be used to group multiple items together or as a value list.',
    color: 'slate', category: 'grouping', subcategory: 'grouping',
    variadic: true,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

export function getFunctionsBySubcategory(sub: FunctionSubcategory): FunctionMeta[] {
  return Object.values(FUNCTION_REGISTRY).filter((m) => m.subcategory === sub);
}

// ─── Subcategory display config ──────────────────────────────────

export interface SubcategoryConfig {
  key: FunctionSubcategory;
  label: string;
  icon: string; // lucide icon name, resolved in component
}

export const SUBCATEGORY_ORDER: SubcategoryConfig[] = [
  { key: 'logic', label: 'Logic', icon: 'Zap' },
  { key: 'string', label: 'String', icon: 'Type' },
  { key: 'datetime', label: 'Date & Time', icon: 'Calendar' },
  { key: 'change', label: 'Change Detection', icon: 'History' },
  { key: 'conversion', label: 'Conversion', icon: 'ArrowRightLeft' },
  { key: 'set', label: 'Set Operations', icon: 'ListFilter' },
  { key: 'comparison', label: 'Comparison', icon: 'Scale' },
  { key: 'arithmetic', label: 'Arithmetic', icon: 'Calculator' },
  { key: 'grouping', label: 'Grouping', icon: 'Braces' },
];

// ─── Expression Mode ──────────────────────────────────────────────

export type ExpressionMode = 'validation' | 'assignment';

export const EXPRESSION_MODE_META: Record<ExpressionMode, {
  label: string;
  description: string;
  returnType: string;
  color: string;
  example: string;
}> = {
  validation: {
    label: 'Validation',
    description: 'Expression evaluates to true or false',
    returnType: 'Boolean (true / false)',
    color: 'amber',
    example: '[Code] = CONCAT([Class].[Name], [Color].[Name])',
  },
  assignment: {
    label: 'Assignment',
    description: 'Expression returns a computed value',
    returnType: 'Value (string, number, etc.)',
    color: 'indigo',
    example: 'IF(LENGTH([Name]) > 0, [Name], "")',
  },
};

// ─── Attribute Tree ───────────────────────────────────────────────

export interface PropertiesCallback {
  dataKey: string;
  path: string;
  parameters: Record<string, string>;
  httpMethod: string;
  body: unknown | null;
}

export interface AttributeNode {
  id: string;              // e.g. "[Class].[Name]"
  label: string;           // e.g. "Name"
  value: string;           // full bracket path, e.g. "[Class].[Name]"
  propertiesCallback: PropertiesCallback | null;
  children?: AttributeNode[];
  isExpanded?: boolean;
}

/** Hierarchical attribute catalog — each node can have child properties */
export const ATTRIBUTE_CATALOG: AttributeNode[] = [
  {
    id: '[Name]',
    label: 'Name',
    value: '[Name]',
    propertiesCallback: null,
  },
  {
    id: '[Code]',
    label: 'Code',
    value: '[Code]',
    propertiesCallback: null,
  },
  {
    id: '[Class]',
    label: 'Class',
    value: '[Class]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmClass/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[Class]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[Class].[Name]', label: 'Name', value: '[Class].[Name]', propertiesCallback: null },
      { id: '[Class].[Code]', label: 'Code', value: '[Class].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[Color]',
    label: 'Color',
    value: '[Color]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmColor/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[Color]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[Color].[Name]', label: 'Name', value: '[Color].[Name]', propertiesCallback: null },
      { id: '[Color].[Code]', label: 'Code', value: '[Color].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[$EnterUserName]',
    label: 'Created By',
    value: '[$EnterUserName]',
    propertiesCallback: null,
  },
  {
    id: '[$EnterDTM]',
    label: 'Created On',
    value: '[$EnterDTM]',
    propertiesCallback: null,
  },
  {
    id: '[DealerCost]',
    label: 'DealerCost',
    value: '[DealerCost]',
    propertiesCallback: null,
  },
  {
    id: '[DocumentationURL]',
    label: 'DocumentationURL',
    value: '[DocumentationURL]',
    propertiesCallback: null,
  },
  {
    id: '[InHouseManufactured]',
    label: 'InHouseManufactured',
    value: '[InHouseManufactured]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmYesNo/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[InHouseManufactured]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[InHouseManufactured].[Name]', label: 'Name', value: '[InHouseManufactured].[Name]', propertiesCallback: null },
      { id: '[InHouseManufactured].[Code]', label: 'Code', value: '[InHouseManufactured].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[$LastChgUserName]',
    label: 'Last Updated By',
    value: '[$LastChgUserName]',
    propertiesCallback: null,
  },
  {
    id: '[$LastChgDTM]',
    label: 'Last Updated On',
    value: '[$LastChgDTM]',
    propertiesCallback: null,
  },
  {
    id: '[MSRP]',
    label: 'MSRP',
    value: '[MSRP]',
    propertiesCallback: null,
  },
  {
    id: '[ProductLine]',
    label: 'ProductLine',
    value: '[ProductLine]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmProductLine/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[ProductLine]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[ProductLine].[Name]', label: 'Name', value: '[ProductLine].[Name]', propertiesCallback: null },
      { id: '[ProductLine].[Code]', label: 'Code', value: '[ProductLine].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[ProductSubcategory]',
    label: 'ProductSubcategory',
    value: '[ProductSubcategory]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmProductSubcategory/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[ProductSubcategory]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[ProductSubcategory].[Name]', label: 'Name', value: '[ProductSubcategory].[Name]', propertiesCallback: null },
      { id: '[ProductSubcategory].[Code]', label: 'Code', value: '[ProductSubcategory].[Code]', propertiesCallback: null },
      {
        id: '[ProductSubcategory].[ProductCategory]',
        label: 'ProductCategory',
        value: '[ProductSubcategory].[ProductCategory]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmProductCategory/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[ProductSubcategory].[ProductCategory]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[ProductSubcategory].[ProductCategory].[Name]', label: 'Name', value: '[ProductSubcategory].[ProductCategory].[Name]', propertiesCallback: null },
          { id: '[ProductSubcategory].[ProductCategory].[Code]', label: 'Code', value: '[ProductSubcategory].[ProductCategory].[Code]', propertiesCallback: null },
          {
            id: '[ProductSubcategory].[ProductCategory].[ProductGroup]',
            label: 'ProductGroup',
            value: '[ProductSubcategory].[ProductCategory].[ProductGroup]',
            propertiesCallback: {
              dataKey: 'data',
              path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmProductGroup/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
              parameters: { pathString: '[ProductSubcategory].[ProductCategory].[ProductGroup]' },
              httpMethod: 'GET',
              body: null,
            },
            children: [
              { id: '[ProductSubcategory].[ProductCategory].[ProductGroup].[Name]', label: 'Name', value: '[ProductSubcategory].[ProductCategory].[ProductGroup].[Name]', propertiesCallback: null },
              { id: '[ProductSubcategory].[ProductCategory].[ProductGroup].[Code]', label: 'Code', value: '[ProductSubcategory].[ProductCategory].[ProductGroup].[Code]', propertiesCallback: null },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '[ReorderPoint]',
    label: 'ReorderPoint',
    value: '[ReorderPoint]',
    propertiesCallback: null,
  },
  {
    id: '[SafetyStockLevel]',
    label: 'SafetyStockLevel',
    value: '[SafetyStockLevel]',
    propertiesCallback: null,
  },
  {
    id: '[SellEndDate]',
    label: 'SellEndDate',
    value: '[SellEndDate]',
    propertiesCallback: null,
  },
  {
    id: '[SellStartDate]',
    label: 'SellStartDate',
    value: '[SellStartDate]',
    propertiesCallback: null,
  },
  {
    id: '[Size]',
    label: 'Size',
    value: '[Size]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmSize/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[Size]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[Size].[Name]', label: 'Name', value: '[Size].[Name]', propertiesCallback: null },
      { id: '[Size].[Code]', label: 'Code', value: '[Size].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[SizeUofM]',
    label: 'SizeUofM',
    value: '[SizeUofM]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmUnitOfMeasure/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[SizeUofM]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[SizeUofM].[Name]', label: 'Name', value: '[SizeUofM].[Name]', propertiesCallback: null },
      { id: '[SizeUofM].[Code]', label: 'Code', value: '[SizeUofM].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[StandardCost]',
    label: 'StandardCost',
    value: '[StandardCost]',
    propertiesCallback: null,
  },
  {
    id: '[Style]',
    label: 'Style',
    value: '[Style]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmStyle/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[Style]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[Style].[Name]', label: 'Name', value: '[Style].[Name]', propertiesCallback: null },
      { id: '[Style].[Code]', label: 'Code', value: '[Style].[Code]', propertiesCallback: null },
    ],
  },
  {
    id: '[Weight]',
    label: 'Weight',
    value: '[Weight]',
    propertiesCallback: null,
  },
  {
    id: '[WeightUofM]',
    label: 'WeightUofM',
    value: '[WeightUofM]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://vstestws04.corp.profisee.com/profisee/webApi/entities/HmUnitOfMeasure/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[WeightUofM]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[WeightUofM].[Name]', label: 'Name', value: '[WeightUofM].[Name]', propertiesCallback: null },
      { id: '[WeightUofM].[Code]', label: 'Code', value: '[WeightUofM].[Code]', propertiesCallback: null },
    ],
  },
];

// ─── Flat attribute list (for search) ─────────────────────────────

/** Flat list entry for attribute search */
export interface FlatAttribute {
  label: string;   // display label, e.g. "Name"
  value: string;   // full path, e.g. "[Class].[Name]"
  depth: number;   // nesting depth (0 = top-level)
}

/** Recursively flatten the attribute catalog into a searchable list */
function flattenAttributes(nodes: AttributeNode[]): FlatAttribute[] {
  const result: FlatAttribute[] = [];
  function walk(list: AttributeNode[], depth: number) {
    for (const node of list) {
      result.push({ label: node.label, value: node.value, depth });
      if (node.children) walk(node.children, depth + 1);
    }
  }
  walk(nodes, 0);
  return result;
}

/** Pre-computed flat list of all attributes for search */
export const FLAT_ATTRIBUTES: FlatAttribute[] = flattenAttributes(ATTRIBUTE_CATALOG);

// ─── Drag & Drop ──────────────────────────────────────────────────

export interface DragItem {
  type: BlockType;
  name: string;
  value?: string;
}
