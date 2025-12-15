import { bigQueryService } from './bigquery';
import type { ChangeHistory } from '../types/schema';

/**
 * 変更履歴のサンプルデータを追加
 * 工数分析のためのテストデータを生成します
 */
export async function addSampleChangeHistory(): Promise<void> {
  try {
    const histories = bigQueryService.getChangeHistories();
    const projects = await bigQueryService.getProjects();
    const segments = await bigQueryService.getSegments();
    const pois = await bigQueryService.getPoiInfos();

    // 既存のサンプル履歴を削除（HIS_SAMPLEで始まるもの）
    const filteredHistories = histories.filter(h => !h.history_id.startsWith('HIS_SAMPLE'));

    const newHistories: ChangeHistory[] = [];
    const now = new Date();

    // 案件作成履歴を生成（過去30日間）
    projects.forEach((project, index) => {
      if (project.project_registration_started_at) {
        const startTime = new Date(project.project_registration_started_at);
        // 登録時間は5-10分の範囲でランダムに設定
        const registrationMinutes = 5 + Math.random() * 5;
        const endTime = new Date(startTime.getTime() + registrationMinutes * 60 * 1000);

        newHistories.push({
          history_id: `HIS_SAMPLE_PROJECT_${project.project_id}`,
          entity_type: 'project',
          entity_id: project.project_id,
          project_id: project.project_id,
          action: 'create',
          changed_by: project.person_in_charge || 'system',
          changed_at: endTime.toISOString(),
        });
      }
    });

    // セグメント作成履歴を生成
    segments.forEach((segment, index) => {
      const project = projects.find(p => p.project_id === segment.project_id);
      if (project) {
        // 案件作成から1-30分後にセグメントを作成
        const projectCreation = newHistories.find(
          h => h.entity_type === 'project' && h.entity_id === project.project_id
        );
        
        if (projectCreation) {
          const projectTime = new Date(projectCreation.changed_at);
          const segmentMinutes = 1 + Math.random() * 29; // 1-30分
          const segmentTime = new Date(projectTime.getTime() + segmentMinutes * 60 * 1000);

          newHistories.push({
            history_id: `HIS_SAMPLE_SEGMENT_${segment.segment_id}`,
            entity_type: 'segment',
            entity_id: segment.segment_id,
            project_id: segment.project_id,
            segment_id: segment.segment_id,
            action: 'create',
            changed_by: 'system',
            changed_at: segmentTime.toISOString(),
          });
        } else {
          // 案件作成履歴がない場合は、セグメント登録日時から逆算
          const segmentRegisteredAt = new Date(segment.segment_registered_at);
          newHistories.push({
            history_id: `HIS_SAMPLE_SEGMENT_${segment.segment_id}`,
            entity_type: 'segment',
            entity_id: segment.segment_id,
            project_id: segment.project_id,
            segment_id: segment.segment_id,
            action: 'create',
            changed_by: 'system',
            changed_at: segmentRegisteredAt.toISOString(),
          });
        }
      }
    });

    // 地点作成履歴を生成
    pois.forEach((poi, index) => {
      const segment = segments.find(s => s.segment_id === poi.segment_id);
      if (segment) {
        // セグメント作成から1-20分後に地点を作成
        const segmentCreation = newHistories.find(
          h => h.entity_type === 'segment' && h.entity_id === segment.segment_id
        );

        if (segmentCreation) {
          const segmentTime = new Date(segmentCreation.changed_at);
          const poiMinutes = 1 + Math.random() * 19; // 1-20分
          const poiTime = new Date(segmentTime.getTime() + poiMinutes * 60 * 1000);

          newHistories.push({
            history_id: `HIS_SAMPLE_POI_${poi.poi_id || poi.poi_name}`,
            entity_type: 'poi',
            entity_id: poi.poi_id || poi.poi_name,
            project_id: poi.project_id,
            segment_id: poi.segment_id,
            action: 'create',
            changed_by: 'system',
            changed_at: poiTime.toISOString(),
          });
        } else {
          // セグメント作成履歴がない場合は、地点作成日時から逆算
          const poiCreatedAt = new Date(poi.created);
          newHistories.push({
            history_id: `HIS_SAMPLE_POI_${poi.poi_id || poi.poi_name}`,
            entity_type: 'poi',
            entity_id: poi.poi_id || poi.poi_name,
            project_id: poi.project_id,
            segment_id: poi.segment_id,
            action: 'create',
            changed_by: 'system',
            changed_at: poiCreatedAt.toISOString(),
          });
        }
      }
    });

    // 更新操作の履歴を生成（一部のセグメントと地点）
    segments.slice(0, Math.min(20, segments.length)).forEach((segment, index) => {
      const segmentCreation = newHistories.find(
        h => h.entity_type === 'segment' && h.entity_id === segment.segment_id
      );
      
      if (segmentCreation) {
        const segmentTime = new Date(segmentCreation.changed_at);
        // セグメント作成から10-60分後に更新
        const updateMinutes = 10 + Math.random() * 50;
        const updateTime = new Date(segmentTime.getTime() + updateMinutes * 60 * 1000);

        newHistories.push({
          history_id: `HIS_SAMPLE_SEGMENT_UPDATE_${segment.segment_id}_${index}`,
          entity_type: 'segment',
          entity_id: segment.segment_id,
          project_id: segment.project_id,
          segment_id: segment.segment_id,
          action: 'update',
          changed_by: 'system',
          changed_at: updateTime.toISOString(),
          changes: {
            segment_name: {
              before: segment.segment_name || '',
              after: (segment.segment_name || '') + ' (更新)',
            },
          },
        });
      }
    });

    pois.slice(0, Math.min(30, pois.length)).forEach((poi, index) => {
      const poiCreation = newHistories.find(
        h => h.entity_type === 'poi' && (h.entity_id === poi.poi_id || h.entity_id === poi.poi_name)
      );

      if (poiCreation) {
        const poiTime = new Date(poiCreation.changed_at);
        // 地点作成から5-30分後に更新
        const updateMinutes = 5 + Math.random() * 25;
        const updateTime = new Date(poiTime.getTime() + updateMinutes * 60 * 1000);

        newHistories.push({
          history_id: `HIS_SAMPLE_POI_UPDATE_${poi.poi_id || poi.poi_name}_${index}`,
          entity_type: 'poi',
          entity_id: poi.poi_id || poi.poi_name,
          project_id: poi.project_id,
          segment_id: poi.segment_id,
          action: 'update',
          changed_by: 'system',
          changed_at: updateTime.toISOString(),
          changes: {
            poi_name: {
              before: poi.poi_name || '',
              after: (poi.poi_name || '') + ' (更新)',
            },
          },
        });
      }
    });

    // すべての履歴を結合
    const allHistories = [...filteredHistories, ...newHistories];

    // localStorageに保存
    localStorage.setItem('bq_change_history', JSON.stringify(allHistories));

    console.log(`✅ サンプル変更履歴を追加しました: ${newHistories.length}件`);
    console.log(`   - 案件作成: ${newHistories.filter(h => h.entity_type === 'project' && h.action === 'create').length}件`);
    console.log(`   - セグメント作成: ${newHistories.filter(h => h.entity_type === 'segment' && h.action === 'create').length}件`);
    console.log(`   - 地点作成: ${newHistories.filter(h => h.entity_type === 'poi' && h.action === 'create').length}件`);
    console.log(`   - セグメント更新: ${newHistories.filter(h => h.entity_type === 'segment' && h.action === 'update').length}件`);
    console.log(`   - 地点更新: ${newHistories.filter(h => h.entity_type === 'poi' && h.action === 'update').length}件`);
  } catch (error) {
    console.error('❌ サンプル変更履歴の追加に失敗しました:', error);
    throw error;
  }
}

