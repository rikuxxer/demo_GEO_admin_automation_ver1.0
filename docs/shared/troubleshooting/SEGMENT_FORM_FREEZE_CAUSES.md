# セグメント共通条件フォームのフリーズ・カクつき：考えられる原因

## 実施済み対策

- **根本原因を特定（抽出条件の自由入力）**: 半径（`designated_radius`）自由入力の `blur` で親（`ProjectDetail` / 各フォーム）の state を即時更新しており、重い再レンダーが同期的に発生してフリーズしていた。
- **半径 blur 時の親更新を停止**: `SegmentFormCommonConditions` に `onDesignatedRadiusBlur` を追加し、`blur` では親 `onChange('designated_radius', ...)` を呼ばず、必要値は ref / draft 側で保持するよう変更。
- **VisitMeasurementGroupForm**: `designatedRadiusRef` を導入し、送信時に ref を参照。入力中・blur 中の不要な親再レンダーを回避。
- **ProjectDetail（抽出条件ポップアップ）**: 半径自由入力の `blur` では `setExtractionConditionsFormData` を呼ばず、`designatedRadiusDraft` のみ更新。保存時に draft から `radiusFromDraft` を計算して反映。
- **案件テーブル選択時のフリーズ軽減（関連対策）**: `useProjectSystem.selectProject` の `setSelectedProject` / `setSegments` / `setPois` を `startTransition` で低優先度化し、テーブル行選択直後のブロッキング再レンダーを緩和。
- **半径の自由入力**: 非制御入力に変更し、入力中の state 更新を廃止
- **半径入力の key 削除**: 他フィールド編集時の再マウントを防止
- **半径 useEffect の依存**: `formData.designated_radius` のみに限定（期間など他変更で発火しないように）
- **handleChange**: SegmentForm 側で `useCallback` により参照を安定化
- **SegmentFormCommonConditions**: `React.memo` で、formData が同じ参照のときは再レンダーをスキップ
- **半径の startTransition**: `designated_radius` を startTransition の対象に含め、blur 時の state 更新を低優先度にしてフリーズを軽減。保存形式は「XXm」（スプシ掃き出し・parseRadius と同一）。
- **ポリゴン useEffect**: 参照だけ変わり内容が同じときは `setPolygons` を呼ばない（`polygonSignatureRef` で JSON 署名比較）。不要な setState を防止。
- **extraction_dates**: 日付変更・削除時に「内容が同じなら `onChange` を呼ばない」ガードを追加。不要な親の再レンダーを防止。
- **開発環境バリデーション**: 効果の実行を 400ms スロットルし、連続実行による重い処理を抑制。
- **otherSegments / otherMediaIds / hasTverCTV / hasOtherMedia**: SegmentForm 内で `useMemo` によりメモ化。`existingSegments` や `segment?.segment_id` が変わらない限り同じ参照を返し、毎レンダーの filter・flatMap・some を避けてフリーズを軽減。
- **ProjectDetail の fixInconsistencies**: `useEffect([pois])` 内で `onPoiUpdate` を呼ぶと親が `pois` を更新し、effect が連鎖的に再実行されてフリーズする問題を防止。`isFixingInconsistenciesRef` で「実行中は再実行しない」ガードを入れ、`.finally()` でフラグをリセット。
- **PoiForm の半径入力フリーズ対策（抽出条件の自由入力）**:
  - `designatedRadiusRef` を追加し、blur 時に ref のみを更新することで親 state 更新を回避。
  - `handleChange` 関数で `designated_radius` 更新時に `startTransition` でラップし、ドロップダウン選択時のフリーズも軽減。
  - 送信時は `designatedRadiusRef.current` を優先的に使用し、blur 時に ref だけが更新されているケースに対応。
  - ドロップダウン選択時の同期用に `useEffect` を追加し、`formData.designated_radius` の変化を ref に反映。

---

## その他に考えられる原因

### 0. 抽出条件の自由入力でフリーズする主因（結論）

- **主因**: 抽出条件フォーム（ProjectDetail の抽出条件ポップアップ含む）で、半径自由入力の `blur` が親コンポーネントの state 更新を直接発火し、ProjectDetail 配下の大きなツリーが同期再レンダーしていたこと。
- **発生しやすい操作**: 「半径に値を入力（例: 10）→ 別フィールドを触る（blur 発生）」。
- **現在の方針**: 半径入力中・blur 時は ref/draft 更新に留め、保存時・送信時にのみ確定値を親へ反映する。

### 1. ポリゴン用 useEffect の依存

- **場所**: `SegmentFormCommonConditions` の `[formData.polygon, formData.polygons]`
- **実施済み**: effect 内で `polygonSignatureRef` により「内容が前回と同じなら `setPolygons` を呼ばない」ようにした。参照だけ変わる再レンダーでは setState が走らない。

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
- **実施済み**: 実行を 400ms スロットルし、連続実行による重い処理を抑制。本番では無効。

### 5. 日付・期間まわりのインライン配列

- **実施済み**: `extraction_dates` の変更・削除時に「内容が同じなら `onChange` を呼ばない」ガード（`extractionDatesEqual`）を追加。同一値での親の再レンダーを防止。

### 6. ブラウザ・デバイス側

- **懸念**: メモリ不足、拡張機能、別タブの重い処理でメインスレッドがブロックされ、フォーム操作がフリーズしたように見える。
- **対策**: シークレットウィンドウや拡張無効で再現するか、Performance タブでロングタスク・再レンダー回数を確認する。

### 7. formData の参照で memo が効きにくい

- **懸念**: `handleChange` でどのフィールドを更新しても `formData` が毎回新しいオブジェクト参照になる。そのため `React.memo` の SegmentFormCommonConditions も「formData が同じ参照のときだけスキップ」なので、**セグメント名・媒体・その他フィールドを触るたびに共通条件ブロック全体が再レンダー**する。
- **対策案**: 共通条件で触るフィールドだけ別 state に分離し、その部分だけ子に渡すと再レンダー範囲を狭められる（変更が大きい）。現状は startTransition で半径・期間系の更新を低優先度にして軽減。

### 8. 親（ProjectDetail）の state 更新

- **懸念**: フォーム表示中に親で `segments` / `pois` の再取得や他タブの state 更新があると、SegmentForm に渡る `existingSegments`・`pois` の参照が変わり、SegmentForm 全体が再レンダーする。
- **対策**: フォームを開いている間はポーリングや一覧の再 fetch を控える、または SegmentForm をメモ化して props の浅い比較で不要な再レンダーを減らす検討。

### 9. otherSegments / otherMediaIds の毎レンダー計算

- **場所**: SegmentForm の `existingSegments.filter(...)` と `otherSegments.flatMap(...)`。
- **実施済み**: `useMemo` で `otherSegments`・`otherMediaIds`・`hasTverCTV`・`hasOtherMedia` をメモ化済み。同一条件のときは同じ参照を返し、毎レンダーの計算を抑制。

### 10. PolygonMapEditor（ポリゴン編集）

- **懸念**: ポリゴン編集を開いている間、マップの描画・ドラッグ・頂点の更新で負荷がかかる可能性がある。
- **対策**: 編集を開くまでマウントしない（現状もモーダル内で開く想定）。重い場合は表示の遅延（lazy）や描画の簡素化を検討。

### 11. 媒体チェック・コピー元セグメントのリスト

- **懸念**: 既存セグメント数が多い場合、`otherSegments.map` による「コピー元」ドロップダウンや媒体競合チェックの計算が毎レンダーで走る。リストの仮想化は行っていない。
- **対策**: セグメント数が数十以上になる場合は、`otherSegments` の useMemo とあわせて、リスト部分のメモ化や表示件数制限を検討。

### 12. 抽出条件設定ポップアップ（実施済み）

- **場所**: ProjectDetail の「抽出条件設定」ポップアップ（ターゲティングの抽出条件設定時）。
- **懸念**: ラジオ・セレクト・日付入力のたびに `setExtractionConditionsFormData` が同期的に走り、ProjectDetail 全体が再レンダーしてフリーズしていた。特に、**半径の自由入力中に `designatedRadiusDraft` state が更新されるたびに ProjectDetail 全体が再レンダー**され、入力がフリーズしていた。さらに、**blur 時の警告フラグ更新（`setShowRadiusWarning`, `setShowRadius30mWarning`）が、startTransition でラップしても依然として重い再レンダーを引き起こし、10秒以上のフリーズが発生**していた。
- **実施済み**: 
  - ポップアップ内のフォーム更新を `setExtractionConditionsDeferred`（startTransition でラップ）に統一。
  - **半径入力を非制御コンポーネントに変更**：`designatedRadiusDraft` state を削除し、`designatedRadiusInputRef` ref に置き換え。入力中の state 更新を完全に排除。
  - **blur ハンドラーを完全に削除**：blur 時の警告フラグ更新を含む全ての処理を削除し、blur 時のフリーズを根本的に解消。警告表示機能も削除（フリーズ防止を優先）。
  - **バリデーションを保存時に実行**：ref から値を取得し、保存時にのみバリデーションを行い、無効な値の場合は toast でエラーメッセージを表示。
  - **半径ドロップダウン選択時**: ref を直接更新し、state 更新は `setExtractionConditionsDeferred` 経由で遅延実行。
  - **ポップアップを開く際**: ref に初期値を設定し、input の defaultValue として使用。
  - **日付選択時の警告フラグ更新**（`setShowDateRangeWarning`）を `startTransition` でラップし、6ヶ月以上前の日付選択時のブロッキングを回避。
  - `extraction_dates` の変更・削除時に `extractionDatesEqual` で同一なら setState をスキップ。
- **結果**: 半径の自由入力中および blur 時の state 更新が完全に排除され、フリーズが解消。バリデーションは保存時のみ実行され、UX を維持しつつパフォーマンスを最適化。

### 13. ProjectDetail の来店計測矛盾修正 effect（実施済み）

- **場所**: `ProjectDetail` の `useEffect`（`pois` 依存で `fixInconsistencies` を実行し `onPoiUpdate` を呼ぶ）。
- **懸念**: `onPoiUpdate` のたびに親が state を更新し `pois` の参照が変わるため、effect が連鎖的に再実行され、複数回の API 呼び出しと setState でフリーズしていた。
- **実施済み**: `isFixingInconsistenciesRef` で実行中は再実行しないようにガードし、`.finally()` でフラグをリセット。

---

## 追加で確認するとよいこと

- フリーズする操作の直前に **どのフィールドを触ったか**（半径のみ / 半径のあと期間 / 属性など）
- **開発者ツールの React プロファイラ**で、フリーズ時にどのコンポーネントが何回再レンダーしているか
- **コンソールのエラー・ワーニング**（無限ループや大量の setState 警告が出ていないか）

原因の切り分けや追加対策が必要な場合は、上記の「実施済み対策」と「その他に考えられる原因」を前提に、該当コンポーネントの effect 依存と setState の流れを追うとよい。
