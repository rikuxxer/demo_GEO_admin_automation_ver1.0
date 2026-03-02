import {
  validateProjectId,
  getCleanDatasetId,
  initializeBigQueryClient,
  BQ_LOCATION,
  getDataset,
  formatTimestampForBigQuery,
  formatBoolForBigQuery,
} from './utils';

export async function getUsers(): Promise<any[]> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.users\`
    ORDER BY created_at DESC
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    location: BQ_LOCATION,
  });
  return rows;
}

export async function getUserByEmail(email: string): Promise<any> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const normalizedEmail = email.trim().toLowerCase();
    const query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.users\`
      WHERE LOWER(TRIM(email)) = @email
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { email: normalizedEmail },
      location: BQ_LOCATION,
    });
    return rows[0] || null;
  } catch (err: any) {
    console.error('[BQ getUserByEmail] error:', err?.message);
    console.error('[BQ getUserByEmail] code:', err?.code);

    if (err?.message?.includes('Not found') || err?.code === 404) {
      console.warn('⚠️ usersテーブルが存在しません。nullを返します。');
      return null;
    }

    throw err;
  }
}

export async function createUser(user: any): Promise<void> {
  try {
    if (!user.user_id || typeof user.user_id !== 'string' || user.user_id.trim() === '') {
      throw new Error('user_id is required and must be a non-empty string');
    }
    if (!user.name || typeof user.name !== 'string' || user.name.trim() === '') {
      throw new Error('name is required and must be a non-empty string');
    }
    if (!user.email || typeof user.email !== 'string' || user.email.trim() === '') {
      throw new Error('email is required and must be a non-empty string');
    }
    if (!user.password_hash || typeof user.password_hash !== 'string' || user.password_hash.trim() === '') {
      throw new Error('password_hash is required and must be a non-empty string');
    }
    if (!user.role || typeof user.role !== 'string' || user.role.trim() === '') {
      throw new Error('role is required and must be a non-empty string');
    }

    const allowedFields = [
      'user_id',
      'name',
      'email',
      'password_hash',
      'role',
      'department',
      'is_active',
      'last_login',
    ];

    const cleanedUser: any = {
      user_id: user.user_id.trim(),
      name: user.name.trim(),
      email: user.email.trim().toLowerCase(),
      password_hash: user.password_hash,
      role: user.role.trim(),
    };

    for (const field of allowedFields) {
      if (field in user && user[field] !== undefined && user[field] !== null) {
        if (field === 'is_active') {
          cleanedUser[field] = formatBoolForBigQuery(user[field]);
        } else if (field === 'last_login') {
          cleanedUser[field] = user[field] ? formatTimestampForBigQuery(user[field]) : null;
        } else {
          cleanedUser[field] = user[field];
        }
      }
    }

    const now = new Date();
    cleanedUser.created_at = formatTimestampForBigQuery(user.created_at || now);
    cleanedUser.updated_at = formatTimestampForBigQuery(user.updated_at || now);

    console.log('📋 Cleaned user data for BigQuery:', {
      user_id: cleanedUser.user_id,
      email: cleanedUser.email,
      role: cleanedUser.role,
      allFields: Object.keys(cleanedUser),
    });

    await getDataset().table('users').insert([cleanedUser], { ignoreUnknownValues: true });
  } catch (err: any) {
    console.error('[BQ insert users] message:', err?.message);
    console.error('[BQ insert users] errors:', JSON.stringify(err?.errors, null, 2));

    if (err.errors && Array.isArray(err.errors)) {
      err.errors.forEach((error: any, index: number) => {
        console.error(`[BQ insert users] error[${index}]:`, {
          message: error.message,
          reason: error.reason,
          location: error.location,
        });
      });
    }

    throw err;
  }
}

export async function updateUser(user_id: string, updates: any): Promise<void> {
  const currentProjectId = validateProjectId();

  const processedUpdates = { ...updates };
  if ('last_login' in processedUpdates) {
    processedUpdates.last_login = processedUpdates.last_login
      ? formatTimestampForBigQuery(processedUpdates.last_login)
      : null;
  }

  const setClause = Object.keys(processedUpdates)
    .map(key => `${key} = @${key}`)
    .join(', ');

  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.users\`
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
    WHERE user_id = @user_id
  `;

  const allParams = { user_id, ...processedUpdates };
  const paramTypes: Record<string, string | string[]> = {};
  if ('last_login' in allParams) paramTypes.last_login = 'TIMESTAMP';

  await initializeBigQueryClient().query({
    query,
    params: allParams,
    ...(Object.keys(paramTypes).length > 0 ? { types: paramTypes } : {}),
    location: BQ_LOCATION,
  });
}

export async function deleteUser(user_id: string): Promise<void> {
  if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
    throw new Error('user_id is required');
  }
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  await initializeBigQueryClient().query({
    query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.users\` WHERE user_id = @user_id`,
    params: { user_id: user_id.trim() },
    location: BQ_LOCATION,
  });
}

export async function getUserRequests(): Promise<any[]> {
  try {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.user_requests\`
      ORDER BY requested_at DESC
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  } catch (err: any) {
    console.error('[BQ getUserRequests] error:', err?.message);
    console.error('[BQ getUserRequests] code:', err?.code);
    console.error('[BQ getUserRequests] errors:', JSON.stringify(err?.errors, null, 2));

    if (err?.message?.includes('Not found') || err?.code === 404) {
      console.warn('⚠️ user_requestsテーブルが存在しません。空の配列を返します。');
      return [];
    }

    throw err;
  }
}

export async function createUserRequest(requestData: {
  name: string;
  email: string;
  password: string;
  requested_role: 'admin' | 'sales';
  department?: string;
  reason?: string;
}): Promise<any> {
  try {
    const normalizedEmail = requestData.email.trim().toLowerCase();

    let existingUser: any = null;
    try {
      existingUser = await getUserByEmail(normalizedEmail);
    } catch (err: any) {
      console.warn('[createUserRequest] getUserByEmail error (continuing):', err?.message);
    }

    if (existingUser) {
      const error = new Error('このメールアドレスは既に登録されています');
      (error as any).statusCode = 400;
      throw error;
    }

    let existingRequests: any[] = [];
    try {
      existingRequests = await getUserRequests();
    } catch (err: any) {
      console.warn('[createUserRequest] getUserRequests error (continuing):', err?.message);
    }

    const existingRequestByEmail = existingRequests.find(r =>
      r.email && r.email.trim().toLowerCase() === normalizedEmail && (r.status === 'pending' || r.status === 'approved')
    );
    if (existingRequestByEmail) {
      const error = new Error('このメールアドレスで既に申請が行われています。別のメールアドレスを使用するか、既存の申請の承認をお待ちください。');
      (error as any).statusCode = 400;
      throw error;
    }

    const password_hash = Buffer.from(requestData.password).toString('base64');

    const user_id = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const cleanedRequest: any = {
      user_id: user_id.trim(),
      name: requestData.name.trim(),
      email: normalizedEmail,
      password_hash: password_hash,
      requested_role: requestData.requested_role,
      status: 'pending',
      requested_at: formatTimestampForBigQuery(new Date()),
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null,
    };

    if (requestData.department) {
      cleanedRequest.department = requestData.department.trim();
    }
    if (requestData.reason) {
      cleanedRequest.reason = requestData.reason.trim();
    }

    console.log('📋 Cleaned user_request data for BigQuery:', {
      user_id: cleanedRequest.user_id,
      email: cleanedRequest.email,
      requested_role: cleanedRequest.requested_role,
      allFields: Object.keys(cleanedRequest),
      fullData: JSON.stringify(cleanedRequest, null, 2),
    });

    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();

      console.log('📋 Inserting into BigQuery:', {
        projectId: currentProjectId,
        datasetId: cleanDatasetId,
        table: 'user_requests',
      });

      const insertQuery = `
        INSERT INTO \`${currentProjectId}.${cleanDatasetId}.user_requests\`
        (user_id, name, email, password_hash, requested_role, department, reason, status, requested_at, reviewed_at, reviewed_by, review_comment)
        VALUES
        (@user_id, @name, @email, @password_hash, @requested_role, @department, @reason, @status, @requested_at, @reviewed_at, @reviewed_by, @review_comment)
      `;

      await initializeBigQueryClient().query({
        query: insertQuery,
        params: {
          user_id: cleanedRequest.user_id,
          name: cleanedRequest.name,
          email: cleanedRequest.email,
          password_hash: cleanedRequest.password_hash,
          requested_role: cleanedRequest.requested_role,
          department: cleanedRequest.department || null,
          reason: cleanedRequest.reason || null,
          status: cleanedRequest.status,
          requested_at: cleanedRequest.requested_at,
          reviewed_at: cleanedRequest.reviewed_at,
          reviewed_by: cleanedRequest.reviewed_by,
          review_comment: cleanedRequest.review_comment,
        },
        location: BQ_LOCATION,
      });

      console.log('✅ User request created successfully in BigQuery.');
    } catch (err: any) {
      console.error('[BQ insert user_requests] message:', err?.message);
      console.error('[BQ insert user_requests] name:', err?.name);
      console.error('[BQ insert user_requests] errors:', JSON.stringify(err?.errors, null, 2));

      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert user_requests] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location,
            debugInfo: error.debugInfo,
          });
        });
      }

      console.error('[BQ insert user_requests] response:', JSON.stringify(err?.response?.body ?? err?.response, null, 2));
      console.error('[BQ insert user_requests] code:', err?.code);
      console.error('[BQ insert user_requests] attempted data:', JSON.stringify(cleanedRequest, null, 2));

      const enhancedError = new Error(err.message || 'ユーザー登録申請の作成に失敗しました');
      enhancedError.name = err.name || 'BigQueryError';

      (enhancedError as any).code = err.code;
      (enhancedError as any).errors = err.errors;
      (enhancedError as any).response = err.response;
      (enhancedError as any).cause = err;

      enhancedError.stack = err.stack || enhancedError.stack;

      throw enhancedError;
    }

    const { password_hash: _, ...requestWithoutPassword } = cleanedRequest;
    return requestWithoutPassword;
  } catch (err: any) {
    if (err.statusCode === 400) {
      throw err;
    }

    console.error('[createUserRequest] unexpected error:', err?.message);
    throw err;
  }
}

export async function approveUserRequest(requestId: string, reviewedBy: string, comment?: string): Promise<void> {
  const requests = await getUserRequests();
  const request = requests.find(r => r.user_id === requestId);

  if (!request) {
    throw new Error('申請が見つかりません');
  }

  if (request.status !== 'pending') {
    throw new Error('この申請は既に処理されています');
  }

  const cleanedUser: any = {
    user_id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: request.name.trim(),
    email: request.email.trim().toLowerCase(),
    password_hash: request.password_hash,
    role: request.requested_role,
    is_active: formatBoolForBigQuery(true),
    created_at: formatTimestampForBigQuery(new Date()),
    updated_at: formatTimestampForBigQuery(new Date()),
    last_login: null,
  };

  if (request.department) {
    cleanedUser.department = request.department.trim();
  }

  console.log('📋 Cleaned user data for BigQuery:', {
    user_id: cleanedUser.user_id,
    email: cleanedUser.email,
    role: cleanedUser.role,
    is_active: cleanedUser.is_active,
    password_hash_length: cleanedUser.password_hash?.length,
    password_hash_preview: cleanedUser.password_hash?.substring(0, 20) + '...',
    allFields: Object.keys(cleanedUser),
  });

  await getDataset().table('users').insert([cleanedUser], { ignoreUnknownValues: true });

  console.log('✅ ユーザーを作成しました:', {
    user_id: cleanedUser.user_id,
    email: cleanedUser.email,
    role: cleanedUser.role,
    is_active: cleanedUser.is_active
  });

  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.user_requests\`
    SET status = 'approved',
        reviewed_at = CURRENT_TIMESTAMP(),
        reviewed_by = @reviewed_by,
        review_comment = @review_comment
    WHERE user_id = @user_id
  `;

  try {
    await initializeBigQueryClient().query({
      query,
      params: {
        user_id: requestId,
        reviewed_by: reviewedBy,
        review_comment: comment || null
      },
      types: {
        user_id: 'STRING',
        reviewed_by: 'STRING',
        review_comment: 'STRING'
      },
      location: BQ_LOCATION,
    });
  } catch (err: any) {
    if (err?.message?.includes('streaming buffer') || err?.message?.includes('would affect rows in the streaming buffer')) {
      const error = new Error('データがまだ処理中のため、しばらく待ってから再度お試しください。通常、数分で処理が完了します。');
      (error as any).statusCode = 409;
      (error as any).retryAfter = 300;
      throw error;
    }
    throw err;
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  const inputEmail = email.trim().toLowerCase();

  const user = await getUserByEmail(inputEmail);
  if (!user) {
    console.log('⚠️ パスワードリセット申請: ユーザーが見つかりませんでした（セキュリティ上の理由で成功メッセージを返します）');
    return;
  }

  const registeredEmail = user.email ? user.email.trim().toLowerCase() : inputEmail;

  await invalidatePasswordResetTokens(registeredEmail);

  const tokenId = `TOKEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const resetToken = `RESET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const tokenData = {
    token_id: tokenId,
    user_id: user.user_id,
    email: registeredEmail,
    token: resetToken,
    expires_at: formatTimestampForBigQuery(resetExpiry),
    used: formatBoolForBigQuery(false),
    created_at: formatTimestampForBigQuery(new Date()),
  };

  await getDataset().table('password_reset_tokens').insert([tokenData], { ignoreUnknownValues: true });

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${resetToken}`;

  console.log('📧 パスワードリセットトークンを生成しました:', {
    inputEmail: inputEmail,
    registeredEmail: registeredEmail,
    user_id: user.user_id,
    token: resetToken,
    expires_at: formatTimestampForBigQuery(resetExpiry),
    resetUrl: resetUrl
  });

  await sendPasswordResetEmail(registeredEmail, user.name, resetUrl);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (!token.startsWith('RESET-')) {
    throw new Error('無効なリセットトークンです');
  }

  const resetRequest = await getPasswordResetToken(token);
  if (!resetRequest) {
    throw new Error('無効なリセットトークンです');
  }

  if (resetRequest.used === true || resetRequest.used === 'true' || resetRequest.used === 1) {
    throw new Error('このリセットトークンは既に使用されています');
  }

  const expiresAt = new Date(resetRequest.expires_at);
  if (expiresAt < new Date()) {
    throw new Error('リセットトークンの有効期限が切れています');
  }

  const passwordHash = Buffer.from(newPassword).toString('base64');
  await updateUser(resetRequest.user_id, {
    password_hash: passwordHash,
    updated_at: formatTimestampForBigQuery(new Date())
  });

  await markPasswordResetTokenAsUsed(resetRequest.token_id);
}

async function getPasswordResetToken(token: string): Promise<any | null> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    SELECT *
    FROM \`${currentProjectId}.${cleanDatasetId}.password_reset_tokens\`
    WHERE token = @token
    LIMIT 1
  `;
  const [rows] = await initializeBigQueryClient().query({
    query,
    params: { token },
    location: BQ_LOCATION,
  });
  return rows[0] || null;
}

async function invalidatePasswordResetTokens(email: string): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.password_reset_tokens\`
    SET used = TRUE
    WHERE email = @email AND used = FALSE
  `;
  await initializeBigQueryClient().query({
    query,
    params: { email },
    location: BQ_LOCATION,
  });
}

async function markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.password_reset_tokens\`
    SET used = TRUE
    WHERE token_id = @token_id
  `;
  await initializeBigQueryClient().query({
    query,
    params: { token_id: tokenId },
    location: BQ_LOCATION,
  });
}

async function sendPasswordResetEmail(email: string, userName: string, resetUrl: string): Promise<void> {
  const emailService = process.env.EMAIL_SERVICE || 'gmail';

  if (emailService === 'gmail') {
    await sendEmailViaGmail(email, userName, resetUrl);
  } else if (emailService === 'sendgrid') {
    await sendEmailViaSendGrid(email, userName, resetUrl);
  } else {
    console.log('📧 メール送信（開発モード）:', {
      to: email,
      subject: 'パスワードリセットのご案内',
      resetUrl: resetUrl
    });
  }
}

async function sendEmailViaGmail(to: string, userName: string, resetUrl: string): Promise<void> {
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
    });
    const gmail = google.gmail({ version: 'v1', auth });

    const emailContent = `
パスワードリセットのご案内

${userName} 様

UNIVERSEGEO案件管理システムのパスワードリセット申請を受け付けました。

以下のリンクからパスワードを再設定してください。
このリンクは24時間有効です。

${resetUrl}

※このメールに心当たりがない場合は、無視してください。

--
UNIVERSEGEO案件管理システム
    `.trim();

    const message = [
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from('パスワードリセットのご案内', 'utf-8').toString('base64')}?=`,
      'Content-Type: text/plain; charset=utf-8',
      '',
      emailContent
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('✅ Gmail API経由でメールを送信しました:', to);
  } catch (error) {
    console.error('❌ Gmail API経由のメール送信に失敗しました:', error);
  }
}

async function sendEmailViaSendGrid(to: string, userName: string, resetUrl: string): Promise<void> {
  try {
    const sgMail = require('@sendgrid/mail');
    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY環境変数が設定されていません');
    }

    sgMail.setApiKey(apiKey);

    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@universegeo.com',
      subject: 'パスワードリセットのご案内',
      text: `
パスワードリセットのご案内

${userName} 様

UNIVERSEGEO案件管理システムのパスワードリセット申請を受け付けました。

以下のリンクからパスワードを再設定してください。
このリンクは24時間有効です。

${resetUrl}

※このメールに心当たりがない場合は、無視してください。

--
UNIVERSEGEO案件管理システム
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>パスワードリセットのご案内</h2>
          <p>${userName} 様</p>
          <p>UNIVERSEGEO案件管理システムのパスワードリセット申請を受け付けました。</p>
          <p>以下のリンクからパスワードを再設定してください。<br>このリンクは24時間有効です。</p>
          <p><a href="${resetUrl}" style="background-color: #5b5fff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">パスワードをリセット</a></p>
          <p style="color: #666; font-size: 12px;">※このメールに心当たりがない場合は、無視してください。</p>
          <hr>
          <p style="color: #666; font-size: 12px;">UNIVERSEGEO案件管理システム</p>
        </div>
      `,
    };

    await sgMail.send(msg);
    console.log('✅ SendGrid経由でメールを送信しました:', to);
  } catch (error) {
    console.error('❌ SendGrid経由のメール送信に失敗しました:', error);
  }
}

export async function rejectUserRequest(requestId: string, reviewedBy: string, comment: string): Promise<void> {
  const requests = await getUserRequests();
  const request = requests.find(r => r.user_id === requestId);

  if (!request) {
    throw new Error('申請が見つかりません');
  }

  if (request.status !== 'pending') {
    throw new Error('この申請は既に処理されています');
  }

  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    UPDATE \`${currentProjectId}.${cleanDatasetId}.user_requests\`
    SET status = 'rejected',
        reviewed_at = CURRENT_TIMESTAMP(),
        reviewed_by = @reviewed_by,
        review_comment = @review_comment
    WHERE user_id = @user_id
  `;

  try {
    await initializeBigQueryClient().query({
      query,
      params: {
        user_id: requestId,
        reviewed_by: reviewedBy,
        review_comment: comment
      },
      types: {
        user_id: 'STRING',
        reviewed_by: 'STRING',
        review_comment: 'STRING'
      },
      location: BQ_LOCATION,
    });
  } catch (err: any) {
    if (err?.message?.includes('streaming buffer') || err?.message?.includes('would affect rows in the streaming buffer')) {
      const error = new Error('データがまだ処理中のため、しばらく待ってから再度お試しください。通常、数分で処理が完了します。');
      (error as any).statusCode = 409;
      (error as any).retryAfter = 300;
      throw error;
    }
    throw err;
  }
}
