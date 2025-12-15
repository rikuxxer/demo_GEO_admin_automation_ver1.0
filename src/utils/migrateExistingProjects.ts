/**
 * 既存の案件データにproject_registration_started_atを追加するマイグレーション
 * 既存データに対して、登録日時からランダムな時間（5-60分）を引いた値を設定
 */

import type { Project } from '../types/schema';

export function migrateExistingProjects(): void {
  try {
    const projectStorageKey = 'bq_projects';
    const existingData = localStorage.getItem(projectStorageKey);
    
    if (!existingData) {
      console.log('⚠️ 案件データが見つかりません');
      return;
    }

    const projects: Project[] = JSON.parse(existingData);
    
    // project_registration_started_atがない案件を更新
    let updatedCount = 0;
    const updatedProjects = projects.map((project) => {
      // 既に開始時点が記録されている場合はスキップ
      if (project.project_registration_started_at) {
        return project;
      }

      // 登録日時からランダムな時間（5-60分）を引いた値を設定
      const registerDate = new Date(project._register_datetime);
      const minutesBefore = Math.floor(Math.random() * 55) + 5; // 5-60分
      const startTime = new Date(registerDate.getTime() - minutesBefore * 60 * 1000);

      updatedCount++;
      return {
        ...project,
        project_registration_started_at: startTime.toISOString(),
      };
    });

    if (updatedCount > 0) {
      localStorage.setItem(projectStorageKey, JSON.stringify(updatedProjects));
      console.log(`✅ ${updatedCount}件の既存案件に登録開始時点を追加しました`);
    } else {
      console.log('ℹ️ 更新が必要な案件はありませんでした');
    }

    return;
  } catch (error) {
    console.error('❌ マイグレーションに失敗しました:', error);
    throw error;
  }
}

// グローバルスコープに追加（ブラウザのコンソールから実行可能にする）
if (typeof window !== 'undefined') {
  (window as any).migrateExistingProjects = migrateExistingProjects;
}

