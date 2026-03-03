import { Router } from 'express';
import { getBqService } from '../bigquery-client';
import { wrapAsync } from '../middleware/async-wrapper';

const router = Router();

router.get('/', wrapAsync(async (req, res) => {
  if (!process.env.GCP_PROJECT_ID) {
    const error: any = new Error('GCP_PROJECT_ID環境変数が設定されていません');
    error.statusCode = 500;
    error.name = 'ConfigurationError';
    error.details = 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのGCP_PROJECT_IDが正しく設定されているか確認してください。';
    throw error;
  }
  const projects = await getBqService().getProjects();
  res.json(projects);
}));

router.get('/:project_id', async (req, res) => {
  try {
    const project = await getBqService().getProjectById(req.params.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!process.env.GCP_PROJECT_ID) {
      return res.status(500).json({
        error: 'GCP_PROJECT_ID環境変数が設定されていません',
        type: 'ConfigurationError',
        details: 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのGCP_PROJECT_IDが正しく設定されているか確認してください。',
      });
    }

    if (!process.env.BQ_DATASET) {
      return res.status(500).json({
        error: 'BQ_DATASET環境変数が設定されていません',
        type: 'ConfigurationError',
        details: 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのBQ_DATASETが正しく設定されているか確認してください。',
      });
    }

    let projectData = { ...req.body };
    const isProjectIdProvided =
      !!projectData.project_id &&
      typeof projectData.project_id === 'string' &&
      projectData.project_id.trim() !== '';

    const MAX_ID_GENERATION_RETRIES = 5;

    if (!isProjectIdProvided) {
      projectData.project_id = await getBqService().generateNextProjectId();

      if (!projectData.project_id || typeof projectData.project_id !== 'string' || projectData.project_id.trim() === '') {
        throw new Error('Failed to generate project_id');
      }
    }

    if (!projectData.person_in_charge || typeof projectData.person_in_charge !== 'string' || projectData.person_in_charge.trim() === '') {
      projectData.person_in_charge = '営業A';
    }

    let createdProjectData: any = null;

    if (!isProjectIdProvided) {
      let created = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_ID_GENERATION_RETRIES; attempt++) {
        try {
          if (attempt > 1) {
            // Re-generate a new sequential ID on duplicate conflict
            const regeneratedProjectId = await getBqService().generateNextProjectId();
            projectData.project_id = regeneratedProjectId;
          }

          createdProjectData = await getBqService().createProject(projectData);
          created = true;
          break;
        } catch (e: any) {
          lastError = e;
          const msg = e?.message || '';
          const isDuplicateId =
            typeof msg === 'string' &&
            (msg.includes('already exists') || msg.includes('project_id') && msg.includes('exists'));

          if (!isDuplicateId) {
            throw e;
          }
        }
      }

      if (!created) {
        throw lastError || new Error('Failed to create project after retries');
      }
    } else {
      createdProjectData = await getBqService().createProject(projectData);
    }

    res.status(201).json({
      message: 'Project created successfully',
      project_id: projectData.project_id,
      project: createdProjectData,
    });
  } catch (error: any) {
    const errorDetails: any = {
      error: error.message || 'プロジェクトの作成に失敗しました',
      type: error.name || 'UnknownError',
    };

    if (error.errors) {
      errorDetails.errors = error.errors;
      errorDetails.bigqueryErrors = error.errors;
      if (Array.isArray(error.errors) && error.errors.length > 0) {
        const firstError = error.errors[0];
        if (firstError && firstError.message) {
          errorDetails.error = `${errorDetails.error}: ${firstError.message}`;
        }
      }
    }

    if (error.response) errorDetails.response = error.response;
    if (error.code) errorDetails.code = error.code;
    if (error.cause) {
      errorDetails.cause = {
        message: error.cause.message,
        name: error.cause.name,
        code: error.cause.code,
      };
    }
    if (error.hint) errorDetails.hint = error.hint;

    if (errorDetails.error.includes('GCP_PROJECT_ID') || !process.env.GCP_PROJECT_ID) {
      errorDetails.details = errorDetails.details || 'GCP_PROJECT_ID環境変数が正しく設定されていません。Cloud Runの環境変数設定を確認してください。';
      errorDetails.configuration = {
        GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || 'NOT SET',
        BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
      };
    }

    if (process.env.NODE_ENV !== 'production') {
      errorDetails.stack = error.stack;
      errorDetails.requestBody = req.body;
    }

    res.status(500).json(errorDetails);
  }
});

router.put('/:project_id', async (req, res) => {
  try {
    await getBqService().updateProject(req.params.project_id, req.body);
    res.json({ message: 'Project updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:project_id', async (req, res) => {
  try {
    await getBqService().deleteProject(req.params.project_id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
