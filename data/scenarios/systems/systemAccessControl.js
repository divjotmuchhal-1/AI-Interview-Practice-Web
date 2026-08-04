// ─── Role-Based Access Control ────────────────────────────────────────────────
// Inspired by: Google, Stripe, GitHub permissions service interviews

const STARTER = {
  'gateway.js': `const { resolveUser }        = require('./userStore');
const { resolveMemberships } = require('./membershipService');
const { resolveRoles }       = require('./roleRegistry');
const { checkPermission }    = require('./permissionService');

/**
 * Central access-check entry point.
 *
 * @param {string} userId
 * @param {string} resource  e.g. 'posts'
 * @param {string} action    e.g. 'read'
 * @param {Object} db
 *   db.users       : { [userId]: {} }
 *   db.memberships : Array<{ userId: string, group: string }>
 * @returns {{ granted: boolean, reason: string }}
 */
function checkAccess(userId, resource, action, db) {
  const user = resolveUser(userId, db);
  if (!user) {
    return { granted: false, reason: \`User '\${userId}' not found\` };
  }

  const groups     = resolveMemberships(userId, db);
  const roles      = resolveRoles(groups);
  const permission = \`\${resource}:\${action}\`;
  const granted    = checkPermission(roles, permission);

  return {
    granted,
    reason: granted ? '' : \`No role grants '\${permission}' for user '\${userId}'\`,
  };
}

module.exports = { checkAccess };
`,

  'userStore.js': `/**
 * Looks up a user record from the in-memory directory.
 * Returns null if the user does not exist.
 *
 * @param {string} userId
 * @param {{ users: Object }} db
 */
function resolveUser(userId, db) {
  return (db.users ?? {})[userId] ?? null;
}

module.exports = { resolveUser };
`,

  'membershipService.js': `/**
 * Returns the list of group names the given user belongs to.
 *
 * @param {string} userId
 * @param {{ memberships: Array<{userId: string, group: string}> }} db
 * @returns {string[]}
 */
function resolveMemberships(userId, db) {
  return (db.memberships ?? [])
    .filter(m => m.userId === userId)
    .map(m => m.userId);
}

module.exports = { resolveMemberships };
`,

  'roleRegistry.js': `const GROUP_ROLES = {
  viewers:    'viewer',
  editors:    'editor',
  moderators: 'moderator',
  admins:     'admin',
};

/**
 * Maps an array of group names to their corresponding role identifiers.
 * Groups absent from the registry are silently dropped.
 *
 * @param {string[]} groups
 * @returns {string[]}
 */
function resolveRoles(groups) {
  return groups.map(g => GROUP_ROLES[g]).filter(Boolean);
}

module.exports = { resolveRoles };
`,

  'permissionService.js': `const ROLE_PERMISSIONS = require('./policyStore');

/**
 * Returns true if at least one of the given roles holds the requested permission.
 *
 * @param {string[]} roles
 * @param {string}   permission  e.g. 'posts:read'
 */
function checkPermission(roles, permission) {
  return roles.some(role => {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes(permission);
  });
}

module.exports = { checkPermission };
`,

  'policyStore.js': `/**
 * Static role → permission mapping.
 * Permissions follow the pattern  resource:action.
 */
module.exports = {
  viewer:    ['posts:read'],
  editor:    ['posts:read', 'posts:write', 'posts:edit'],
  moderator: ['posts:read', 'posts:edit', 'posts:delete'],
  admin:     ['posts:read', 'posts:write', 'posts:edit', 'posts:delete', 'admin:access'],
};
`,
};

const README = `# Role-Based Access Control

## Background

\`checkAccess(userId, resource, action, db)\` in \`gateway.js\` enforces role-based access control: users belong to groups, groups map to roles, and roles carry permission strings of the form \`resource:action\`. It returns \`{ granted, reason }\`, where \`reason\` is an empty string when access is granted.

\`\`\`
gateway.js           ← entry point; orchestrates the full access check
userStore.js         ← looks up a user record from the directory
membershipService.js ← resolves which groups the user belongs to
roleRegistry.js      ← maps group names to role identifiers
permissionService.js ← tests whether any of the user's roles hold the permission
policyStore.js       ← static role → permission mapping
\`\`\`

**The \`db\` object passed to \`checkAccess\`:**
\`\`\`js
{
  users:       { alice: {}, bob: {}, carol: {}, dave: {} },
  memberships: [
    { userId: 'alice', group: 'editors'    },
    { userId: 'bob',   group: 'viewers'    },
    { userId: 'carol', group: 'moderators' },
    { userId: 'dave',  group: 'admins'     },
  ],
}
\`\`\`

## Bug Report

Every user is denied every permission, even when their group maps to a role that grants it. Alice is in \`editors\` but \`posts:read\` is denied. Bob is in \`viewers\` and \`posts:read\` is denied for him too. Unknown users are still rejected with the correct \`User '<id>' not found\` reason.

## What to Implement

- Locate the defect and fix it so **\`checkAccess(userId, resource, action, db)\`** grants and denies access according to the membership, role, and policy data. The bug may be in any module; the tests call only \`checkAccess\`.`;

const ANSWER = `**Bug: \`membershipService.js\`, \`resolveMemberships\`:**

\`\`\`js
// Buggy: maps each membership to the userId instead of the group name
return (db.memberships ?? [])
  .filter(m => m.userId === userId)
  .map(m => m.userId);          // returns ['alice'], not a valid group name

// Fixed
return (db.memberships ?? [])
  .filter(m => m.userId === userId)
  .map(m => m.group);           // returns ['editors'], a valid group name
\`\`\`

The \`.map\` callback reads \`m.userId\` (the user's own ID) instead of \`m.group\`.
For Alice the function returns \`['alice']\`; \`roleRegistry.js\` looks up
\`GROUP_ROLES['alice']\`, finds nothing, and returns an empty array.
Empty roles → empty permissions → every access check returns \`granted: false\`.

The bug is in \`membershipService.js\`. You have to trace
\`gateway.js\` → \`resolveMemberships\` → notice the returned values are user IDs, not group names →
then follow into \`roleRegistry.js\` to confirm why \`resolveRoles\` always returns \`[]\`.`;

const FIXED_MEMBERSHIP_SERVICE = `/**
 * Returns the list of group names the given user belongs to.
 *
 * @param {string} userId
 * @param {{ memberships: Array<{userId: string, group: string}> }} db
 * @returns {string[]}
 */
function resolveMemberships(userId, db) {
  return (db.memberships ?? [])
    .filter(m => m.userId === userId)
    .map(m => m.group);
}

module.exports = { resolveMemberships };
`;

const BASE_DB = {
  users: { alice: {}, bob: {}, carol: {}, dave: {} },
  memberships: [
    { userId: 'alice', group: 'editors'    },
    { userId: 'bob',   group: 'viewers'    },
    { userId: 'carol', group: 'moderators' },
    { userId: 'dave',  group: 'admins'     },
  ],
};

export const systemAccessControl = {
  id:              'system-access-control',
  type:            'systems-debug',
  title:           'Role-Based Access Control',
  difficulty:      'Medium',
  description:     'Every user is denied all permissions regardless of their role. Trace through a six-module RBAC stack to find why group resolution silently returns the wrong data.',
  durationMinutes: 30,
  tags:            ['multi-file', 'debugging', 'auth'],

  testRunner: {
    language:     'javascript',
    entryFile:    'gateway.js',
    functionName: 'checkAccess',
    inputKeys:    ['userId', 'resource', 'action', 'db'],
  },

  parts: [
    {
      title:       'Find the group-resolution bug',
      readme:      README,
      answer:      ANSWER,
      answerFiles: { ...STARTER, 'membershipService.js': FIXED_MEMBERSHIP_SERVICE },
      starterFiles: STARTER,

      visibleTests: [
        {
          description: 'alice (editor) should be granted posts:read',
          input: { userId: 'alice', resource: 'posts', action: 'read', db: BASE_DB },
          expectedOutput: { granted: true, reason: '' },
        },
        {
          description: 'bob (viewer) should be denied posts:write',
          input: { userId: 'bob', resource: 'posts', action: 'write', db: BASE_DB },
          expectedOutput: { granted: false, reason: "No role grants 'posts:write' for user 'bob'" },
        },
      ],

      hiddenTests: [
        {
          description: 'bob (viewer) should be granted posts:read',
          input: { userId: 'bob', resource: 'posts', action: 'read', db: BASE_DB },
          expectedOutput: { granted: true, reason: '' },
        },
        {
          description: 'alice (editor) should be granted posts:write',
          input: { userId: 'alice', resource: 'posts', action: 'write', db: BASE_DB },
          expectedOutput: { granted: true, reason: '' },
        },
        {
          description: 'carol (moderator) should be granted posts:delete',
          input: { userId: 'carol', resource: 'posts', action: 'delete', db: BASE_DB },
          expectedOutput: { granted: true, reason: '' },
        },
        {
          description: 'dave (admin) should be granted admin:access',
          input: { userId: 'dave', resource: 'admin', action: 'access', db: BASE_DB },
          expectedOutput: { granted: true, reason: '' },
        },
        {
          description: 'unknown user is rejected gracefully',
          input: { userId: 'ghost', resource: 'posts', action: 'read', db: BASE_DB },
          expectedOutput: { granted: false, reason: "User 'ghost' not found" },
        },
        {
          description: 'carol (moderator) should be denied posts:write (not in moderator policy)',
          input: { userId: 'carol', resource: 'posts', action: 'write', db: BASE_DB },
          expectedOutput: { granted: false, reason: "No role grants 'posts:write' for user 'carol'" },
        },
      ],
    },
  ],
};
