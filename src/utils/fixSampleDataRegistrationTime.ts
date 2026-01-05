/**
 * 既存のサンプルデータの登録時間を修正して、平均を60分以内にする
 * ブラウザのコンソールから実行: window.fixSampleDataRegistrationTime()
 */

import type { Project } from '../types/schema';

export function fixSampleDataRegistrationTime(): void {
  try {
    const projectStorageKey = 'bq_projects';
    const existingData = localStorage.getItem(projectStorageKey);
    
    if (!existingData) {
      console.log('⚠️ 案件データが見つかりません');
      return;
    }

    const projects: Project[] = JSON.parse(existingData);
    
    // サンプルデータを抽出（PRJ-SAMPLE-で始まるID）
    const sampleProjects = projects.filter(p => p.project_id?.startsWith('PRJ-SAMPLE-'));
    
    if (sampleProjects.length === 0) {
      console.log('ℹ️ 修正対象のサンプルデータが見つかりませんでした');
      return;
    }

    console.log(`📊 ${sampleProjects.length}件のサンプルデータを修正します`);

    // 現在の登録時間を計算
    const currentTimes = sampleProjects
      .map(p => {
        if (!p.project_registration_started_at) return null;
        const start = new Date(p.project_registration_started_at).getTime();
        const end = new Date(p._register_datetime).getTime();
        return Math.round((end - start) / (1000 * 60)); // 分単位
      })
      .filter((t): t is number => t !== null);

    if (currentTimes.length === 0) {
      console.log('⚠️ 登録時間が記録されているサンプルデータがありません');
      return;
    }

    // 日付ごとにグループ化
    const projectsByDate = new Map<string, Array<{ project: Project; minutes: number }>>();
    
    for (const project of sampleProjects) {
      if (!project.project_registration_started_at) continue;
      
      if (!project._register_datetime) continue;
      
      const startDate = new Date(project.project_registration_started_at);
      const endDate = new Date(project._register_datetime);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('⚠️ Invalid date in fixSampleDataRegistrationTime:', project.project_id);
        continue; // 無効な日付の場合はスキップ
      }
      
      const start = startDate.getTime();
      const end = endDate.getTime();
      const minutes = Math.round((end - start) / (1000 * 60));
      
      // 日付をキーとして使用（YYYY-MM-DD形式）
      let dateKey: string;
      try {
        dateKey = endDate.toISOString().split('T')[0];
      } catch (e) {
        console.warn('⚠️ toISOString() failed in fixSampleDataRegistrationTime:', project.project_id, e);
        continue; // エラーの場合はスキップ
      }
      
      if (!projectsByDate.has(dateKey)) {
        projectsByDate.set(dateKey, []);
      }
      projectsByDate.get(dateKey)!.push({ project, minutes });
    }

    console.log(`   日付別のデータ: ${projectsByDate.size}日分`);

    // 日ごとの平均を計算して表示
    let needsFix = false;
    for (const [date, dateProjects] of projectsByDate.entries()) {
      const dateAverage = dateProjects.reduce((sum, p) => sum + p.minutes, 0) / dateProjects.length;
      console.log(`   ${date}: 平均 ${dateAverage.toFixed(2)}分 (${dateProjects.length}件)`);
      if (dateAverage > 60) {
        needsFix = true;
      }
    }

    if (!needsFix) {
      console.log('✅ すべての日の平均登録時間は既に60分以内です。修正は不要です。');
      return;
    }

    // 目標平均を55分に設定（余裕を持たせる）
    const targetAverage = 55;
    
    // 日ごとに調整
    const sampleProjectUpdates: Array<{ project: Project; newMinutes: number; dateKey: string }> = [];
    
    for (const [date, dateProjects] of projectsByDate.entries()) {
      // その日の平均を計算
      const dateAverage = dateProjects.reduce((sum, p) => sum + p.minutes, 0) / dateProjects.length;
      
      if (dateAverage <= 60) {
        // 既に60分以内の場合はそのまま
        dateProjects.forEach(p => {
          sampleProjectUpdates.push({ project: p.project, newMinutes: p.minutes, dateKey: date });
        });
        continue;
      }

      // 60分を超えている場合は、その日のデータをスケールダウン
      const scaleFactor = targetAverage / dateAverage;
      console.log(`   ${date}: 平均 ${dateAverage.toFixed(2)}分 → スケールファクター ${scaleFactor.toFixed(3)}を適用`);
      
      dateProjects.forEach(p => {
        const newMinutes = Math.max(5, Math.min(60, Math.round(p.minutes * scaleFactor)));
        sampleProjectUpdates.push({ project: p.project, newMinutes, dateKey: date });
        console.log(`     ${p.project.project_id}: ${p.minutes}分 → ${newMinutes}分`);
      });
    }

    // 日ごとの平均が60分以内になるまで繰り返し調整
    let adjustedUpdates = [...sampleProjectUpdates];
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      // 日ごとの平均を再計算
      const adjustedByDate = new Map<string, number[]>();
      
      for (const update of adjustedUpdates) {
        // dateKeyを直接使用（計算ミスを防ぐ）
        let dateKey: string;
        if (update.dateKey) {
          dateKey = update.dateKey;
        } else if (update.project._register_datetime) {
          const date = new Date(update.project._register_datetime);
          if (isNaN(date.getTime())) {
            console.warn('⚠️ Invalid date in adjustedUpdates:', update.project.project_id);
            continue; // 無効な日付の場合はスキップ
          }
          try {
            dateKey = date.toISOString().split('T')[0];
          } catch (e) {
            console.warn('⚠️ toISOString() failed in adjustedUpdates:', update.project.project_id, e);
            continue; // エラーの場合はスキップ
          }
        } else {
          console.warn('⚠️ Missing _register_datetime in adjustedUpdates:', update.project.project_id);
          continue; // 日付がない場合はスキップ
        }
        if (!adjustedByDate.has(dateKey)) {
          adjustedByDate.set(dateKey, []);
        }
        adjustedByDate.get(dateKey)!.push(update.newMinutes);
      }

      // すべての日の平均が60分以内かチェック
      let allDaysUnder60 = true;
      for (const [date, minutes] of adjustedByDate.entries()) {
        const dateAverage = minutes.reduce((sum, m) => sum + m, 0) / minutes.length;
        if (dateAverage > 60) {
          allDaysUnder60 = false;
          console.log(`   反復 ${iterations + 1}: ${date}の平均が${dateAverage.toFixed(2)}分のため、さらに調整します`);
          // この日のデータをさらにスケールダウン
          const additionalScale = 55 / dateAverage;
          adjustedUpdates = adjustedUpdates.map(u => {
            let uDateKey: string;
            if (u.dateKey) {
              uDateKey = u.dateKey;
            } else if (u.project._register_datetime) {
              const date = new Date(u.project._register_datetime);
              if (isNaN(date.getTime())) {
                console.warn('⚠️ Invalid date in adjustedUpdates map:', u.project.project_id);
                return u; // 無効な日付の場合はそのまま返す
              }
              try {
                uDateKey = date.toISOString().split('T')[0];
              } catch (e) {
                console.warn('⚠️ toISOString() failed in adjustedUpdates map:', u.project.project_id, e);
                return u; // エラーの場合はそのまま返す
              }
            } else {
              console.warn('⚠️ Missing _register_datetime in adjustedUpdates map:', u.project.project_id);
              return u; // 日付がない場合はそのまま返す
            }
            if (uDateKey === date) {
              const oldMinutes = u.newMinutes;
              const newMinutes = Math.max(5, Math.min(60, Math.round(u.newMinutes * additionalScale)));
              return {
                ...u,
                newMinutes,
                dateKey: uDateKey
              };
            }
            return u;
          });
        }
      }

      if (allDaysUnder60) {
        console.log(`   すべての日の平均が60分以内になりました（反復回数: ${iterations + 1}回）`);
        break;
      }
      
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn(`   ⚠️ 最大反復回数（${maxIterations}回）に達しました。一部の日の平均が60分を超えている可能性があります。`);
    }

    // プロジェクトを更新
    const updatedProjects = projects.map((project) => {
      const update = adjustedUpdates.find(u => u.project.project_id === project.project_id);
      
      if (!update) {
        return project;
      }

      // 新しい開始時点を計算
      if (!project._register_datetime) {
        return project; // 無効な日付の場合はスキップ
      }
      
      const endDate = new Date(project._register_datetime);
      if (isNaN(endDate.getTime())) {
        console.warn('⚠️ Invalid _register_datetime in fixSampleDataRegistrationTime:', project.project_id);
        return project; // 無効な日付の場合はスキップ
      }
      
      const end = endDate.getTime();
      const newStartTime = new Date(end - update.newMinutes * 60 * 1000);
      
      let projectRegistrationStartedAt: string;
      if (isNaN(newStartTime.getTime())) {
        console.warn('⚠️ Invalid newStartTime in fixSampleDataRegistrationTime:', project.project_id);
        return project; // 無効な日付の場合はスキップ
      }
      try {
        projectRegistrationStartedAt = newStartTime.toISOString();
      } catch (e) {
        console.warn('⚠️ toISOString() failed in fixSampleDataRegistrationTime:', project.project_id, e);
        return project; // エラーの場合はスキップ
      }

      return {
        ...project,
        project_registration_started_at: projectRegistrationStartedAt,
      };
    });

    localStorage.setItem(projectStorageKey, JSON.stringify(updatedProjects));

    // 修正後の統計を表示（日ごと）
    const updatedSampleProjects = updatedProjects.filter(p => p.project_id?.startsWith('PRJ-SAMPLE-'));
    const updatedByDate = new Map<string, number[]>();
    
    for (const project of updatedSampleProjects) {
      if (!project.project_registration_started_at || !project._register_datetime) continue;
      
      const startDate = new Date(project.project_registration_started_at);
      const endDate = new Date(project._register_datetime);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('⚠️ Invalid date in fixSampleDataRegistrationTime stats:', project.project_id);
        continue; // 無効な日付の場合はスキップ
      }
      
      const start = startDate.getTime();
      const end = endDate.getTime();
      const minutes = Math.round((end - start) / (1000 * 60));
      
      let dateKey: string;
      try {
        dateKey = endDate.toISOString().split('T')[0];
      } catch (e) {
        console.warn('⚠️ toISOString() failed in fixSampleDataRegistrationTime stats:', project.project_id, e);
        continue; // エラーの場合はスキップ
      }
      
      if (!updatedByDate.has(dateKey)) {
        updatedByDate.set(dateKey, []);
      }
      updatedByDate.get(dateKey)!.push(minutes);
    }

    console.log(`✅ サンプルデータの登録時間を修正しました`);
    console.log(`   修正後の日付別平均:`);
    
    let overallSum = 0;
    let overallCount = 0;
    
    for (const [date, minutes] of Array.from(updatedByDate.entries()).sort()) {
      const dateAverage = minutes.reduce((sum, m) => sum + m, 0) / minutes.length;
      const min = Math.min(...minutes);
      const max = Math.max(...minutes);
      const status = dateAverage <= 60 ? '✅' : '⚠️';
      console.log(`   ${status} ${date}: 平均 ${dateAverage.toFixed(2)}分 (最小: ${min}分, 最大: ${max}分, ${minutes.length}件)`);
      overallSum += minutes.reduce((sum, m) => sum + m, 0);
      overallCount += minutes.length;
    }
    
    if (overallCount > 0) {
      const overallAverage = overallSum / overallCount;
      console.log(`   全体平均: ${overallAverage.toFixed(2)}分`);
    }

    // データ更新を反映するためにページをリロード
    console.log('\n🔄 データを更新しました。ページをリロードしてグラフを更新します...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);

    return;
  } catch (error) {
    console.error('❌ サンプルデータの修正に失敗しました:', error);
    throw error;
  }
}

// グローバルスコープに追加（ブラウザのコンソールから実行可能にする）
if (typeof window !== 'undefined') {
  (window as any).fixSampleDataRegistrationTime = fixSampleDataRegistrationTime;
}

