export interface FAQLink {
  text: string;
  action: string; // 'navigate:page' | 'navigate:project:id' | 'open:form' など
  params?: Record<string, any>; // 遷移先のパラメータ
}

export interface FAQItem {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  category: string;
  page?: string; // 特定のページに関連するFAQ
  context?: Record<string, any>; // 追加のコンテキスト情報
  links?: FAQLink[]; // 回答に関連するリンク
}

// FAQデータベース
export const faqDatabase: FAQItem[] = [
  // 基本操作
  {
    id: '1',
    question: '案件の作成方法',
    keywords: ['案件', '作成', '新規', '追加', '登録'],
    answer: '案件を作成するには、以下の手順を実行してください：\n\n1. 案件管理画面の「案件を追加」ボタンをクリック\n2. 案件情報（広告主名、代理店名、訴求ポイントなど）を入力\n3. 「登録」ボタンをクリック\n\n案件が作成されると、案件一覧に表示されます。',
    category: '基本操作',
  },
  {
    id: '2',
    question: 'セグメントの作成方法',
    keywords: ['セグメント', '作成', '追加', '登録'],
    answer: 'セグメントを作成するには：\n\n1. 案件詳細画面で「セグメント」タブを選択\n2. 「セグメントを追加」ボタンをクリック\n3. セグメント情報（セグメント名、配信媒体など）を入力\n4. セグメント共通条件（指定半径、抽出期間、属性など）を設定\n5. 「登録」ボタンをクリック\n\nセグメントを作成すると、そのセグメントに地点を登録できるようになります。',
    category: '基本操作',
    page: 'project-detail',
    links: [
      {
        text: '案件一覧に移動',
        action: 'navigate:page',
        params: { page: 'projects' },
      },
    ],
  },
  {
    id: '3',
    question: '地点の登録方法',
    keywords: ['地点', '登録', '追加', 'POI'],
    answer: '地点を登録する方法は3つあります：\n\n1. **手動登録**: 地点名と住所または緯度経度を個別に入力\n2. **都道府県・市区町村指定**: プルダウンから都道府県や市区町村を選択\n3. **CSV一括登録**: Excelファイルをアップロードして一括登録\n\n地点情報タブで「地点を追加」ボタンをクリックすると、登録方法を選択できます。',
    category: '基本操作',
    page: 'project-detail',
    links: [
      {
        text: '案件一覧に移動',
        action: 'navigate:page',
        params: { page: 'projects' },
      },
    ],
  },
  {
    id: '4',
    question: 'TG地点と来店計測地点の違い',
    keywords: ['TG地点', '来店計測地点', '違い', 'カテゴリ'],
    answer: '地点には2つのカテゴリがあります：\n\n**TG地点**:\n- セグメント（CP）ごとに管理されます\n- セグメントの抽出条件が適用されます\n- 地点格納依頼後は編集できません\n\n**来店計測地点**:\n- セグメントに従属しません\n- 計測地点グループでグループ分けできます\n- 地点格納依頼後も編集可能です\n\n地点登録時にカテゴリを選択できます。',
    category: '基本操作',
    page: 'project-detail',
  },
  {
    id: '5',
    question: '計測地点グループの使い方',
    keywords: ['計測地点グループ', 'グループ', '来店計測地点'],
    answer: '計測地点グループは、来店計測地点をグループ分けする機能です：\n\n1. 来店計測地点タブで「グループ作成」ボタンをクリック\n2. グループ名を入力して作成\n3. グループを選択してから地点を追加すると、そのグループに自動的に紐付けられます\n4. グループごとに地点を表示・管理できます\n\nグループは削除しても、グループに属する地点は削除されません。',
    category: '基本操作',
    page: 'project-detail',
  },
  {
    id: '6',
    question: 'CSV一括登録の方法',
    keywords: ['CSV', '一括登録', 'Excel', 'アップロード'],
    answer: 'CSV一括登録の手順：\n\n1. 地点情報タブで「CSV一括登録」ボタンをクリック\n2. Excelファイルを選択（またはドラッグ&ドロップ）\n3. プレビューで内容を確認\n4. エラーがないことを確認して「この内容で登録する」をクリック\n\n**Excelファイルの形式**:\n- 1行目: ヘッダー行（地点名、住所、緯度、経度など）\n- 2行目以降: 地点データ\n- 住所または緯度経度のどちらかは必須です',
    category: '基本操作',
    page: 'project-detail',
  },
  {
    id: '7',
    question: '表形式コピペの使い方',
    keywords: ['表形式', 'コピペ', '貼り付け', 'Excel'],
    answer: '表形式コピペの手順：\n\n1. ExcelやGoogleスプレッドシートから表をコピー\n2. 地点登録画面で「表形式コピペ」を選択\n3. コピーしたデータを貼り付け\n4. 抽出条件（指定半径、抽出期間、属性など）を設定\n5. プレビューで内容を確認して「この内容で登録する」をクリック\n\n**対応形式**:\n- タブ区切りまたはカンマ区切りのデータ\n- ヘッダー行がある場合は自動検出されます',
    category: '基本操作',
    page: 'project-detail',
  },
  {
    id: '8',
    question: '緯度経度の取得方法',
    keywords: ['緯度', '経度', '座標', '取得'],
    answer: '緯度経度を取得する方法：\n\n1. **住所から自動取得**: 住所を入力して「緯度経度取得」ボタンをクリック\n2. **手動入力**: 緯度と経度を直接入力\n\n住所から自動取得する場合、Geocoding APIを使用して座標を取得します。取得に失敗した場合は、手動で入力してください。',
    category: '基本操作',
    page: 'project-detail',
  },
  {
    id: '9',
    question: '地点の編集方法',
    keywords: ['地点', '編集', '更新', '変更'],
    answer: '地点を編集するには：\n\n1. 地点一覧で編集したい地点の「編集」ボタンをクリック\n2. 地点情報を変更\n3. 「保存」ボタンをクリック\n\n**注意**:\n- TG地点は、地点格納依頼後は編集できません（修正依頼が必要）\n- 来店計測地点は、地点格納依頼後も編集可能です',
    category: '基本操作',
    page: 'project-detail',
  },
  {
    id: '10',
    question: '地点の削除方法',
    keywords: ['地点', '削除', '削る'],
    answer: '地点を削除するには：\n\n1. 地点一覧で削除したい地点の「削除」ボタンをクリック\n2. 確認ダイアログで「削除する」をクリック\n\n**注意**: 削除した地点は復元できません。',
    category: '基本操作',
    page: 'project-detail',
  },
  // ステータス管理
  {
    id: '11',
    question: '地点格納依頼の方法',
    keywords: ['地点格納', '依頼', '格納依頼', 'ステータス'],
    answer: '地点格納依頼の手順：\n\n1. セグメント詳細で「地点格納依頼」ボタンをクリック\n2. 確認ダイアログで「依頼する」をクリック\n3. ステータスが「格納対応中」に変更されます\n\n**注意**:\n- 地点格納依頼後、TG地点は編集できなくなります\n- 来店計測地点は編集可能です',
    category: 'ステータス管理',
    page: 'project-detail',
  },
  {
    id: '12',
    question: 'データ連携依頼の方法',
    keywords: ['データ連携', '依頼', '連携依頼'],
    answer: 'データ連携依頼の手順：\n\n1. セグメント詳細で「データ連携依頼」ボタンをクリック\n2. 確認ダイアログで「依頼する」をクリック\n3. ステータスが「連携依頼済」に変更されます\n\nデータ連携依頼後は、管理部が連携を実行します。',
    category: 'ステータス管理',
    page: 'project-detail',
  },
  // トラブルシューティング
  {
    id: '13',
    question: '地点が表示されない',
    keywords: ['表示', '地点', '見えない', '表示されない'],
    answer: '地点が表示されない場合の確認事項：\n\n1. **カテゴリフィルター**: TG地点タブと来店計測地点タブを確認\n2. **グループフィルター**: 来店計測地点でグループが選択されていないか確認\n3. **セグメント**: セグメントが作成されているか確認\n4. **ページネーション**: 複数ページに分かれている場合は、ページを切り替えて確認\n\nそれでも表示されない場合は、ブラウザをリロードしてみてください。',
    category: 'トラブルシューティング',
    page: 'project-detail',
  },
  {
    id: '14',
    question: '編集できない',
    keywords: ['編集', 'できない', '編集不可'],
    answer: '編集できない場合の原因：\n\n1. **TG地点の格納依頼後**: 地点格納依頼が完了している場合、TG地点は編集できません。修正依頼を作成してください。\n2. **権限**: 編集権限があるか確認してください。\n3. **来店計測地点**: 来店計測地点は、地点格納依頼後も編集可能です。\n\n編集できない場合は、修正依頼を作成して管理部に依頼してください。',
    category: 'トラブルシューティング',
    page: 'project-detail',
  },
  {
    id: '15',
    question: 'CSVアップロードでエラーが出る',
    keywords: ['CSV', 'エラー', 'アップロード', '失敗'],
    answer: 'CSVアップロードでエラーが出る場合：\n\n1. **ファイル形式**: Excel形式（.xlsx）またはCSV形式（.csv）を確認\n2. **必須項目**: 地点名と住所（または緯度経度）が入力されているか確認\n3. **文字コード**: CSVファイルはUTF-8形式で保存してください\n4. **エラー詳細**: プレビュー画面でエラー詳細を確認してください\n\nエラーが解決しない場合は、ファイル形式を確認して再度アップロードしてください。',
    category: 'トラブルシューティング',
    page: 'project-detail',
  },
];

/**
 * FAQを検索して回答を返す
 */
export async function searchFAQ(
  query: string,
  currentPage?: string,
  currentContext?: Record<string, any>
): Promise<string | { answer: string; links?: FAQLink[] }> {
  const normalizedQuery = query.toLowerCase().trim();

  // 完全一致検索
  const exactMatch = faqDatabase.find(
    (faq) => faq.question.toLowerCase() === normalizedQuery
  );
  if (exactMatch) {
    return {
      answer: exactMatch.answer,
      links: exactMatch.links,
    };
  }

  // キーワードマッチング
  const keywordMatches = faqDatabase
    .map((faq) => {
      const matchCount = faq.keywords.filter((keyword) =>
        normalizedQuery.includes(keyword.toLowerCase())
      ).length;
      return { faq, score: matchCount };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // ページ関連のFAQを優先
  if (currentPage) {
    const pageMatches = keywordMatches.filter(
      (item) => item.faq.page === currentPage
    );
    if (pageMatches.length > 0) {
      return {
        answer: pageMatches[0].faq.answer,
        links: pageMatches[0].faq.links,
      };
    }
  }

  // 最も関連性の高いFAQを返す
  if (keywordMatches.length > 0) {
    return {
      answer: keywordMatches[0].faq.answer,
      links: keywordMatches[0].faq.links,
    };
  }

  // デフォルトの回答
  return `「${query}」についての質問ですね。\n\n申し訳ございませんが、該当する回答が見つかりませんでした。\n\n以下のような質問にお答えできます：\n- 案件やセグメントの作成方法\n- 地点の登録・編集方法\n- CSV一括登録の方法\n- ステータス管理の方法\n\nより具体的な質問をしていただけると、より適切な回答ができます。`;
}

