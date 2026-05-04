// Updates latest.json with new lotto rounds.
//
// Two modes:
//   1. Manual (workflow_dispatch with inputs) — adds the given round.
//   2. Automatic (cron) — tries dhlottery's official endpoint and appends
//      every successive round it can fetch. Silently no-ops if the API is
//      blocked or no new rounds are available.
//
// Run locally with `node scripts/update.js` from the repo root.

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'latest.json');
const API_BASE =
  'https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=';
const FETCH_TIMEOUT_MS = 10_000;
const MAX_AUTO_FETCH = 5;

function load() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function save(data) {
  data.lastUpdated = new Date().toISOString();
  data.rounds.sort((a, b) => b.round - a.round);
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2) + '\n',
    'utf-8',
  );
}

function nextRound(data) {
  return Math.max(...data.rounds.map((r) => r.round)) + 1;
}

function hasRound(data, round) {
  return data.rounds.some((r) => r.round === round);
}

function validateNumbers(numbers, bonus) {
  if (numbers.length !== 6) return false;
  if (new Set(numbers).size !== 6) return false;
  if (numbers.some((n) => n < 1 || n > 45)) return false;
  if (bonus < 1 || bonus > 45) return false;
  if (numbers.includes(bonus)) return false;
  return true;
}

async function fetchFromApi(round) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(`${API_BASE}${round}`, {
      signal: ctrl.signal,
      redirect: 'manual',
    });
    clearTimeout(timer);
    if (resp.status !== 200) return null;
    const ctype = resp.headers.get('content-type') || '';
    if (!ctype.includes('json')) return null;
    const json = await resp.json();
    if (json.returnValue !== 'success') return null;
    const numbers = [
      json.drwtNo1,
      json.drwtNo2,
      json.drwtNo3,
      json.drwtNo4,
      json.drwtNo5,
      json.drwtNo6,
    ].sort((a, b) => a - b);
    return {
      round,
      date: json.drwNoDate,
      numbers,
      bonus: json.bnusNo,
    };
  } catch (e) {
    return null;
  }
}

async function runManual(data) {
  const round = parseInt(process.env.MANUAL_ROUND, 10);
  const date = (process.env.MANUAL_DATE || '').trim();
  const numbersRaw = process.env.MANUAL_NUMBERS || '';
  const bonus = parseInt(process.env.MANUAL_BONUS, 10);

  if (!Number.isInteger(round) || round < 1) {
    throw new Error(`Invalid round: ${process.env.MANUAL_ROUND}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date (YYYY-MM-DD required): ${date}`);
  }
  const numbers = numbersRaw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .sort((a, b) => a - b);
  if (!validateNumbers(numbers, bonus)) {
    throw new Error(
      `Invalid numbers/bonus: numbers=${numbersRaw}, bonus=${process.env.MANUAL_BONUS}`,
    );
  }
  if (hasRound(data, round)) {
    console.log(`Round ${round} already present. Overwriting.`);
    data.rounds = data.rounds.filter((r) => r.round !== round);
  }
  data.rounds.push({ round, date, numbers, bonus });
  save(data);
  console.log(`Manually added round ${round}.`);
}

async function runAuto(data) {
  let added = 0;
  let round = nextRound(data);
  for (let i = 0; i < MAX_AUTO_FETCH; i++) {
    const r = await fetchFromApi(round);
    if (!r) break;
    data.rounds.push(r);
    added++;
    round++;
  }
  if (added > 0) {
    save(data);
    console.log(`Added ${added} round(s); latest is ${data.rounds[0].round}.`);
  } else {
    console.log(
      'No new rounds fetched. (API may be blocked, or no new draws yet.)',
    );
  }
}

(async () => {
  const data = load();
  if (process.env.MANUAL_ROUND) {
    await runManual(data);
  } else {
    await runAuto(data);
  }
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
