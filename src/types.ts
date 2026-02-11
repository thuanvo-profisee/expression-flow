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
  color: string;
  category: FunctionCategory;
  subcategory: FunctionSubcategory;
  isInfix?: boolean;
  variadic?: boolean; // true → skip null args in code gen
}

/** Registry of all known functions and operators */
export const FUNCTION_REGISTRY: Record<string, FunctionMeta> = {

  // ━━ LOGIC ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IF: {
    name: 'IF', label: 'IF',
    argLabels: ['Condition', 'True Case', 'False Case'],
    description: 'Conditional: if/then/else',
    color: 'indigo', category: 'function', subcategory: 'logic',
  },
  AND: {
    name: 'AND', label: 'AND',
    argLabels: ['Condition 1', 'Condition 2'],
    description: 'Logical AND',
    color: 'rose', category: 'function', subcategory: 'logic',
  },
  OR: {
    name: 'OR', label: 'OR',
    argLabels: ['Condition 1', 'Condition 2'],
    description: 'Logical OR',
    color: 'purple', category: 'function', subcategory: 'logic',
  },
  NOT: {
    name: 'NOT', label: 'NOT',
    argLabels: ['Condition'],
    description: 'Logical NOT',
    color: 'pink', category: 'function', subcategory: 'logic',
  },

  // ━━ STRING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CONCAT: {
    name: 'CONCAT', label: 'CONCAT',
    argLabels: ['String 1', 'String 2', 'String 3'],
    description: 'Concatenate two or more strings',
    color: 'sky', category: 'function', subcategory: 'string',
    variadic: true,
  },
  CONTAINS: {
    name: 'CONTAINS', label: 'CONTAINS',
    argLabels: ['Expression to Search', 'Expression to Find'],
    description: 'Checks if string contains substring',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  CONTAINSPATTERN: {
    name: 'CONTAINSPATTERN', label: 'CONTAINSPATTERN',
    argLabels: ['Expression to Search', 'Pattern to Find'],
    description: 'Checks if string contains pattern',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  ENDSWITH: {
    name: 'ENDSWITH', label: 'ENDSWITH',
    argLabels: ['Expression', 'Suffix'],
    description: 'Checks if string ends with value',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  STARTSWITH: {
    name: 'STARTSWITH', label: 'STARTSWITH',
    argLabels: ['Expression', 'Prefix'],
    description: 'Checks if string starts with value',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  INDEXOF: {
    name: 'INDEXOF', label: 'INDEXOF',
    argLabels: ['Expression to Search', 'Expression to Find'],
    description: 'Finds index of string within string',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  LEFT: {
    name: 'LEFT', label: 'LEFT',
    argLabels: ['String', 'Count'],
    description: 'Returns N chars from the left',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  RIGHT: {
    name: 'RIGHT', label: 'RIGHT',
    argLabels: ['String', 'Count'],
    description: 'Returns N chars from the right',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  LENGTH: {
    name: 'LENGTH', label: 'LENGTH',
    argLabels: ['String'],
    description: 'Returns string length',
    color: 'sky', category: 'function', subcategory: 'string',
  },
  SUBSTRING: {
    name: 'SUBSTRING', label: 'SUBSTRING',
    argLabels: ['String', 'Start Position', 'Count'],
    description: 'Returns a subset of a string',
    color: 'sky', category: 'function', subcategory: 'string',
  },

  // ━━ DATE & TIME ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DATE: {
    name: 'DATE', label: 'DATE',
    argLabels: ['DD', 'MM', 'YYYY'],
    description: 'Returns a Date from DD/MM/YYYY',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  DATEADD: {
    name: 'DATEADD', label: 'DATEADD',
    argLabels: ['Date', 'Number', 'Interval'],
    description: 'Add day/month/year to a date',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  DATEDIFF: {
    name: 'DATEDIFF', label: 'DATEDIFF',
    argLabels: ['Start Date', 'End Date'],
    description: 'Days between two dates',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  DATETIMEUTC: {
    name: 'DATETIMEUTC', label: 'DATETIMEUTC',
    argLabels: ['DD', 'MM', 'YYYY', 'HH', 'Minutes', 'SS', 'MS (opt)'],
    description: 'Returns a DateTime from components',
    color: 'teal', category: 'function', subcategory: 'datetime',
    variadic: true,
  },
  RELATIVEDATE: {
    name: 'RELATIVEDATE', label: 'RELATIVEDATE',
    argLabels: ['Date', 'Interval'],
    description: 'Relative date (StartOfMonth, etc.)',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  NOW: {
    name: 'NOW', label: 'NOW',
    argLabels: [],
    description: 'Current date and time',
    color: 'teal', category: 'function', subcategory: 'datetime',
  },
  TODAY: {
    name: 'TODAY', label: 'TODAY',
    argLabels: [],
    description: "Today's date",
    color: 'teal', category: 'function', subcategory: 'datetime',
  },

  // ━━ CONVERSION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TEXT: {
    name: 'TEXT', label: 'TEXT',
    argLabels: ['Expression'],
    description: 'Convert to string',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  TONUMBER: {
    name: 'TONUMBER', label: 'TONUMBER',
    argLabels: ['String'],
    description: 'Convert string to number',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  TODATE: {
    name: 'TODATE', label: 'TODATE',
    argLabels: ['String (YYYY-MM-DD)'],
    description: 'Convert string to Date',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  TODATETIMEUTC: {
    name: 'TODATETIMEUTC', label: 'TODATETIMEUTC',
    argLabels: ['String (YYYY-MM-DD HH:mm:ss)'],
    description: 'Convert string to DateTime',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },
  NEWGUID: {
    name: 'NEWGUID', label: 'NEWGUID',
    argLabels: [],
    description: 'Returns a new GUID string',
    color: 'violet', category: 'function', subcategory: 'conversion',
  },

  // ━━ CHANGE DETECTION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CHANGED: {
    name: 'CHANGED', label: 'CHANGED',
    argLabels: ['Attribute 1', 'Attribute 2', 'Attribute 3'],
    description: 'Checks for value change in attributes',
    color: 'orange', category: 'function', subcategory: 'change',
    variadic: true,
  },
  CHANGEDFROM: {
    name: 'CHANGEDFROM', label: 'CHANGEDFROM',
    argLabels: ['Attribute', 'Values / Attribute'],
    description: 'Value changed from listed values',
    color: 'orange', category: 'function', subcategory: 'change',
  },
  CHANGEDTO: {
    name: 'CHANGEDTO', label: 'CHANGEDTO',
    argLabels: ['Attribute', 'Values / Attribute'],
    description: 'Value changed to listed values',
    color: 'orange', category: 'function', subcategory: 'change',
  },
  PRIOR: {
    name: 'PRIOR', label: 'PRIOR',
    argLabels: ['Attribute'],
    description: "Reference to attribute's prior value",
    color: 'orange', category: 'function', subcategory: 'change',
  },

  // ━━ SET OPERATIONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  IN: {
    name: 'IN', label: 'IN',
    argLabels: ['Attribute', 'Values'],
    description: 'Value is in the list',
    color: 'lime', category: 'function', subcategory: 'set',
    isInfix: true,
  },
  'NOT IN': {
    name: 'NOT IN', label: 'NOT IN',
    argLabels: ['Attribute', 'Values'],
    description: 'Value is not in the list',
    color: 'lime', category: 'function', subcategory: 'set',
    isInfix: true,
  },

  // ━━ COMPARISON OPERATORS (infix) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '>': {
    name: '>', label: '>',
    argLabels: ['Left', 'Right'],
    description: 'Greater than',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<': {
    name: '<', label: '<',
    argLabels: ['Left', 'Right'],
    description: 'Less than',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '>=': {
    name: '>=', label: '>=',
    argLabels: ['Left', 'Right'],
    description: 'Greater or equal',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<=': {
    name: '<=', label: '<=',
    argLabels: ['Left', 'Right'],
    description: 'Less or equal',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '<>': {
    name: '<>', label: '<>',
    argLabels: ['Left', 'Right'],
    description: 'Not equal to',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },
  '=': {
    name: '=', label: '=',
    argLabels: ['Left', 'Right'],
    description: 'Equal to',
    color: 'emerald', category: 'comparison', subcategory: 'comparison',
    isInfix: true,
  },

  // ━━ ARITHMETIC OPERATORS (infix) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  '+': {
    name: '+', label: '+',
    argLabels: ['Left', 'Right'],
    description: 'Addition',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '-': {
    name: '-', label: '-',
    argLabels: ['Left', 'Right'],
    description: 'Subtraction',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '*': {
    name: '*', label: '*',
    argLabels: ['Left', 'Right'],
    description: 'Multiplication',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },
  '/': {
    name: '/', label: '/',
    argLabels: ['Left', 'Right'],
    description: 'Division',
    color: 'amber', category: 'arithmetic', subcategory: 'arithmetic',
    isInfix: true,
  },

  // ━━ GROUPING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GROUP: {
    name: 'GROUP', label: '( )',
    argLabels: ['Expression'],
    description: 'Parentheses grouping',
    color: 'slate', category: 'grouping', subcategory: 'grouping',
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
    example: '[ForecastMktSegment] = [MktSegment]',
  },
  assignment: {
    label: 'Assignment',
    description: 'Expression returns a computed value',
    returnType: 'Value (string, number, etc.)',
    color: 'indigo',
    example: 'IF(LENGTH([SnOPComputeArchGrp]) > 0, [SnOPComputeArchGrp], "")',
  },
};

// ─── Attribute Tree ───────────────────────────────────────────────

export interface AttributeNode {
  name: string;            // e.g. "[Product]"
  children?: AttributeNode[];
}

/** Hierarchical attribute catalog — each node can have child properties */
export const ATTRIBUTE_CATALOG: AttributeNode[] = [
  { name: '[Code]' },
  {
    name: '[Product]',
    children: [
      {
        name: '[ProductSubcategory]',
        children: [
          {
            name: '[ProductCategory]',
            children: [
              {
                name: '[ProductGroup]',
                children: [
                  { name: '[Name]' },
                  { name: '[Code]' },
                ],
              },
            ],
          },
        ],
      },
      { name: '[Name]' },
      { name: '[Code]' },
    ],
  },
  {
    name: '[SnOPPostSiliconSupplyProduct]',
    children: [
      { name: '[MemberCd]' },
      { name: '[Name]' },
    ],
  },
  {
    name: '[SiliconSnOPSupplyProduct]',
    children: [
      { name: '[MemberCd]' },
      { name: '[Name]' },
    ],
  },
  {
    name: '[SnOPComputeArchGrp]',
    children: [
      { name: '[Name]' },
      { name: '[Code]' },
    ],
  },
  {
    name: '[ForecastMktSegment]',
    children: [
      { name: '[Name]' },
      { name: '[Code]' },
    ],
  },
  {
    name: '[MktSegment]',
    children: [
      { name: '[Name]' },
      { name: '[Code]' },
    ],
  },
  {
    name: '[SnOPSupplyProduct]',
    children: [
      { name: '[MemberCd]' },
      { name: '[Name]' },
    ],
  },
  { name: '[MarketingCdNm]' },
  { name: '[CreatedBy]' },
  { name: '[ProductGroup]' },
  { name: '[Region]' },
  { name: '[SalesOrg]' },
  { name: '[FiscalYear]' },
  { name: '[Currency]' },
  { name: '[UnitOfMeasure]' },
];

// ─── Drag & Drop ──────────────────────────────────────────────────

export interface DragItem {
  type: BlockType;
  name: string;
  value?: string;
}
