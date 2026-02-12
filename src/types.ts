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
    argLabels: ['String 1', 'String 2'],
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
    name: '>', label: '>',
    argLabels: ['Left', 'Right'],
    description: 'Greater than',
    details: 'Syntax: <left> > <right>\n\nReturns true if the left expression is greater than the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<': {
    name: '<', label: '<',
    argLabels: ['Left', 'Right'],
    description: 'Less than',
    details: 'Syntax: <left> < <right>\n\nReturns true if the left expression is less than the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '>=': {
    name: '>=', label: '>=',
    argLabels: ['Left', 'Right'],
    description: 'Greater or equal',
    details: 'Syntax: <left> >= <right>\n\nReturns true if the left expression is greater than or equal to the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<=': {
    name: '<=', label: '<=',
    argLabels: ['Left', 'Right'],
    description: 'Less or equal',
    details: 'Syntax: <left> <= <right>\n\nReturns true if the left expression is less than or equal to the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<>': {
    name: '<>', label: '<>',
    argLabels: ['Left', 'Right'],
    description: 'Not equal to',
    details: 'Syntax: <left> <> <right>\n\nReturns true if the left expression is not equal to the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '=': {
    name: '=', label: '=',
    argLabels: ['Left', 'Right'],
    description: 'Equal to',
    details: 'Syntax: <left> = <right>\n\nReturns true if the left expression equals the right expression.',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },

  // ━━ ARITHMETIC OPERATORS (infix) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '+': {
    name: '+', label: '+',
    argLabels: ['Left', 'Right'],
    description: 'Addition',
    details: 'Syntax: <left> + <right>\n\nReturns the sum of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '-': {
    name: '-', label: '-',
    argLabels: ['Left', 'Right'],
    description: 'Subtraction',
    details: 'Syntax: <left> - <right>\n\nReturns the difference of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '*': {
    name: '*', label: '*',
    argLabels: ['Left', 'Right'],
    description: 'Multiplication',
    details: 'Syntax: <left> * <right>\n\nReturns the product of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '/': {
    name: '/', label: '/',
    argLabels: ['Left', 'Right'],
    description: 'Division',
    details: 'Syntax: <left> / <right>\n\nReturns the quotient of the left and right expressions.',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },

  // ━━ GROUPING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GROUP: {
    name: 'GROUP', label: '( )',
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

// ─── Block Configuration (developer API) ─────────────────────────

/** Per-block configuration set by the developer */
export interface BlockConfig {
  /** Display name shown in the block header (e.g. "Validation Rule") */
  name: string;
  /** Return type — validation returns boolean, assignment returns a value */
  expressionMode: ExpressionMode;
}

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

/** Catalog key type for switching between demo datasets */
export type AttributeCatalogKey = 'product' | 'supplyProduct';

export interface AttributeCatalogEntry {
  key: AttributeCatalogKey;
  label: string;
  catalog: AttributeNode[];
}

/** Hierarchical attribute catalog — Product demo entity */
const CATALOG_PRODUCT: AttributeNode[] = [
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

/** Hierarchical attribute catalog — SnOP Supply Product demo entity */
const CATALOG_SUPPLY_PRODUCT: AttributeNode[] = [
  { id: '[Name]', label: 'Name', value: '[Name]', propertiesCallback: null },
  { id: '[Code]', label: 'Code', value: '[Code]', propertiesCallback: null },
  {
    id: '[ChangeStatusSUP]',
    label: 'ChangeStatusSUP',
    value: '[ChangeStatusSUP]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_ProductDSStatus/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[ChangeStatusSUP]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[ChangeStatusSUP].[Name]', label: 'Name', value: '[ChangeStatusSUP].[Name]', propertiesCallback: null },
      { id: '[ChangeStatusSUP].[Code]', label: 'Code', value: '[ChangeStatusSUP].[Code]', propertiesCallback: null },
    ],
  },
  { id: '[Comments]', label: 'Comments', value: '[Comments]', propertiesCallback: null },
  {
    id: '[CompanyIndSUP]',
    label: 'CompanyIndSUP',
    value: '[CompanyIndSUP]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Company_Indicator/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[CompanyIndSUP]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [],
  },
  { id: '[$EnterUserName]', label: 'Created By', value: '[$EnterUserName]', propertiesCallback: null },
  { id: '[$EnterDTM]', label: 'Created On', value: '[$EnterDTM]', propertiesCallback: null },
  { id: '[DS1S]', label: 'DS1S', value: '[DS1S]', propertiesCallback: null },
  { id: '[DS2S]', label: 'DS2S', value: '[DS2S]', propertiesCallback: null },
  { id: '[DS3S]', label: 'DS3S', value: '[DS3S]', propertiesCallback: null },
  { id: '[FlagSysSupPublish]', label: 'FlagSysSupPublish', value: '[FlagSysSupPublish]', propertiesCallback: null },
  {
    id: '[IsActive]',
    label: 'IsActive',
    value: '[IsActive]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Boolean/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[IsActive]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[IsActive].[Name]', label: 'Name', value: '[IsActive].[Name]', propertiesCallback: null },
      { id: '[IsActive].[Code]', label: 'Code', value: '[IsActive].[Code]', propertiesCallback: null },
    ],
  },
  { id: '[$LastChgUserName]', label: 'Last Updated By', value: '[$LastChgUserName]', propertiesCallback: null },
  { id: '[$LastChgDTM]', label: 'Last Updated On', value: '[$LastChgDTM]', propertiesCallback: null },
  { id: '[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[LastChangeUserDtm]', propertiesCallback: null },
  { id: '[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[LastChangeUserNm]', propertiesCallback: null },
  { id: '[LastUpdatedByTxn]', label: 'LastUpdatedByTxn', value: '[LastUpdatedByTxn]', propertiesCallback: null },
  { id: '[Links]', label: 'Links', value: '[Links]', propertiesCallback: null },
  { id: '[MapLRPAssyUPI]', label: 'MapLRPAssyUPI', value: '[MapLRPAssyUPI]', propertiesCallback: null },
  { id: '[MemberCd]', label: 'MemberCd', value: '[MemberCd]', propertiesCallback: null },
  { id: '[ParentLastChangeUserDtm]', label: 'ParentLastChangeUserDtm', value: '[ParentLastChangeUserDtm]', propertiesCallback: null },
  { id: '[PkgVariant]', label: 'PkgVariant', value: '[PkgVariant]', propertiesCallback: null },
  {
    id: '[PkgVariantId]',
    label: 'PkgVariantId',
    value: '[PkgVariantId]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_PackageVariant/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[PkgVariantId]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[PkgVariantId].[Name]', label: 'Name', value: '[PkgVariantId].[Name]', propertiesCallback: null },
      { id: '[PkgVariantId].[Code]', label: 'Code', value: '[PkgVariantId].[Code]', propertiesCallback: null },
      { id: '[PkgVariantId].[ItemClassCd]', label: 'ItemClassCd', value: '[PkgVariantId].[ItemClassCd]', propertiesCallback: null },
      { id: '[PkgVariantId].[ItemClassNm]', label: 'ItemClassNm', value: '[PkgVariantId].[ItemClassNm]', propertiesCallback: null },
      { id: '[PkgVariantId].[MaterialTypeCd]', label: 'MaterialTypeCd', value: '[PkgVariantId].[MaterialTypeCd]', propertiesCallback: null },
      { id: '[PkgVariantId].[MaterialTypeDsc]', label: 'MaterialTypeDsc', value: '[PkgVariantId].[MaterialTypeDsc]', propertiesCallback: null },
      { id: '[PkgVariantId].[MemberCd]', label: 'MemberCd', value: '[PkgVariantId].[MemberCd]', propertiesCallback: null },
      { id: '[PkgVariantId].[OwningSystemId]', label: 'OwningSystemId', value: '[PkgVariantId].[OwningSystemId]', propertiesCallback: null },
      { id: '[PkgVariantId].[PackageVariantId]', label: 'PackageVariantId', value: '[PkgVariantId].[PackageVariantId]', propertiesCallback: null },
      { id: '[PkgVariantId].[PackageVariantNm]', label: 'PackageVariantNm', value: '[PkgVariantId].[PackageVariantNm]', propertiesCallback: null },
    ],
  },
  {
    id: '[PlaceHolderSupInd]',
    label: 'PlaceHolderSupInd',
    value: '[PlaceHolderSupInd]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Boolean/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[PlaceHolderSupInd]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[PlaceHolderSupInd].[Name]', label: 'Name', value: '[PlaceHolderSupInd].[Name]', propertiesCallback: null },
      { id: '[PlaceHolderSupInd].[Code]', label: 'Code', value: '[PlaceHolderSupInd].[Code]', propertiesCallback: null },
    ],
  },
  { id: '[PublishDateSUP]', label: 'PublishDateSUP', value: '[PublishDateSUP]', propertiesCallback: null },
  {
    id: '[PublishIndicatorSUP]',
    label: 'PublishIndicatorSUP',
    value: '[PublishIndicatorSUP]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_ProductPublishIndicator/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[PublishIndicatorSUP]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[PublishIndicatorSUP].[Name]', label: 'Name', value: '[PublishIndicatorSUP].[Name]', propertiesCallback: null },
      { id: '[PublishIndicatorSUP].[Code]', label: 'Code', value: '[PublishIndicatorSUP].[Code]', propertiesCallback: null },
    ],
  },
  { id: '[RefDLCPRange]', label: 'RefDLCPRange', value: '[RefDLCPRange]', propertiesCallback: null },
  { id: '[RefMapInternalSiliconCdNm]', label: 'RefMapInternalSiliconCdNm', value: '[RefMapInternalSiliconCdNm]', propertiesCallback: null },
  { id: '[RefMapNativeCore]', label: 'RefMapNativeCore', value: '[RefMapNativeCore]', propertiesCallback: null },
  { id: '[RefMapPinCount]', label: 'RefMapPinCount', value: '[RefMapPinCount]', propertiesCallback: null },
  { id: '[RefPkgFunctionalType]', label: 'RefPkgFunctionalType', value: '[RefPkgFunctionalType]', propertiesCallback: null },
  { id: '[RefSnOPBoardFormFactor]', label: 'RefSnOPBoardFormFactor', value: '[RefSnOPBoardFormFactor]', propertiesCallback: null },
  { id: '[RefSnOPProcess]', label: 'RefSnOPProcess', value: '[RefSnOPProcess]', propertiesCallback: null },
  { id: '[RefSnOPProcessNode]', label: 'RefSnOPProcessNode', value: '[RefSnOPProcessNode]', propertiesCallback: null },
  {
    id: '[SnOPDemandProduct]',
    label: 'SnOPDemandProduct',
    value: '[SnOPDemandProduct]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Demand_Product/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[SnOPDemandProduct]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[SnOPDemandProduct].[Name]', label: 'Name', value: '[SnOPDemandProduct].[Name]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[Code]', label: 'Code', value: '[SnOPDemandProduct].[Code]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[BaseUOM]', label: 'BaseUOM', value: '[SnOPDemandProduct].[BaseUOM]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[ChangeStatusDMD]',
        label: 'ChangeStatusDMD',
        value: '[SnOPDemandProduct].[ChangeStatusDMD]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_ProductDSStatus/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[ChangeStatusDMD]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[ChangeStatusDMD].[Name]', label: 'Name', value: '[SnOPDemandProduct].[ChangeStatusDMD].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[ChangeStatusDMD].[Code]', label: 'Code', value: '[SnOPDemandProduct].[ChangeStatusDMD].[Code]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[Comments]', label: 'Comments', value: '[SnOPDemandProduct].[Comments]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[CompanyIndDMD]',
        label: 'CompanyIndDMD',
        value: '[SnOPDemandProduct].[CompanyIndDMD]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Company_Indicator/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[CompanyIndDMD]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[CompanyIndDMD].[Name]', label: 'Name', value: '[SnOPDemandProduct].[CompanyIndDMD].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[CompanyIndDMD].[Code]', label: 'Code', value: '[SnOPDemandProduct].[CompanyIndDMD].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[CompanyIndDMD].[CompanyInd]', label: 'CompanyInd', value: '[SnOPDemandProduct].[CompanyIndDMD].[CompanyInd]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[DependentDBAUpdtDtm]', label: 'DependentDBAUpdtDtm', value: '[SnOPDemandProduct].[DependentDBAUpdtDtm]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[DesignBizCd]',
        label: 'DesignBizCd',
        value: '[SnOPDemandProduct].[DesignBizCd]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Profit_Center_Hierarchy/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[DesignBizCd]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[DesignBizCd].[Name]', label: 'Name', value: '[SnOPDemandProduct].[DesignBizCd].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[Code]', label: 'Code', value: '[SnOPDemandProduct].[DesignBizCd].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[DivisionCd]', label: 'DivisionCd', value: '[SnOPDemandProduct].[DesignBizCd].[DivisionCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[DivisionDsc]', label: 'DivisionDsc', value: '[SnOPDemandProduct].[DesignBizCd].[DivisionDsc]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[DivisionLongNm]', label: 'DivisionLongNm', value: '[SnOPDemandProduct].[DesignBizCd].[DivisionLongNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[DivisionNm]', label: 'DivisionNm', value: '[SnOPDemandProduct].[DesignBizCd].[DivisionNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[FinancialReportingCategoryCd]', label: 'FinancialReportingCategoryCd', value: '[SnOPDemandProduct].[DesignBizCd].[FinancialReportingCategoryCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[GroupCd]', label: 'GroupCd', value: '[SnOPDemandProduct].[DesignBizCd].[GroupCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[GroupDsc]', label: 'GroupDsc', value: '[SnOPDemandProduct].[DesignBizCd].[GroupDsc]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[GroupLongNm]', label: 'GroupLongNm', value: '[SnOPDemandProduct].[DesignBizCd].[GroupLongNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[GroupNm]', label: 'GroupNm', value: '[SnOPDemandProduct].[DesignBizCd].[GroupNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[LastDaaSSyncDateTm]', label: 'LastDaaSSyncDateTm', value: '[SnOPDemandProduct].[DesignBizCd].[LastDaaSSyncDateTm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[DesignBizCd].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProductPlanningInd]', label: 'ProductPlanningInd', value: '[SnOPDemandProduct].[DesignBizCd].[ProductPlanningInd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterCd]', label: 'ProfitCenterCd', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterClassificationInd]', label: 'ProfitCenterClassificationInd', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterClassificationInd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterCreateDt]', label: 'ProfitCenterCreateDt', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterCreateDt]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterDsc]', label: 'ProfitCenterDsc', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterDsc]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterLockInd]', label: 'ProfitCenterLockInd', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterLockInd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterNm]', label: 'ProfitCenterNm', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterTypeCd]', label: 'ProfitCenterTypeCd', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterTypeCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterTypeInd]', label: 'ProfitCenterTypeInd', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterTypeInd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterValidFromDt]', label: 'ProfitCenterValidFromDt', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterValidFromDt]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterValidToDt]', label: 'ProfitCenterValidToDt', value: '[SnOPDemandProduct].[DesignBizCd].[ProfitCenterValidToDt]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[SuperGroupCd]', label: 'SuperGroupCd', value: '[SnOPDemandProduct].[DesignBizCd].[SuperGroupCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[SuperGroupDsc]', label: 'SuperGroupDsc', value: '[SnOPDemandProduct].[DesignBizCd].[SuperGroupDsc]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[SupergroupLongNm]', label: 'SupergroupLongNm', value: '[SnOPDemandProduct].[DesignBizCd].[SupergroupLongNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[SuperGroupNm]', label: 'SuperGroupNm', value: '[SnOPDemandProduct].[DesignBizCd].[SuperGroupNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ValidFromDt]', label: 'ValidFromDt', value: '[SnOPDemandProduct].[DesignBizCd].[ValidFromDt]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[DesignBizCd].[ValidToDt]', label: 'ValidToDt', value: '[SnOPDemandProduct].[DesignBizCd].[ValidToDt]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[DesignBizId]', label: 'DesignBizId', value: '[SnOPDemandProduct].[DesignBizId]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[DesignBizNm]', label: 'DesignBizNm', value: '[SnOPDemandProduct].[DesignBizNm]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[DmdClassification]', label: 'DmdClassification', value: '[SnOPDemandProduct].[DmdClassification]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[DS1D]', label: 'DS1D', value: '[SnOPDemandProduct].[DS1D]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[DS2D]', label: 'DS2D', value: '[SnOPDemandProduct].[DS2D]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[DS3D]', label: 'DS3D', value: '[SnOPDemandProduct].[DS3D]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[IOTMktSwimlaneGrp]', label: 'IOTMktSwimlaneGrp', value: '[SnOPDemandProduct].[IOTMktSwimlaneGrp]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[IsActive]',
        label: 'IsActive',
        value: '[SnOPDemandProduct].[IsActive]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Boolean/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[IsActive]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[IsActive].[Name]', label: 'Name', value: '[SnOPDemandProduct].[IsActive].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[IsActive].[Code]', label: 'Code', value: '[SnOPDemandProduct].[IsActive].[Code]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[LastChangeUserDtm]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[LastChangeUserNm]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[LastUpdatedByTxn]', label: 'LastUpdatedByTxn', value: '[SnOPDemandProduct].[LastUpdatedByTxn]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[LegalMktCdNm]', label: 'LegalMktCdNm', value: '[SnOPDemandProduct].[LegalMktCdNm]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[Links]', label: 'Links', value: '[SnOPDemandProduct].[Links]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[MarketingCdNm]', label: 'MarketingCdNm', value: '[SnOPDemandProduct].[MarketingCdNm]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[MarketingCdNmAbbrev]', label: 'MarketingCdNmAbbrev', value: '[SnOPDemandProduct].[MarketingCdNmAbbrev]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[MemberCd]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[ModemPlatformGroup]', label: 'ModemPlatformGroup', value: '[SnOPDemandProduct].[ModemPlatformGroup]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[PlaceHolderDmdInd]',
        label: 'PlaceHolderDmdInd',
        value: '[SnOPDemandProduct].[PlaceHolderDmdInd]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Boolean/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[PlaceHolderDmdInd]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[PlaceHolderDmdInd].[Name]', label: 'Name', value: '[SnOPDemandProduct].[PlaceHolderDmdInd].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[PlaceHolderDmdInd].[Code]', label: 'Code', value: '[SnOPDemandProduct].[PlaceHolderDmdInd].[Code]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[PublishDateDMD]', label: 'PublishDateDMD', value: '[SnOPDemandProduct].[PublishDateDMD]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[PublishIndicatorDMD]',
        label: 'PublishIndicatorDMD',
        value: '[SnOPDemandProduct].[PublishIndicatorDMD]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_ProductPublishIndicator/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[PublishIndicatorDMD]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[PublishIndicatorDMD].[Name]', label: 'Name', value: '[SnOPDemandProduct].[PublishIndicatorDMD].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[PublishIndicatorDMD].[Code]', label: 'Code', value: '[SnOPDemandProduct].[PublishIndicatorDMD].[Code]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[SnOPBoardFormFactor]', label: 'SnOPBoardFormFactor', value: '[SnOPDemandProduct].[SnOPBoardFormFactor]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[SnOPBrandGrp]',
        label: 'SnOPBrandGrp',
        value: '[SnOPDemandProduct].[SnOPBrandGrp]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_BrandGroup/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[SnOPBrandGrp]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[SnOPBrandGrp].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPBrandGrp].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPBrandGrp].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPBrandGrp].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPBrandGrp].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[SnOPBrandGrp].[LastChangeUserDtm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPBrandGrp].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[SnOPBrandGrp].[LastChangeUserNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPBrandGrp].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[SnOPBrandGrp].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPBrandGrp].[SnOPBrandGrp]', label: 'SnOPBrandGrp', value: '[SnOPDemandProduct].[SnOPBrandGrp].[SnOPBrandGrp]', propertiesCallback: null },
        ],
      },
      {
        id: '[SnOPDemandProduct].[SnOPComputeArchGrp]',
        label: 'SnOPComputeArchGrp',
        value: '[SnOPDemandProduct].[SnOPComputeArchGrp]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_ComputeArchitectureGroup/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[SnOPComputeArchGrp]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[SnOPComputeArchGrp].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPComputeArchGrp].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPComputeArchGrp].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPComputeArchGrp].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPComputeArchGrp].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[SnOPComputeArchGrp].[LastChangeUserDtm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPComputeArchGrp].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[SnOPComputeArchGrp].[LastChangeUserNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPComputeArchGrp].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[SnOPComputeArchGrp].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPComputeArchGrp].[SnOPComputeArchGrp]', label: 'SnOPComputeArchGrp', value: '[SnOPDemandProduct].[SnOPComputeArchGrp].[SnOPComputeArchGrp]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[SnOPDataRate]', label: 'SnOPDataRate', value: '[SnOPDemandProduct].[SnOPDataRate]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPDemandProduct]', label: 'SnOPDemandProduct', value: '[SnOPDemandProduct].[SnOPDemandProduct]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPDemandShortNm]', label: 'SnOPDemandShortNm', value: '[SnOPDemandProduct].[SnOPDemandShortNm]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPFunctionalCoreGrp]', label: 'SnOPFunctionalCoreGrp', value: '[SnOPDemandProduct].[SnOPFunctionalCoreGrp]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPGraphicsTier]', label: 'SnOPGraphicsTier', value: '[SnOPDemandProduct].[SnOPGraphicsTier]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPMemoryCapacity]', label: 'SnOPMemoryCapacity', value: '[SnOPDemandProduct].[SnOPMemoryCapacity]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[SnOPMktSwimlane]',
        label: 'SnOPMktSwimlane',
        value: '[SnOPDemandProduct].[SnOPMktSwimlane]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_MarketSwimlane/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[SnOPMktSwimlane]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[SnOPMktSwimlane].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPMktSwimlane].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlane].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPMktSwimlane].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlane].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[SnOPMktSwimlane].[LastChangeUserDtm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlane].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[SnOPMktSwimlane].[LastChangeUserNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlane].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[SnOPMktSwimlane].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlane].[SnOPMktSwimlane]', label: 'SnOPMktSwimlane', value: '[SnOPDemandProduct].[SnOPMktSwimlane].[SnOPMktSwimlane]', propertiesCallback: null },
        ],
      },
      {
        id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp]',
        label: 'SnOPMktSwimlaneGrp',
        value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_MarketSwimlaneGroup/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[LastChangeUserDtm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[LastChangeUserNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[SnOPMktSwimlaneGrp]', label: 'SnOPMktSwimlaneGrp', value: '[SnOPDemandProduct].[SnOPMktSwimlaneGrp].[SnOPMktSwimlaneGrp]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[SnOPPerformanceClass]', label: 'SnOPPerformanceClass', value: '[SnOPDemandProduct].[SnOPPerformanceClass]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[SnOPPkgAbbrev]',
        label: 'SnOPPkgAbbrev',
        value: '[SnOPDemandProduct].[SnOPPkgAbbrev]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_PackageAbbreviation/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[SnOPPkgAbbrev]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[SnOPPkgAbbrev].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPPkgAbbrev].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPPkgAbbrev].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPPkgAbbrev].[Code]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPPkgAbbrev].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[SnOPPkgAbbrev].[LastChangeUserDtm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPPkgAbbrev].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[SnOPPkgAbbrev].[LastChangeUserNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPPkgAbbrev].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[SnOPPkgAbbrev].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPPkgAbbrev].[SnOPPkgAbbrev]', label: 'SnOPPkgAbbrev', value: '[SnOPDemandProduct].[SnOPPkgAbbrev].[SnOPPkgAbbrev]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[SnOPPkgFunctionalType]', label: 'SnOPPkgFunctionalType', value: '[SnOPDemandProduct].[SnOPPkgFunctionalType]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPProcess]', label: 'SnOPProcess', value: '[SnOPDemandProduct].[SnOPProcess]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPProcessNode]', label: 'SnOPProcessNode', value: '[SnOPDemandProduct].[SnOPProcessNode]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPProductGenSeries]', label: 'SnOPProductGenSeries', value: '[SnOPDemandProduct].[SnOPProductGenSeries]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPProductGenSeriesGrp]', label: 'SnOPProductGenSeriesGrp', value: '[SnOPDemandProduct].[SnOPProductGenSeriesGrp]', propertiesCallback: null },
      {
        id: '[SnOPDemandProduct].[SnOPProductType]',
        label: 'SnOPProductType',
        value: '[SnOPDemandProduct].[SnOPProductType]',
        propertiesCallback: {
          dataKey: 'data',
          path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_ProductType/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
          parameters: { pathString: '[SnOPDemandProduct].[SnOPProductType]' },
          httpMethod: 'GET',
          body: null,
        },
        children: [
          { id: '[SnOPDemandProduct].[SnOPProductType].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPProductType].[Name]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPProductType].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPProductType].[Code]', propertiesCallback: null },
          {
            id: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd]',
            label: 'CompanyInd',
            value: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd]',
            propertiesCallback: {
              dataKey: 'data',
              path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Company_Indicator/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
              parameters: { pathString: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd]' },
              httpMethod: 'GET',
              body: null,
            },
            children: [
              { id: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd].[Name]', label: 'Name', value: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd].[Name]', propertiesCallback: null },
              { id: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd].[Code]', label: 'Code', value: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd].[Code]', propertiesCallback: null },
              { id: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd].[CompanyInd]', label: 'CompanyInd', value: '[SnOPDemandProduct].[SnOPProductType].[CompanyInd].[CompanyInd]', propertiesCallback: null },
            ],
          },
          { id: '[SnOPDemandProduct].[SnOPProductType].[DqConstVal]', label: 'DqConstVal', value: '[SnOPDemandProduct].[SnOPProductType].[DqConstVal]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPProductType].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPDemandProduct].[SnOPProductType].[LastChangeUserDtm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPProductType].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPDemandProduct].[SnOPProductType].[LastChangeUserNm]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPProductType].[MemberCd]', label: 'MemberCd', value: '[SnOPDemandProduct].[SnOPProductType].[MemberCd]', propertiesCallback: null },
          { id: '[SnOPDemandProduct].[SnOPProductType].[SnOPProductType]', label: 'SnOPProductType', value: '[SnOPDemandProduct].[SnOPProductType].[SnOPProductType]', propertiesCallback: null },
        ],
      },
      { id: '[SnOPDemandProduct].[SnOPRevenueProduct]', label: 'SnOPRevenueProduct', value: '[SnOPDemandProduct].[SnOPRevenueProduct]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPStorageCapacity]', label: 'SnOPStorageCapacity', value: '[SnOPDemandProduct].[SnOPStorageCapacity]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[SnOPWayness]', label: 'SnOPWayness', value: '[SnOPDemandProduct].[SnOPWayness]', propertiesCallback: null },
      { id: '[SnOPDemandProduct].[VariantIteration]', label: 'VariantIteration', value: '[SnOPDemandProduct].[VariantIteration]', propertiesCallback: null },
    ],
  },
  { id: '[SnOPDemandProductId]', label: 'SnOPDemandProductId', value: '[SnOPDemandProductId]', propertiesCallback: null },
  { id: '[SnOPPerformanceProfile]', label: 'SnOPPerformanceProfile', value: '[SnOPPerformanceProfile]', propertiesCallback: null },
  {
    id: '[SnOPPostSiBOMInd]',
    label: 'SnOPPostSiBOMInd',
    value: '[SnOPPostSiBOMInd]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_Boolean/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[SnOPPostSiBOMInd]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[SnOPPostSiBOMInd].[Name]', label: 'Name', value: '[SnOPPostSiBOMInd].[Name]', propertiesCallback: null },
      { id: '[SnOPPostSiBOMInd].[Code]', label: 'Code', value: '[SnOPPostSiBOMInd].[Code]', propertiesCallback: null },
    ],
  },
  { id: '[SnOPSiBOMID]', label: 'SnOPSiBOMID', value: '[SnOPSiBOMID]', propertiesCallback: null },
  { id: '[SnOPSupplyProduct]', label: 'SnOPSupplyProduct', value: '[SnOPSupplyProduct]', propertiesCallback: null },
  { id: '[SnOPSupplyShortNm]', label: 'SnOPSupplyShortNm', value: '[SnOPSupplyShortNm]', propertiesCallback: null },
  {
    id: '[SnOPWaferFOCd]',
    label: 'SnOPWaferFOCd',
    value: '[SnOPWaferFOCd]',
    propertiesCallback: {
      dataKey: 'data',
      path: 'https://corpltr50.corp.profisee.com/profisee/webApi/entities/SDRA_DA_WaferFOCode/propertyMetadata?pathString={pathString}&isDataQualityExpression=true',
      parameters: { pathString: '[SnOPWaferFOCd]' },
      httpMethod: 'GET',
      body: null,
    },
    children: [
      { id: '[SnOPWaferFOCd].[Name]', label: 'Name', value: '[SnOPWaferFOCd].[Name]', propertiesCallback: null },
      { id: '[SnOPWaferFOCd].[Code]', label: 'Code', value: '[SnOPWaferFOCd].[Code]', propertiesCallback: null },
      { id: '[SnOPWaferFOCd].[DqConstVal]', label: 'DqConstVal', value: '[SnOPWaferFOCd].[DqConstVal]', propertiesCallback: null },
      { id: '[SnOPWaferFOCd].[LastChangeUserDtm]', label: 'LastChangeUserDtm', value: '[SnOPWaferFOCd].[LastChangeUserDtm]', propertiesCallback: null },
      { id: '[SnOPWaferFOCd].[LastChangeUserNm]', label: 'LastChangeUserNm', value: '[SnOPWaferFOCd].[LastChangeUserNm]', propertiesCallback: null },
      { id: '[SnOPWaferFOCd].[MemberCd]', label: 'MemberCd', value: '[SnOPWaferFOCd].[MemberCd]', propertiesCallback: null },
      { id: '[SnOPWaferFOCd].[SnOPWaferFOCd]', label: 'SnOPWaferFOCd', value: '[SnOPWaferFOCd].[SnOPWaferFOCd]', propertiesCallback: null },
    ],
  },
];

// ─── Attribute Catalog Registry ───────────────────────────────────

/** All available attribute catalogs keyed by name */
export const ATTRIBUTE_CATALOGS: Record<AttributeCatalogKey, AttributeCatalogEntry> = {
  product: { key: 'product', label: 'Product', catalog: CATALOG_PRODUCT },
  supplyProduct: { key: 'supplyProduct', label: 'Supply Product', catalog: CATALOG_SUPPLY_PRODUCT },
};

export const ATTRIBUTE_CATALOG_KEYS = Object.keys(ATTRIBUTE_CATALOGS) as AttributeCatalogKey[];

/** Default / backwards-compat alias */
export const ATTRIBUTE_CATALOG = CATALOG_PRODUCT;

// ─── Flat attribute list (for search) ─────────────────────────────

/** Flat list entry for attribute search */
export interface FlatAttribute {
  label: string;   // display label, e.g. "Name"
  value: string;   // full path, e.g. "[Class].[Name]"
  depth: number;   // nesting depth (0 = top-level)
}

/** Recursively flatten the attribute catalog into a searchable list */
export function flattenAttributes(nodes: AttributeNode[]): FlatAttribute[] {
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

/** Pre-computed flat list of all attributes for search (default catalog) */
export const FLAT_ATTRIBUTES: FlatAttribute[] = flattenAttributes(ATTRIBUTE_CATALOG);

// ─── Drag & Drop ──────────────────────────────────────────────────

export interface DragItem {
  type: BlockType;
  name: string;
  value?: string;
}
