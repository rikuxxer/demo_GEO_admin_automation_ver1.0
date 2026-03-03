import ExcelJS from 'exceljs';

// スタイル定義
const REQUIRED_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A8A' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const OPTIONAL_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDBEAFE' } },
  font: { bold: true, color: { argb: 'FF1E3A8A' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const SEGMENT_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1D4ED8' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const LOCATION_HEADER_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } },
  font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Meiryo' },
  alignment: { horizontal: 'center' as const, vertical: 'middle' as const, wrapText: true },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } }
};

const SAMPLE_ROW_STYLE = {
  fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFF6FF' } },
  font: { italic: true, color: { argb: 'FF1E3A8A' }, name: 'Meiryo' },
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } },
  protection: { locked: true }
};

// 編集可能セル用スタイル（ロック解除）
const EDITABLE_CELL_STYLE = {
  border: { top: { style: 'thin' as const }, left: { style: 'thin' as const }, bottom: { style: 'thin' as const }, right: { style: 'thin' as const } },
  font: { name: 'Meiryo' },
  protection: { locked: false }
};

function applySheetDefaults(sheet: ExcelJS.Worksheet) {
  sheet.properties.defaultRowHeight = 18;
  sheet.properties.defaultColWidth = 15;
}

export async function generateExcelTemplate(): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UNIVERSEGEO';
  workbook.created = new Date();

  await createGuideSheet(workbook);
  await createProjectSheet(workbook);
  await createOptionsSheet(workbook); // 先にオプションシートを作って参照可能にする（順序は関係ないがロジック的に）
  await createSegmentAndLocationSheet(workbook, 'tg'); // TG地点用（セグメント＋地点）
  await createVisitMeasurementLocationSheet(workbook); // 来店計測地点用（地点のみ）

  return workbook;
}

// シート1: 入力ガイド
async function createGuideSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('1.入力ガイド');
  applySheetDefaults(sheet);

  const guideData = [
    ['【UNIVERSEGEO 一括登録の使い方】'],                                              // row 1: title
    [''],
    ['【重要】このテンプレートでは1案件のみ登録できます'],                               // row 3: warning
    ['　└─ 複数案件を登録する場合は、案件ごとにExcelファイルを分けてください。'],
    [''],
    ['STEP 1: 「2.案件情報」シート'],
    ['　└─ 広告主、代理店、期間などを3行目に入力してください（1案件のみ）。'],
    [''],
    ['STEP 2: 地点の種類に応じてシートを選択'],
    ['　├─ 「3.セグメント・TG地点設定」シート'],
    ['　│　└─ ターゲティング用の地点を登録（セグメント＋地点）'],
    ['　└─ 「4.来店計測地点リスト」シート'],
    ['　　　└─ 来店計測用の地点を登録（地点のみ、セグメント不要）'],
    [''],
    ['■ シート3（TG地点）の使い方'],                                                    // row 15: section heading
    ['　└─ セグメント情報（青色列）と地点情報（緑色列）を同じ行に入力します。'],
    ['　└─ 1つのセグメントに複数の地点がある場合は、行を増やしてセグメント情報をコピーしてください。'],
    ['　└─ 地点の名前と住所は必須、緯度経度は任意です（未入力の場合は自動変換されます）'],
    [''],
    ['■ シート4（来店計測地点）の使い方'],                                              // row 20: section heading
    ['　└─ 地点情報のみを入力します（セグメント情報は不要です）'],
    ['　└─ プロジェクトに直接紐づく来店計測用の地点として登録されます。'],
    ['　└─ 地点の名前と住所は必須、緯度経度は任意です（未入力の場合は自動変換されます）'],
    ['　└─ グループ番号（1, 2, 3...）で地点をグループ分けします。同じ番号の地点が同じグループに登録されます'],
    [''],
    ['【注意事項】'],                                                                    // row 26: warning heading
    ['・このテンプレートでは【1案件のみ】登録可能です。'],
    ['・青色の濃いヘッダー（必須）＝必須項目'],
    ['・地点ID：自動採番されるため入力不要です'],
    ['・緯度経度：任意項目です。未入力の場合は住所から自動的に変換されます'],
    ['・指定半径：1〜1000mは数値で自由入力（例: 500）、1001m以上はプルダウンから選択'],
    ['・1行目（ヘッダー）は編集できません。サンプル行を参考に入力行に入力してください。'],
    ['・TG地点と来店計測地点は別々のシートに入力してください。'],
    ['・来店計測地点はセグメントに紐づかず、案件全体で管理されます。'],
    [''],
    ['■ 対象者による入力制限'],                                                         // row 35: section heading
    ['・対象者が「検知者」の場合：抽出期間、検知回数、検知時間、滞在時間を自由に設定可能'],
    ['・対象者が「居住者」「勤務者」「居住者&勤務者」の場合：'],
    [''],
  ];

  guideData.forEach(row => {
    const r = sheet.addRow(row);
    r.font = { name: 'Meiryo', size: 11 };
  });

  // Row 1: タイトル（紫背景・白文字・太字）
  sheet.getRow(1).getCell(1).style = {
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B5FFF' } },
    font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Meiryo' },
    alignment: { vertical: 'middle', horizontal: 'left' }
  };
  sheet.getRow(1).height = 28;

  // Row 3, 26: 注意見出し（黄背景・太字）
  const warningHeadingStyle = {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF3CD' } },
    font: { bold: true, size: 11, name: 'Meiryo' }
  };
  sheet.getRow(3).getCell(1).style = warningHeadingStyle;
  sheet.getRow(26).getCell(1).style = warningHeadingStyle;

  // Row 15, 20, 36: セクション見出し（淡青背景・グレー文字・太字）
  const sectionHeadingStyle = {
    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEEF2FF' } },
    font: { bold: true, size: 11, color: { argb: 'FF374151' }, name: 'Meiryo' }
  };
  [15, 20, 36].forEach(rowNum => {
    sheet.getRow(rowNum).getCell(1).style = sectionHeadingStyle;
  });

  sheet.getColumn(1).width = 100;
}

// シート2: 案件情報（1案件のみ登録可能）
async function createProjectSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('2.案件情報');
  applySheetDefaults(sheet);
  const headers = [
    { name: '広告主名（必須）', required: true }, { name: '代理店名（必須）', required: true },
    { name: '訴求内容（必須）', required: true }, { name: '配信開始日（必須）', required: true },
    { name: '配信終了日（必須）', required: true }, { name: '備考', required: false }
  ];
  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.name;
    cell.style = h.required ? REQUIRED_HEADER_STYLE : OPTIONAL_HEADER_STYLE;
  });
  headerRow.height = 22;

  // サンプル行
  const sampleRow = sheet.getRow(2);
  sampleRow.values = ['サンプル株式会社', 'サンプル広告代理店', '新商品キャンペーン', '2024-01-01', '2024-01-31', 'サンプル'];
  for (let c = 1; c <= 6; c++) sampleRow.getCell(c).style = SAMPLE_ROW_STYLE;

  // 入力行（3行目のみ：1案件のみ登録可能）
  const inputRow = sheet.getRow(3);
  for (let c = 1; c <= 6; c++) {
    inputRow.getCell(c).style = EDITABLE_CELL_STYLE;
  }
  inputRow.getCell(1).dataValidation = {
    type: 'textLength', operator: 'lessThanOrEqual', formulae: [100],
    showInputMessage: true, promptTitle: '広告主名（必須）', prompt: '100文字以内で入力してください'
  };
  inputRow.getCell(2).dataValidation = {
    type: 'textLength', operator: 'lessThanOrEqual', formulae: [100],
    showInputMessage: true, promptTitle: '代理店名（必須）', prompt: '100文字以内で入力してください'
  };
  inputRow.getCell(3).dataValidation = {
    type: 'textLength', operator: 'lessThanOrEqual', formulae: [200],
    showInputMessage: true, promptTitle: '訴求内容（必須）', prompt: '200文字以内で入力してください'
  };
  inputRow.getCell(4).dataValidation = {
    type: 'date', operator: 'greaterThan', formulae: [new Date('2020-01-01')],
    showErrorMessage: true, error: 'YYYY-MM-DD形式',
    showInputMessage: true, promptTitle: '配信開始日（必須）', prompt: 'YYYY-MM-DD 形式で入力してください\n例: 2024-01-15'
  };
  inputRow.getCell(4).numFmt = 'yyyy-mm-dd';
  inputRow.getCell(5).dataValidation = {
    type: 'date', operator: 'greaterThan', formulae: [new Date('2020-01-01')],
    showErrorMessage: true, error: 'YYYY-MM-DD形式',
    showInputMessage: true, promptTitle: '配信終了日（必須）', prompt: 'YYYY-MM-DD 形式で入力してください\n配信開始日以降の日付を入力'
  };
  inputRow.getCell(5).numFmt = 'yyyy-mm-dd';
  inputRow.getCell(6).dataValidation = {
    type: 'textLength', operator: 'lessThanOrEqual', formulae: [500],
    showInputMessage: true, promptTitle: '備考（任意）', prompt: '500文字以内。空白でも可'
  };

  // 注意書き（4行目）
  const noteRow = sheet.getRow(4);
  noteRow.getCell(1).value = '【注意】このシートでは1案件のみ登録できます。複数案件を登録する場合は、案件ごとにファイルを分けてください。';
  noteRow.getCell(1).style = {
    font: { name: 'Meiryo', size: 10, color: { argb: 'FF1E3A8A' }, bold: true },
    alignment: { vertical: 'middle', horizontal: 'left' },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } }
  };
  sheet.mergeCells('A4:F4');

  sheet.columns = [{ width: 30 }, { width: 30 }, { width: 40 }, { width: 18 }, { width: 18 }, { width: 50 }];
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  await sheet.protect('password', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: false, deleteRows: false });
}

// シート3: セグメント・TG地点設定
async function createSegmentAndLocationSheet(workbook: ExcelJS.Workbook, category: 'tg') {
  const sheet = workbook.addWorksheet('3.セグメント・TG地点設定');
  applySheetDefaults(sheet);
  const headers = [
    { name: 'セグメント名（必須）', group: 'seg', required: true }, { name: '配信先（必須）', group: 'seg', required: true }, { name: '指定半径（必須）', group: 'seg', required: true },
    { name: '抽出期間', group: 'seg', required: false }, { name: '抽出開始日', group: 'seg', required: false }, { name: '抽出終了日', group: 'seg', required: false },
    { name: '対象者（必須）', group: 'seg', required: true }, { name: '検知回数（検知者のみ）', group: 'seg', required: false }, { name: '検知時間開始', group: 'seg', required: false },
    { name: '検知時間終了', group: 'seg', required: false }, { name: '滞在時間', group: 'seg', required: false },
    { name: '地点の名前（必須）', group: 'loc', required: true }, { name: '住所（必須）', group: 'loc', required: true }, { name: '緯度（任意）', group: 'loc', required: false },
    { name: '経度（任意）', group: 'loc', required: false }
  ];

  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.name;
    cell.style = h.required ? REQUIRED_HEADER_STYLE : (h.group === 'seg' ? SEGMENT_HEADER_STYLE : LOCATION_HEADER_STYLE);
  });
  headerRow.height = 30;

  // 列幅・numFmt をループ前に設定（sheet.columns = [...] はセルスタイルをリセットするため使用禁止）
  sheet.getColumn(1).width = 25;   // A: セグメント名
  sheet.getColumn(2).width = 20;   // B: 配信先
  sheet.getColumn(3).width = 14;   // C: 配信範囲
  sheet.getColumn(4).width = 15;   // D: 抽出期間
  sheet.getColumn(5).width = 15;   // E: 抽出開始日
  sheet.getColumn(5).numFmt = 'yyyy-mm-dd';
  sheet.getColumn(6).width = 15;   // F: 抽出終了日
  sheet.getColumn(6).numFmt = 'yyyy-mm-dd';
  sheet.getColumn(7).width = 15;   // G: 対象者
  sheet.getColumn(8).width = 18;   // H: 検知回数（検知者のみ）
  sheet.getColumn(9).width = 14;   // I: 検知時間開始
  sheet.getColumn(10).width = 14;  // J: 検知時間終了
  sheet.getColumn(11).width = 12;  // K: 滞在時間
  sheet.getColumn(12).width = 30;  // L: 地点の名前
  sheet.getColumn(13).width = 40;  // M: 住所
  sheet.getColumn(14).width = 15;  // N: 緯度
  sheet.getColumn(15).width = 15;  // O: 経度

  // サンプル行（地点IDは自動採番のため削除）
  const sampleValues = [
    ['サンプル：東京エリア', 'UNIVERSEまたはTVer(SP)', 500, '直近1ヶ月', '', '', '検知者', '3回以上', '09:00', '18:00', '10分以上', '東京タワー', '東京都港区芝公園4-2-8', 35.6585805, 139.7454329],
    ['サンプル：大阪エリア', 'UNIVERSEまたはTVer(SP)', 500, '直近3ヶ月', '', '', '居住者', '3回以上', '', '', '', '通天閣', '大阪府大阪市浪速区恵美須東1-18-6', 34.6523, 135.5061]
  ];

  sampleValues.forEach((vals, idx) => {
    const r = sheet.getRow(idx + 2);
    r.values = vals;
    for (let c = 1; c <= 15; c++) r.getCell(c).style = SAMPLE_ROW_STYLE;
  });

  const maxRows = 1000;
  const optionsSheetName = '5.選択肢リスト';

  for (let r = 4; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 15; c++) {
      row.getCell(c).style = EDITABLE_CELL_STYLE;
    }

    // 入力規則（日本語を含むものはすべて別シート参照に変更して文字化け回避）
    // 1. セグメント名
    row.getCell(1).dataValidation = {
      type: 'textLength', operator: 'lessThanOrEqual', formulae: [100],
      showErrorMessage: true, error: '100文字以内',
      showInputMessage: true, promptTitle: 'セグメント名（必須）', prompt: '100文字以内。同一ファイル内で重複不可'
    };
    // 2. 配信先 (Option Col A)
    row.getCell(2).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$A$1:$A$2`],
      showInputMessage: true, promptTitle: '配信先（必須）', prompt: 'プルダウンから選択してください\n※ TVer(CTV)は他の媒体と同時選択不可'
    };
    // 3. 配信範囲 (1-1000は自由入力、1000以上は選択肢)
    row.getCell(3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`'${optionsSheetName}'!$F$1:$F$14`],
      showErrorMessage: false,
      showInputMessage: true, promptTitle: '指定半径（必須）', prompt: '1〜1000m: 数値のみ入力（例: 500）\n1001m以上: プルダウンから選択'
    };
    // 4. 抽出期間 (Option Col B - 日本語あり)
    // プルダウンで選択可能（対象者が「居住者」等の場合はパーサー側で「直近3ヶ月」に強制変換）
    row.getCell(4).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$B$1:$B$7`],
      showInputMessage: true, promptTitle: '抽出期間', prompt: '検知者: プルダウンから選択\n居住者・勤務者: 自動的に「直近3ヶ月」に設定されます'
    };

    // 5-6. 日付（対象者が「検知者」かつ抽出期間が「期間指定」の場合のみ入力可能）
    // カスタム入力規則: 対象者が「検知者」かつ抽出期間が「期間指定」の場合のみ有効
    const dateConditionalFormula = (col: string) => `OR(AND(G${r}="検知者",D${r}="期間指定"),${col}="")`;
    row.getCell(5).dataValidation = {
      type: 'custom', formulae: [dateConditionalFormula(`E${r}`)],
      showErrorMessage: true, error: '対象者が「検知者」かつ抽出期間が「期間指定」の場合のみ入力可',
      showInputMessage: true, promptTitle: '抽出開始日（条件付き）', prompt: '対象者「検知者」かつ抽出期間「期間指定」の場合のみ入力\n形式: YYYY-MM-DD'
    };
    row.getCell(6).dataValidation = {
      type: 'custom', formulae: [dateConditionalFormula(`F${r}`)],
      showErrorMessage: true, error: '対象者が「検知者」かつ抽出期間が「期間指定」の場合のみ入力可',
      showInputMessage: true, promptTitle: '抽出終了日（条件付き）', prompt: '対象者「検知者」かつ抽出期間「期間指定」の場合のみ入力\n形式: YYYY-MM-DD'
    };

    // 7. 対象者 (Option Col C - 日本語あり・居住者&勤務者を追加したので範囲をC1:C4に変更)
    row.getCell(7).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$C$1:$C$4`],
      showInputMessage: true, promptTitle: '対象者（必須）', prompt: 'プルダウンから選択\n※ 居住者・勤務者を選ぶと抽出期間・検知回数が自動固定されます'
    };

    // 8. 検知回数 (Option Col D - 日本語あり)
    // プルダウンで選択可能（対象者が「居住者」等の場合はパーサー側で「3回以上」に強制変換）
    row.getCell(8).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$D$1:$D$5`],
      showInputMessage: true, promptTitle: '検知回数', prompt: '対象者が「検知者」の場合のみ設定\n居住者等は自動的に「3回以上」に設定されます'
    };

    // 9-10. 検知時間（対象者が「検知者」の場合のみ入力可能）
    const timeFormula = (c: string) => `OR(G${r}="検知者",${c}="")`;
    row.getCell(9).dataValidation = {
      type: 'custom', formulae: [timeFormula(`I${r}`)],
      showErrorMessage: true, error: '対象者が「検知者」の場合のみ入力可',
      showInputMessage: true, promptTitle: '検知時間（条件付き）', prompt: '対象者「検知者」の場合のみ入力可\n形式: HH:MM（例: 09:00）'
    };
    row.getCell(10).dataValidation = {
      type: 'custom', formulae: [timeFormula(`J${r}`)],
      showErrorMessage: true, error: '対象者が「検知者」の場合のみ入力可',
      showInputMessage: true, promptTitle: '検知時間（条件付き）', prompt: '対象者「検知者」の場合のみ入力可\n形式: HH:MM（例: 09:00）'
    };

    // 11. 滞在時間 (Option Col E - 日本語あり、対象者が「検知者」の場合のみ入力可能)
    row.getCell(11).dataValidation = {
      type: 'list', allowBlank: true, formulae: [`'${optionsSheetName}'!$E$1:$E$5`],
      showInputMessage: true, promptTitle: '滞在時間（条件付き）', prompt: '対象者「検知者」の場合のみ有効\nプルダウンから選択'
    };

    // 地点情報（地点IDは自動採番のため削除）
    row.getCell(12).dataValidation = {
      type: 'textLength', operator: 'lessThanOrEqual', formulae: [100],
      showInputMessage: true, promptTitle: '地点の名前（必須）', prompt: '100文字以内'
    };
    row.getCell(13).dataValidation = {
      type: 'textLength', operator: 'lessThanOrEqual', formulae: [200],
      showInputMessage: true, promptTitle: '住所（必須）', prompt: '200文字以内\n緯度経度が未入力の場合、この住所から自動変換されます'
    };
    row.getCell(14).dataValidation = {
      type: 'decimal', operator: 'between', formulae: [-90, 90],
      showInputMessage: true, promptTitle: '緯度（任意）', prompt: '-90〜90の小数\n例: 35.6585805（東京タワー）'
    };
    row.getCell(15).dataValidation = {
      type: 'decimal', operator: 'between', formulae: [-180, 180],
      showInputMessage: true, promptTitle: '経度（任意）', prompt: '-180〜180の小数\n例: 139.7454329（東京タワー）'
    };
  }

  // 条件付き書式: 対象者が「検知者」以外の場合、D列（抽出期間）をグレーアウト（居住者等は直近3ヶ月固定）
  sheet.addConditionalFormatting({
    ref: `D4:D${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['NOT(G4="検知者")'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });

  // 条件付き書式: 抽出期間が「期間指定」以外の場合、または対象者が「検知者」以外の場合、E-F列（抽出開始日・終了日）をグレーアウト
  sheet.addConditionalFormatting({
    ref: `E4:E${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['OR(NOT(D4="期間指定"),NOT(G4="検知者"))'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });
  sheet.addConditionalFormatting({
    ref: `F4:F${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['OR(NOT(D4="期間指定"),NOT(G4="検知者"))'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });

  // 条件付き書式: 対象者が「検知者」以外の場合、H列（検知回数）をグレーアウト
  sheet.addConditionalFormatting({
    ref: `H4:H${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['NOT(G4="検知者")'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });

  // 条件付き書式: 対象者が「検知者」以外の場合、I-K列（検知時間・滞在時間）をグレーアウト
  sheet.addConditionalFormatting({
    ref: `I4:I${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['NOT(G4="検知者")'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });
  sheet.addConditionalFormatting({
    ref: `J4:J${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['NOT(G4="検知者")'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });
  sheet.addConditionalFormatting({
    ref: `K4:K${maxRows}`,
    rules: [{
      type: 'expression',
      formulae: ['NOT(G4="検知者")'],
      style: {
        fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFE0E0E0' } },
        font: { color: { argb: 'FF808080' } }
      }
    }]
  });

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  await sheet.protect('password', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: true, deleteRows: true });
}

// シート4: 来店計測地点リスト（セグメント情報なし、地点IDは自動採番）
async function createVisitMeasurementLocationSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('4.来店計測地点リスト');
  applySheetDefaults(sheet);
  const headers = [
    { name: '地点の名前（必須）', required: true },
    { name: 'グループ番号（必須）', required: true },
    { name: '住所（必須）', required: true },
    { name: '緯度（任意）', required: false },
    { name: '経度（任意）', required: false }
  ];

  const headerRow = sheet.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h.name;
    cell.style = h.required ? REQUIRED_HEADER_STYLE : LOCATION_HEADER_STYLE;
  });
  headerRow.height = 22;

  // サンプル行（地点IDは自動採番のため削除）
  const sampleValues = [
    ['東京タワー', 1, '東京都港区芝公園4-2-8', 35.6585805, 139.7454329],
    ['スカイツリー', 1, '東京都墨田区押上1-1-2', 35.710063, 139.8107]
  ];

  sampleValues.forEach((vals, idx) => {
    const r = sheet.getRow(idx + 2);
    r.values = vals;
    for (let c = 1; c <= 5; c++) r.getCell(c).style = SAMPLE_ROW_STYLE;
  });

  const maxRows = 1000;

  for (let r = 4; r <= maxRows; r++) {
    const row = sheet.getRow(r);
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).style = EDITABLE_CELL_STYLE;
    }

    // 入力規則
    row.getCell(1).dataValidation = {
      type: 'textLength', operator: 'lessThanOrEqual', formulae: [100],
      showInputMessage: true, promptTitle: '地点の名前（必須）', prompt: '100文字以内'
    };
    row.getCell(2).dataValidation = {
      type: 'whole', operator: 'between', formulae: [1, 999],
      showErrorMessage: true, error: '1〜999の整数を入力してください',
      showInputMessage: true, promptTitle: 'グループ番号（必須）', prompt: '同じ番号の地点が同じグループに登録されます\n例: 1, 2, 3（整数）'
    };
    row.getCell(3).dataValidation = {
      type: 'textLength', operator: 'lessThanOrEqual', formulae: [200],
      showInputMessage: true, promptTitle: '住所（必須）', prompt: '200文字以内\n緯度経度が未入力の場合、この住所から自動変換されます'
    };
    row.getCell(4).dataValidation = {
      type: 'decimal', operator: 'between', formulae: [-90, 90],
      showInputMessage: true, promptTitle: '緯度（任意）', prompt: '-90〜90の小数\n例: 35.6585805（東京タワー）'
    };
    row.getCell(5).dataValidation = {
      type: 'decimal', operator: 'between', formulae: [-180, 180],
      showInputMessage: true, promptTitle: '経度（任意）', prompt: '-180〜180の小数\n例: 139.7454329（東京タワー）'
    };
  }

  sheet.columns = [
    { width: 30 }, { width: 20 }, { width: 40 }, { width: 15 }, { width: 15 }
  ];

  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  await sheet.protect('password', { selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: true, deleteRows: true });
}

async function createOptionsSheet(workbook: ExcelJS.Workbook) {
  const sheet = workbook.addWorksheet('5.選択肢リスト');
  sheet.state = 'hidden';
  applySheetDefaults(sheet);

  // 列定義
  const options = {
    A: ['UNIVERSEまたはTVer(SP)', 'TVer(CTV)'], // 配信先
    B: ['直近1ヶ月', '直近2ヶ月', '直近3ヶ月', '直近4ヶ月', '直近5ヶ月', '直近6ヶ月', '期間指定'], // 抽出期間
    C: ['検知者', '居住者', '勤務者', '居住者&勤務者'], // 対象者（居住者&勤務者を追加）
    D: ['1回以上', '2回以上', '3回以上', '4回以上', '5回以上'], // 検知回数
    E: ['3分以上', '5分以上', '10分以上', '15分以上', '30分以上'], // 滞在時間
    F: ['1000m', '1500m', '2000m', '2500m', '3000m', '3500m', '4000m', '4500m', '5000m', '6000m', '7000m', '8000m', '9000m', '10000m'] // 配信範囲（固定）
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
    link.setAttribute('download', 'UNIVERSEGEO_一括登録テンプレート_v4.8.xlsx');
    document.body.appendChild(link);
    link.click();
    // ノードが存在することを確認してから削除
    if (link.parentNode) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    alert('テンプレート作成失敗');
  }
}
