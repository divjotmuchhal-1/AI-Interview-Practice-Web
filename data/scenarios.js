// Scenario definitions, organized by track (one folder per track).
// See data/scenarios/README.md for the scenario schema and authoring rules.
import { trie }                   from '@/data/scenarios/python/trie';
import { lruCache }               from '@/data/scenarios/python/lruCache';
import { eventEmitter }           from '@/data/scenarios/python/eventEmitter';
import { logQueryFilter }         from '@/data/scenarios/python/logQueryFilter';
import { csvParser }              from '@/data/scenarios/python/csvParser';
import { mergeIntervals }         from '@/data/scenarios/python/mergeIntervals';
import { dependencyResolver }     from '@/data/scenarios/python/dependencyResolver';
import { featureFlags }           from '@/data/scenarios/javascript/featureFlags';
import { rateLimiter }            from '@/data/scenarios/javascript/rateLimiter';
import { configParser }           from '@/data/scenarios/javascript/configParser';
import { transactionRulesEngine } from '@/data/scenarios/javascript/transactionRulesEngine';
import { middlewarePipeline }     from '@/data/scenarios/typescript/middlewarePipeline';
import { webhookEventRouter }     from '@/data/scenarios/typescript/webhookEventRouter';
import { sqlUserSpend }           from '@/data/scenarios/sql/sqlUserSpend';
import { sqlLeaderboard }         from '@/data/scenarios/sql/sqlLeaderboard';
import { sqlRevenueReport }       from '@/data/scenarios/sql/sqlRevenueReport';
import { sqlCustomerLifetime }    from '@/data/scenarios/sql/sqlCustomerLifetime';
import { sqlFunnelAnalysis }      from '@/data/scenarios/sql/sqlFunnelAnalysis';
import { sqlRunningTotals }       from '@/data/scenarios/sql/sqlRunningTotals';
import { sqlRetentionCohorts }    from '@/data/scenarios/sql/sqlRetentionCohorts';
import { sqlSpendSegmentation }   from '@/data/scenarios/sql/sqlSpendSegmentation';
import { reactCartReducer }       from '@/data/scenarios/react/reactCartReducer';
import { reactMemoize }           from '@/data/scenarios/react/reactMemoize';
import { reactEventSystem }       from '@/data/scenarios/react/reactEventSystem';
import { reactStaleCounter }      from '@/data/scenarios/react/reactStaleCounter';
import { reactPaginatedFeed }     from '@/data/scenarios/react/reactPaginatedFeed';
import { reactDebouncedEffect }   from '@/data/scenarios/react/reactDebouncedEffect';
import { reactOptimisticUpdate }  from '@/data/scenarios/react/reactOptimisticUpdate';
import { reactMultiSelect }       from '@/data/scenarios/react/reactMultiSelect';
import { reactSearchFilter }      from '@/data/scenarios/react/reactSearchFilter';
import { codeReviewAuth }         from '@/data/scenarios/code-review/codeReviewAuth';
import { codeReviewNPlus1 }       from '@/data/scenarios/code-review/codeReviewNPlus1';
import { codeReviewRateLimit }    from '@/data/scenarios/code-review/codeReviewRateLimit';
import { systemOrderPipeline }    from '@/data/scenarios/systems/systemOrderPipeline';
import { systemAccessControl }    from '@/data/scenarios/systems/systemAccessControl';
import { systemMetricsAggregator }from '@/data/scenarios/systems/systemMetricsAggregator';

const pythonScenarios = [trie, lruCache, eventEmitter, logQueryFilter, csvParser, mergeIntervals, dependencyResolver];
const jsScenarios     = [featureFlags, rateLimiter, configParser, transactionRulesEngine];
const tsScenarios     = [middlewarePipeline, webhookEventRouter];
const sqlScenarios    = [sqlUserSpend, sqlLeaderboard, sqlRevenueReport, sqlCustomerLifetime, sqlFunnelAnalysis, sqlRunningTotals, sqlRetentionCohorts, sqlSpendSegmentation];
const reactScenarios      = [reactCartReducer, reactMemoize, reactEventSystem, reactStaleCounter, reactPaginatedFeed, reactDebouncedEffect, reactOptimisticUpdate, reactMultiSelect, reactSearchFilter];
const codeReviewScenarios  = [codeReviewAuth, codeReviewNPlus1, codeReviewRateLimit];
const systemsScenarios     = [systemOrderPipeline, systemAccessControl, systemMetricsAggregator];

export const SCENARIOS = [...pythonScenarios, ...jsScenarios, ...tsScenarios, ...sqlScenarios, ...reactScenarios, ...codeReviewScenarios, ...systemsScenarios];

export const TRACKS = [
  {
    id:          'python-debug',
    trackLabel:  'Python · Debug & Fix',
    title:       'Python Debugging',
    description: 'Read an unfamiliar implementation, locate the bug, and fix it. This is one of the most common live-coding format at top companies.',
    color:       '#e8774a',
    colorDim:    'rgba(232, 119, 74, 0.10)',
    scenarios:   pythonScenarios,
  },
  {
    id:          'js-build',
    trackLabel:  'JavaScript · Build',
    title:       'JavaScript Build-outs',
    description: 'Start from stubs and deliver a complete, tested implementation. This format is helpful for infrastructure and systems-design interviews.',
    color:       '#6b9fd4',
    colorDim:    'rgba(107, 159, 212, 0.10)',
    scenarios:   jsScenarios,
  },
  {
    id:          'ts-debug',
    trackLabel:  'TypeScript · Debug & Fix',
    title:       'TypeScript / Node.js Debugging',
    description: 'Fix bugs in async handlers, middleware chains, and type-narrowing logic.',
    color:       '#9b72cf',
    colorDim:    'rgba(155, 114, 207, 0.10)',
    scenarios:   tsScenarios,
  },
  {
    id:          'sql-analytics',
    trackLabel:  'SQL · Debug & Write',
    title:       'SQL Analytics',
    description: 'Debug broken queries and write analytical SQL from specs.',
    color:       '#4db87e',
    colorDim:    'rgba(77, 184, 126, 0.10)',
    scenarios:   sqlScenarios,
  },
  {
    id:          'react-hooks',
    trackLabel:  'React · Debug',
    title:       'React & Hooks',
    description: 'Find and fix bugs in reducer logic, memoization, event subscriptions, and closure-based state updates. Common at product companies.',
    color:       '#61dafb',
    colorDim:    'rgba(97, 218, 251, 0.10)',
    scenarios:   reactScenarios,
  },
  {
    id:          'code-review',
    trackLabel:  'Code Review · Bar Raiser',
    title:       'PR Code Review',
    description: 'Read a PR diff and identify correctness, security, and performance issues. No test running. Instead, AI grades the quality of your observations.',
    color:       '#f0c040',
    colorDim:    'rgba(240, 192, 64, 0.10)',
    scenarios:   codeReviewScenarios,
  },
  {
    id:          'systems-debug',
    trackLabel:  'Systems · Multi-File Debug',
    title:       'Large Codebase Debugging',
    description: 'Bugs that span multiple files and layers. Trace imports, follow call chains, and reason about how modules interact, the format used in senior-level and staff-level interviews.',
    color:       '#a78bfa',
    colorDim:    'rgba(167, 139, 250, 0.10)',
    scenarios:   systemsScenarios,
  },
];
