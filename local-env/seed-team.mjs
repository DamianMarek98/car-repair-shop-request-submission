#!/usr/bin/env node
// Seeds the Zespół/Urlopy test scenario (spec/05-team-and-leave-plan.md §6.0) into the LOCAL shop
// backend through its API. Expected numbers assume the backend runs with the clock pinned:
//   CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02 npm run local:shop
// Run once per `npm run local:up` - LocalStack starts empty every time. Node >= 18, no dependencies.

const API = process.env.SHOP_API ?? 'http://localhost:8080/api';
const SCENARIO_TODAY = '2026-11-02';

// Order matters: typed pools are set before leave, so Joanna's overdraw warning fires.
const WORKERS = [
  { first: 'Tomasz', last: 'Nowak', days: 26, pools: { 2026: 9, 2027: 30 },
    leave: [['2026-10-20', '2026-10-23'], ['2026-12-28', '2027-01-08']] },
  { first: 'Katarzyna', last: 'Wiśniewska', days: 26, pools: {},
    leave: [['2026-10-19', '2026-10-23'], ['2026-11-16', '2026-11-20']] },
  { first: 'Marek', last: 'Zieliński', days: 20, pools: {}, leave: [['2026-10-28', '2026-11-06']] },
  { first: 'Joanna', last: 'Lewandowska', days: 26, pools: { 2026: 3 }, leave: [['2026-11-16', '2026-11-20']] },
  { first: 'Piotr', last: 'Kamiński', days: 26, pools: {}, leave: [['2026-11-09', '2026-11-13']] },
  { first: 'Agnieszka', last: 'Dąbrowska', days: 20, pools: {}, leave: [] },
  { first: 'Krzysztof', last: 'Wójcik', days: 26, pools: {}, leave: [['2026-11-16', '2026-11-20']] },
  { first: 'Michał', last: 'Szymański', days: 26, pools: {},
    leave: [['2026-11-16', '2026-11-18'], ['2026-11-19', '2026-11-20']] },
];

let token;

async function call(method, path, body) {
  const response = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    console.error(`✗ ${method} ${path} -> ${response.status}\n${text}`);
    process.exit(1);
  }
  return text ? JSON.parse(text) : undefined;
}

async function main() {
  try {
    ({ token } = await call('POST', '/internal/login', { username: 'renocar', password: '12345' }));
  } catch (error) {
    console.error(`✗ Can't reach the shop at ${API} - is \`npm run local:shop\` running? (${error.message})`);
    process.exit(1);
  }

  const before = await call('GET', '/internal/team/employees');
  if (before.employees.length > 0) {
    console.error(`✗ ${before.employees.length} employee(s) already exist - seed only a fresh environment ` +
      '(npm run local:down && npm run local:up).');
    process.exit(1);
  }
  if (before.today !== SCENARIO_TODAY) {
    console.warn(`! Backend "today" is ${before.today}, not ${SCENARIO_TODAY} - the expected numbers in the plan ` +
      'will not match. Start the shop with CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02.');
  }

  let warnings = 0;
  for (const worker of WORKERS) {
    const employee = await call('POST', '/internal/team/employees',
      { firstName: worker.first, lastName: worker.last, defaultAnnualDays: worker.days });
    for (const [year, days] of Object.entries(worker.pools)) {
      await call('PUT', `/internal/team/employees/${employee.id}/pool/${year}`, { days });
    }
    console.log(`+ ${worker.first} ${worker.last} (default ${worker.days}, colour ${employee.colorIndex})`);

    for (const [startDate, endDate] of worker.leave) {
      const result = await call('POST', '/internal/team/leaves', { employeeId: employee.id, startDate, endDate });
      console.log(`    leave ${startDate} – ${endDate}: ${result.leave.workingDays} working day(s)`);
      for (const warning of result.warnings) {
        warnings++;
        console.log(`    ! ${warning.code} ${warning.year}: remaining ${warning.remaining}`);
      }
    }
  }

  console.log(`\nSeeded ${WORKERS.length} workers, ${warnings} warning(s) (expected: 1, Joanna 2026 −2).`);
  console.log('Open http://localhost:4201 (renocar / 12345) or compare with plan §6.0.');
}

main();
