// Grants or revokes the admin role from the command line, against the database in
// apps/server/.env. This is how the first admin is made; admins can then manage
// everyone else from the admin pages.
//
//   npm run admin:grant -- <email>            make an existing account an admin
//   npm run admin:revoke -- <email>           make an admin a player again
//   npm run admin:list                        list the admins
//   (add --test to use TEST_DATABASE_URL)
import { auditRepository } from '../admin/audit-repository';
import { sessionsRepository } from '../auth/sessions-repository';
import { createDatabase } from '../platform/database';
import { usersRepository } from '../users/users-repository';
import '../platform/config';

const args = process.argv.slice(2);
const useTestDb = args.includes('--test');
const [command, rawEmail] = args.filter((arg) => arg !== '--test');
const url = useTestDb ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

function usage(): never {
  console.error('Usage: npm run admin:grant -- <email> | admin:revoke -- <email> | admin:list');
  process.exit(1);
}

if (!url) {
  console.error(`Set ${useTestDb ? 'TEST_DATABASE_URL' : 'DATABASE_URL'} in apps/server/.env`);
  process.exit(1);
}

const db = createDatabase(url);
const users = usersRepository(db);
const audit = auditRepository(db);

try {
  if (command === 'list') {
    const { users: admins } = await users.list({ role: 'admin', offset: 0, limit: 200 });
    if (admins.length === 0) console.log('No admins yet.');
    for (const admin of admins)
      console.log(`${admin.email}  ${admin.displayName}${admin.disabledAt ? '  (disabled)' : ''}`);
  } else if (command === 'grant' || command === 'revoke') {
    const email = rawEmail?.trim().toLowerCase();
    if (!email) usage();
    const user = await users.findByEmail(email);
    if (!user) {
      console.error(`No account with the email ${email}. Register it in Vector first.`);
      process.exitCode = 1;
    } else {
      const role = command === 'grant' ? 'admin' : 'player';
      if (user.role === role) {
        console.log(`${email} is already ${role === 'admin' ? 'an admin' : 'a player'}.`);
      } else {
        await users.update(user.id, { role });
        // A role change ends the account's sign-ins, so the new role applies everywhere.
        await sessionsRepository(db).revokeAllForUser(user.id);
        await audit.record(
          'command line',
          command === 'grant' ? 'admin.grant' : 'admin.revoke',
          email,
        );
        console.log(
          `${email} is now ${role === 'admin' ? 'an admin' : 'a player'}. Sign in again to use it.`,
        );
      }
    }
  } else {
    usage();
  }
} finally {
  await db.end();
}
