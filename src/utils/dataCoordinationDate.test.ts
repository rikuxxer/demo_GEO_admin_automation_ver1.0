/**
 * データ連携目途計算のテストケース
 * このファイルは実装確認用です
 */

import { calculateDataCoordinationDate } from './dataCoordinationDate';

// テストケース
const testCases = [
  {
    name: 'ケース1: 2024年11月18日（月）15:00',
    input: '2024-11-18T15:00:00+09:00',
    expected: '2024-11-20', // 月曜日 → 次の水曜日（11/20）
    description: '月曜日に依頼 → 次の月・水・金（水曜日）をそのまま返す',
  },
  {
    name: 'ケース2: 2024年11月19日（火）10:00',
    input: '2024-11-19T10:00:00+09:00',
    expected: '2024-11-21', // 火曜日 → 次の水曜日（11/20）+ 1営業日 = 11/21（木）
    description: '火曜日に依頼 → 次の月・水・金（水曜日）+ 1営業日 = 木曜日',
  },
  {
    name: 'ケース3: 2024年11月18日（月）21:00（20時以降なので翌日扱い）',
    input: '2024-11-18T21:00:00+09:00',
    expected: '2024-11-21', // 翌日11/19（火）→ 次の水曜日（11/20）+ 1営業日 = 11/21（木）
    description: '月曜日21時 → 翌日火曜日扱い → 次の月・水・金（水曜日）+ 1営業日 = 木曜日',
  },
  {
    name: 'ケース4: 2024年11月22日（金）19:00',
    input: '2024-11-22T19:00:00+09:00',
    expected: '2024-11-25', // 金曜日 → 次の月曜日（11/25）
    description: '金曜日に依頼 → 次の月・水・金（月曜日）をそのまま返す',
  },
  {
    name: 'ケース5: 2024年11月20日（水）14:00',
    input: '2024-11-20T14:00:00+09:00',
    expected: '2024-11-22', // 水曜日 → 次の金曜日（11/22）
    description: '水曜日に依頼 → 次の月・水・金（金曜日）をそのまま返す',
  },
  {
    name: 'ケース6: 2024年11月21日（木）16:00',
    input: '2024-11-21T16:00:00+09:00',
    expected: '2024-11-25', // 木曜日 → 次の金曜日（11/22）+ 1営業日 = 11/25（月）
    description: '木曜日に依頼 → 次の月・水・金（金曜日）+ 1営業日 = 月曜日',
  },
];

console.log('=== データ連携目途計算テスト ===\n');

testCases.forEach((testCase) => {
  const result = calculateDataCoordinationDate(testCase.input);
  const isMatch = result === testCase.expected;
  
  console.log(`${testCase.name}`);
  console.log(`  説明: ${testCase.description}`);
  console.log(`  入力: ${testCase.input}`);
  console.log(`  期待値: ${testCase.expected}`);
  console.log(`  実際: ${result}`);
  console.log(`  結果: ${isMatch ? '✓ OK' : '✗ NG'}\n`);
});
