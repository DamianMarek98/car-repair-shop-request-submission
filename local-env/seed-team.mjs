#!/usr/bin/env node
// Seeds the Zespół/Urlopy test scenario (spec/05-team-and-leave-plan.md §6.0, plus the medical / BHP
// dates of spec/05-team-medical-and-bhp-dates-plan.md §6.0) into the LOCAL shop
// backend through its API. Expected numbers assume the backend runs with the clock pinned:
//   CAR_REPAIR_SHOP_CLOCK_FIXEDDATE=2026-11-02 npm run local:shop
// Run once per `npm run local:up` - LocalStack starts empty every time. Node >= 18, no dependencies.

const API = process.env.SHOP_API ?? 'http://localhost:8080/api';
const SCENARIO_TODAY = '2026-11-02';

// Order matters: typed pools are set before leave, so Joanna's overdraw warning fires.
// med / bhp = "valid until" dates; expected colours on 2026-11-02 (+1 month = 2026-12-02, +3 = 2027-02-02)
// are in the medical/BHP plan §6.0. null = no date (grey "—").
const WORKERS = [
  { first: 'Tomasz', last: 'Nowak', days: 26, pools: { 2026: 9, 2027: 30 },
    leave: [['2026-10-20', '2026-10-23'], ['2026-12-28', '2027-01-08']],
    med: '2027-08-15', bhp: '2026-12-03' },   // OK · yellow "za 31 dni"
  { first: 'Katarzyna', last: 'Wiśniewska', days: 26, pools: {},
    leave: [['2026-10-19', '2026-10-23'], ['2026-11-16', '2026-11-20']],
    med: '2026-11-10', bhp: '2028-03-01' },   // red "za 8 dni" · OK
  { first: 'Marek', last: 'Zieliński', days: 20, pools: {}, leave: [['2026-10-28', '2026-11-06']],
    med: '2026-12-02', bhp: '2027-02-01' },   // yellow (exactly 1 month) · yellow (last yellow day)
  { first: 'Joanna', last: 'Lewandowska', days: 26, pools: { 2026: 3 }, leave: [['2026-11-16', '2026-11-20']],
    med: '2027-02-02', bhp: '2026-11-03' },   // OK (exactly 3 months) · red "za 1 dzień"
  { first: 'Piotr', last: 'Kamiński', days: 26, pools: {}, leave: [['2026-11-09', '2026-11-13']],
    med: null, bhp: null },                   // grey · grey
  { first: 'Agnieszka', last: 'Dąbrowska', days: 20, pools: {}, leave: [],
    med: '2026-12-01', bhp: '2027-06-01' },   // red "za 29 dni" (last red day) · OK
  { first: 'Krzysztof', last: 'Wójcik', days: 26, pools: {}, leave: [['2026-11-16', '2026-11-20']],
    med: '2027-03-18', bhp: '2028-06-01' },   // OK · OK
  { first: 'Michał', last: 'Szymański', days: 26, pools: {},
    leave: [['2026-11-16', '2026-11-18'], ['2026-11-19', '2026-11-20']],
    med: null, bhp: '2027-10-10' },           // grey · OK
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
      { firstName: worker.first, lastName: worker.last, defaultAnnualDays: worker.days,
        medicalExamValidUntil: worker.med, bhpTrainingValidUntil: worker.bhp });
    for (const [year, days] of Object.entries(worker.pools)) {
      await call('PUT', `/internal/team/employees/${employee.id}/pool/${year}`, { days });
    }
    console.log(`+ ${worker.first} ${worker.last} (default ${worker.days}, colour ${employee.colorIndex}, ` +
      `badania ${employee.medicalExamValidUntil ?? '—'}, BHP ${employee.bhpTrainingValidUntil ?? '—'})`);

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
