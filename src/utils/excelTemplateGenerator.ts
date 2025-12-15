import ExcelJS from 'exceljs';

// スタイル定義
const REQUIRED_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFF0000' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const OPTIONAL_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD3D3D3' } },
  font: { bold: true, color: { argb: 'FF000000' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const SEGMENT_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const LOCATION_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF548235' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const SAMPLE_ROW_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFA0A0A0' } },
  font: { italic: true, color: { argb: 'FF303030' }, name: 'Meiryo' },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

// 編集可能セル用スタイル（ロック解除）
const EDITABLE_CELL_STYLE = {
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } },
  font: { name: 'Meiryo' },
  protection: { locked: false }
};

export async function generateExcelTemplate(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UNIVERSEGEO';
  workbook.created = new Date();

  await createGuideSheet(workbook);
  await createProjectSheet(workbook);
  await createOptionsSheet(workbook); // 先にオプションシートを作って参照可能にする（順序は関係ないがロジック的に）
  await createSegmentAndLocationSheet(workbook);

  return workbook;
}

// シート1: 入力ガイド
async function createGuideSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('1.入力ガイド');
  const guideData = [
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],
    ['【UNIVERSEGEO 一括登録の使い方】'],
    ['━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'],
    [''],
    ['STEP 1: 「2.案件情報」シート'],
    ['　└─ 広告主、代理店、期間などを入力してください。'],
    [''],
    ['STEP 2: 「3.セグメント・地点設定」シート'],
    ['　└─ セグメント情報（青色列）と地点情報（緑色列）を同じ行に入力します。'],
    ['　└─ 1つのセグメントに複数の地点がある場合は、行を増やしてセグメント情報をコピーしてください。'],
    [''],
    ['⚠️ 注意事項'],
    ['・赤色ヘッダー = 必須項目'],
    ['・1行目（ヘッダー）は編集できません。2行目以降に入力してください。'],
    [''],
  ];
  guideData.forEach(row => {
    const r = sheet.addRow(row);
    r.font = { name: 'Meiryo', size: 11 };
  });
  sheet.getRow(2).font = { bold: true, size: 14, color: { argb: 'FF5b5fff' }, name: 'Meiryo' };
  sheet.getColumn(1).width = 100;
}

// シート2: 案件情報
async function createProjectSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('2.案件情報');
  const headers = [
    { name: '広告主名', required: true }, { name: '代理店名', required: true },
    { name: '訴求内容', required: true }, { name: '配信開始日', required: true },
    { name: '配信終了日', required: true }, { name: '備考', required: false }
  ];
  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.name;
    cell.style = h.required ? REQUIRED_HEADER_STYLE : OPTIONAL_HEADER_STYLE;
  });

  // サンプル行
  const sampleRow = sheet.getRow(2);
  sampleRow.values = ['サンプル株式会社', 'サンプル広告代理店', '新商品キャンペーン', '2024-01-01', '2024-01-31', 'サンプル'];
  for (let c = 1; c <= 6; c++) sampleRow.getCell(c).style = SAMPLE_ROW_STYLE;

  const maxRows = 1000;
  for (let r = 3; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).style = EDITABLE_CELL_STYLE;
    }
    row.getCell(1).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [100] };
    row.getCell(2).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [100] };
    row.getCell(3).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [200] };
    const dateVal: ExcelJS.DataValidationType = { type: 'date', operator: 'greaterThan', formulae: [new Date('2020-01-01')], showErrorMessage: true, error: 'YYYY-MM-DD形式' };
    row.getCell(4).dataValidation = dateVal; row.getCell(4).numFmt = 'yyyy-mm-dd';
    row.getCell(5).dataValidation = dateVal; row.getCell(5).numFmt = 'yyyy-mm-dd';
    row.getCell(6).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [500] };
  }
  sheet.columns = [{ width: 30 }, { width: 30 }, { width: 40 }, { width: 15 }, { width: 15 }, { width: 50 }];
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  await sheet.protect('password', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: true, deleteRows: true });
}

// シート3: セグメント・地点設定
async function createSegmentAndLocationSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('3.セグメント・地点設定');
  const headers = [
    { name: 'セグメント名', group: 'seg' }, { name: '配信先', group: 'seg' }, { name: '配信範囲', group: 'seg' },
    { name: '抽出期間', group: 'seg' }, { name: '抽出開始日', group: 'seg' }, { name: '抽出終了日', group: 'seg' },
    { name: '対象者', group: 'seg' }, { name: '検知回数', group: 'seg' }, { name: '検知時間開始', group: 'seg' },
    { name: '検知時間終了', group: 'seg' }, { name: '滞在時間', group: 'seg' },
    { name: '地点の名前', group: 'loc' }, { name: '住所', group: 'loc' }, { name: '緯度', group: 'loc' },
    { name: '経度', group: 'loc' }, { name: '地点ID', group: 'loc' }
  ];

  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.name;
    cell.style = h.group === 'seg' ? SEGMENT_HEADER_STYLE : LOCATION_HEADER_STYLE;
  });

  // サンプル行
  const sampleValues = [
    ['サンプル：東京エリア', 'UNIVERSEまたはTVer(SP)', '500m', '直近1ヶ月', '', '', '検知者', '3回以上', '09:00', '18:00', '10分以上', '東京タワー', '東京都港区芝公園4-2-8', 35.6585805, 139.7454329, 'TOWER001'],
    ['サンプル：東京エリア', 'UNIVERSEまたはTVer(SP)', '500m', '直近1ヶ月', '', '', '検知者', '3回以上', '09:00', '18:00', '10分以上', 'スカイツリー', '東京都墨田区押上1-1-2', 35.710063, 139.8107, 'SKY001']
  ];

  sampleValues.forEach((vals, idx) => {
    const r = sheet.getRow(idx + 2);
    r.values = vals;
    for (let c = 1; c <= 16; c++) r.getCell(c).style = SAMPLE_ROW_STYLE;
  });

  const maxRows = 1000;
  const optionsSheetName = '4.選択肢リスト';

  for (let r = 4; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 16; c++) {
      row.getCell(c).style = EDITABLE_CELL_STYLE;
    }

    // 入力規則（日本語を含むものはすべて別シート参照に変更して文字化け回避）
    // 1. セグメント名
    row.getCell(1).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [100], showErrorMessage: true, error: '100文字以内' };
    // 2. 配信先 (Option Col A)
    row.getCell(2).dataValidation = { type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$A$1:$A$2`] };
    // 3. 配信範囲 (ASCIIなので直接記述でもOKだが、念のため) -> ASCIIなので直接でOK
    row.getCell(3).dataValidation = { type: 'list', allowBlank: true, formulae: ['"50m,100m,150m,200m,250m,300m,350m,400m,450m,500m,550m,600m,650m,700m,750m,800m,850m,900m,950m,1000m,1500m,2000m,3000m,5000m,10000m"'] };
    // 4. 抽出期間 (Option Col B - 日本語あり)
    row.getCell(4).dataValidation = { type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$B$1:$B$7`] };
    // 5-6. 日付
    const dateVal: ExcelJS.DataValidationType = { type: 'date', operator: 'greaterThan', formulae: [new Date('2020-01-01')], showErrorMessage: true, error: 'YYYY-MM-DD形式' };
    row.getCell(5).dataValidation = dateVal; row.getCell(5).numFmt = 'yyyy-mm-dd';
    row.getCell(6).dataValidation = dateVal; row.getCell(6).numFmt = 'yyyy-mm-dd';
    // 7. 対象者 (Option Col C - 日本語あり・文字化け修正箇所)
    row.getCell(7).dataValidation = { type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$C$1:$C$3`] };
    // 8. 検知回数 (Option Col D - 日本語あり)
    row.getCell(8).dataValidation = { type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$D$1:$D$5`] };
    // 9-10. 時間
    const timeFormula = (c: string) => `OR(${c}="",AND(LEN(${c})=5,ISNUMBER(VALUE(LEFT(${c},2))),ISNUMBER(VALUE(RIGHT(${c},2))),MID(${c},3,1)=":"))`;
    row.getCell(9).dataValidation = { type: 'custom', formulae: [timeFormula(`I${r}`)], showErrorMessage: true, error: 'HH:MM' };
    row.getCell(10).dataValidation = { type: 'custom', formulae: [timeFormula(`J${r}`)], showErrorMessage: true, error: 'HH:MM' };
    // 11. 滞在時間 (Option Col E - 日本語あり)
    row.getCell(11).dataValidation = { type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$E$1:$E$5`] };

    // 地点情報
    row.getCell(12).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [100] };
    row.getCell(13).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [200] };
    row.getCell(14).dataValidation = { type: 'decimal', operator: 'between', formulae: [-90, 90] };
    row.getCell(15).dataValidation = { type: 'decimal', operator: 'between', formulae: [-180, 180] };
    row.getCell(16).dataValidation = { type: 'textLength', operator: 'lessThanOrEqual', formulae: [50] };
  }

  sheet.columns = [
    { width: 25 }, { width: 20 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 },
    { width: 15 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 12 },
    { width: 30 }, { width: 40 }, { width: 15 }, { width: 15 }, { width: 20 }
  ];

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  await sheet.protect('password', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: true, deleteRows: true });
}

async function createOptionsSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('4.選択肢リスト');
  sheet.state = 'hidden';

  // 列定義
  const options = {
    A: ['UNIVERSEまたはTVer(SP)', 'TVer(CTV)'], // 配信先
    B: ['直近1ヶ月', '直近2ヶ月', '直近3ヶ月', '直近4ヶ月', '直近5ヶ月', '直近6ヶ月', '期間指定'], // 抽出期間
    C: ['検知者', '居住者', '勤務者'], // 対象者
    D: ['1回以上', '2回以上', '3回以上', '4回以上', '5回以上'], // 検知回数
    E: ['3分以上', '5分以上', '10分以上', '15分以上', '30分以上'] // 滞在時間
  };

  // データの書き込み
  Object.entries(options).forEach(([col, values]) => {
    values.forEach((val, index) => {
      sheet.getCell(`${col}${index + 1}`).value = val;
    });
  });
}

export async function downloadExcelTemplate() {
  try {
    const workbook = await generateExcelTemplate();
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'UNIVERSEGEO_一括登録テンプレート_v3.4.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert('テンプレート作成失敗');
  }
}
