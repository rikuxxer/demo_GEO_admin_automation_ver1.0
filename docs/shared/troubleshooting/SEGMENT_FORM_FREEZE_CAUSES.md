# セグメント共通条件フォームのフリーズ・カクつき：考えられる原因

## 実施済み対策

- **半径の自由入力**: 非制御入力に変更し、入力中の state 更新を廃止
- **半径入力の key 削除**: 他フィールド編集時の再マウントを防止
- **半径 useEffect の依存**: `formData.designated_radius` のみに限定（期間など他変更で発火しないように）
- **handleChange**: SegmentForm 側で `useCallback` により参照を安定化
- **SegmentFormCommonConditions**: `React.memo` で、formData が同じ参照のときは再レンダーをスキップ
- **半径の startTransition 除外**: `designated_radius` は startTransition の対象から外し、blur 時に同期的に state を更新。登録直後に空/古い値で送信されてエラーになる事象を防止。保存形式は「XXm」（スプシ掃き出し・parseRadius と同一）。

---

## その他に考えられる原因

### 1. ポリゴン用 useEffect の依存

- **場所**: `SegmentFormCommonConditions` の `[formData.polygon, formData.polygons]`
- **懸念**: 親の `setFormData` で `formData` を新オブジェクトにした際、`polygon` / `polygons` の参照が毎回変わると、この effect が毎回走り `setPolygons` が発火する。
- **確認**: 親は `setFormData(prev => ({ ...prev, [field]: value }))` のように `prev` を spread しているため、他フィールド変更時は `prev.polygon` がそのまま渡り参照は通常変わらない。ポリゴン編集時のみ参照が変わる想定。
- **対策**: 問題が出る場合は、effect 内で「前回値と内容が同じなら `setPolygons` しない」比較をより厳密にするか、依存をやめて初回マウント時のみ同期するなどの検討。

### 2. 親（SegmentForm の親）の再レンダー頻度

- **懸念**: 案件一覧の更新やタイマー・購読などで親が高頻度で再レンダーすると、SegmentForm → SegmentFormCommonConditions も連鎖して再レンダーし、重い描画が続くとカクつきやフリーズのように見える。
- **対策**: SegmentFormCommonConditions を `React.memo` でラップ済み。formData 参照が変わらなければ再レンダーしない。親側で、セグメントフォーム表示中に不要な state 更新（例: 一覧のポーリング間隔）を見直すとよい。

### 3. 属性（attribute）による自動で 3 ヶ月固定

- **場所**: SegmentForm の `useEffect`（`formData.attribute` が resident / worker 等のとき `extraction_period` を 3 ヶ月に強制）
- **懸念**: この effect が「attribute 変更時以外」にも動くと、`setFormData` が余計に呼ばれ、連鎖的に再レンダーや別の effect が走る可能性がある。
- **現状**: 依存は `[formData.attribute]` のみなので、期間だけ変更したときは発火しない。
- **対策**: 依存配列を変えず、effect 内で「既に 3 ヶ月＋preset なら何もしない」ガードは既に入っている。

### 4. 開発環境のバリデーション useEffect

- **場所**: SegmentForm の `process.env.NODE_ENV === 'development'` 内の effect（validateSegment / logValidationDebug）
- **懸念**: 依存に `formData` の一部が含まれており、開発時のみ重い処理が走る。本番では無効なので本番フリーズの直接原因にはなりにくい。
- **対策**: 開発時のみ。依存を必要最小限（例: バリデーションに本当に必要なフィールドだけ）にすると安全。

### 5. 日付・期間まわりのインライン配列

- **懸念**: `extraction_dates` の map 内で `onChange('extraction_dates', arr)` のように新しい配列を毎回作成している。参照が変わるたびに親が再レンダーするが、通常は 1 回の操作 1 回の更新で済む。
- **対策**: 特に変更不要。同じ操作で何度も `setFormData` が呼ばれていないかだけ確認するとよい。

### 6. ブラウザ・デバイス側

- **懸念**: メモリ不足、拡張機能、別タブの重い処理でメインスレッドがブロックされ、フォーム操作がフリーズしたように見える。
- **対策**: シークレットウィンドウや拡張無効で再現するか、Performance タブでロングタスク・再レンダー回数を確認する。

---

## 追加で確認するとよいこと

- フリーズする操作の直前に **どのフィールドを触ったか**（半径のみ / 半径のあと期間 / 属性など）
- **開発者ツールの React プロファイラ**で、フリーズ時にどのコンポーネントが何回再レンダーしているか
- **コンソールのエラー・ワーニング**（無限ループや大量の setState 警告が出ていないか）

原因の切り分けや追加対策が必要な場合は、上記の「実施済み対策」と「その他に考えられる原因」を前提に、該当コンポーネントの effect 依存と setState の流れを追うとよい。
