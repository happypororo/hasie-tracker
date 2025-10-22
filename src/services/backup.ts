/**
 * D1 ↔ Google Sheets 백업/복원 서비스
 */

import { writeToSheet, readFromSheet, ensureSheetExists } from './googleSheets';

export interface BackupConfig {
  spreadsheetId: string;
  serviceAccount: {
    client_email: string;
    private_key: string;
  };
}

/**
 * D1 데이터베이스를 Google Sheets에 백업
 */
export async function backupToGoogleSheets(
  DB: D1Database,
  config: BackupConfig
): Promise<{ success: boolean; message: string; rowCount: number }> {
  try {
    // hasie_rankings 테이블 데이터 가져오기
    const { results: rankings } = await DB.prepare(
      'SELECT * FROM hasie_rankings ORDER BY created_at DESC'
    ).all();

    // telegram_messages 테이블 데이터 가져오기
    const { results: messages } = await DB.prepare(
      'SELECT * FROM telegram_messages ORDER BY created_at DESC'
    ).all();

    // update_sessions 테이블 데이터 가져오기
    const { results: sessions } = await DB.prepare(
      'SELECT * FROM update_sessions ORDER BY created_at DESC'
    ).all();

    // 각 테이블을 Google Sheets의 다른 시트에 저장
    const sheetPrefix = 'backup';
    
    // 시트 존재 확인 및 생성
    await ensureSheetExists(config.spreadsheetId, `${sheetPrefix}_rankings`, config.serviceAccount);
    await ensureSheetExists(config.spreadsheetId, `${sheetPrefix}_messages`, config.serviceAccount);
    await ensureSheetExists(config.spreadsheetId, `${sheetPrefix}_sessions`, config.serviceAccount);

    // 데이터 백업
    await writeToSheet(
      config.spreadsheetId,
      `${sheetPrefix}_rankings`,
      rankings as any[],
      config.serviceAccount
    );

    await writeToSheet(
      config.spreadsheetId,
      `${sheetPrefix}_messages`,
      messages as any[],
      config.serviceAccount
    );

    await writeToSheet(
      config.spreadsheetId,
      `${sheetPrefix}_sessions`,
      sessions as any[],
      config.serviceAccount
    );

    const totalRows = rankings.length + messages.length + sessions.length;

    return {
      success: true,
      message: `백업 완료: rankings(${rankings.length}), messages(${messages.length}), sessions(${sessions.length})`,
      rowCount: totalRows
    };
  } catch (error) {
    console.error('Backup error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '백업 실패',
      rowCount: 0
    };
  }
}

/**
 * Google Sheets에서 D1 데이터베이스로 복원
 */
export async function restoreFromGoogleSheets(
  DB: D1Database,
  config: BackupConfig
): Promise<{ success: boolean; message: string; rowCount: number }> {
  try {
    const sheetPrefix = 'backup';

    // Google Sheets에서 데이터 읽기
    const rankings = await readFromSheet(
      config.spreadsheetId,
      `${sheetPrefix}_rankings`,
      config.serviceAccount
    );

    const messages = await readFromSheet(
      config.spreadsheetId,
      `${sheetPrefix}_messages`,
      config.serviceAccount
    );

    const sessions = await readFromSheet(
      config.spreadsheetId,
      `${sheetPrefix}_sessions`,
      config.serviceAccount
    );

    // 기존 데이터 삭제 (주의!)
    await DB.prepare('DELETE FROM hasie_rankings').run();
    await DB.prepare('DELETE FROM telegram_messages').run();
    await DB.prepare('DELETE FROM update_sessions').run();

    // hasie_rankings 복원
    for (const ranking of rankings) {
      await DB.prepare(`
        INSERT INTO hasie_rankings (
          id, category, rank, product_name, product_link, out_rank, created_at, message_date, update_session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        ranking.id,
        ranking.category,
        ranking.rank,
        ranking.product_name,
        ranking.product_link,
        ranking.out_rank,
        ranking.created_at,
        ranking.message_date,
        ranking.update_session_id
      ).run();
    }

    // telegram_messages 복원
    for (const message of messages) {
      await DB.prepare(`
        INSERT INTO telegram_messages (
          id, message_id, message_text, parsed_count, created_at, message_date
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        message.id,
        message.message_id,
        message.message_text,
        message.parsed_count,
        message.created_at,
        message.message_date
      ).run();
    }

    // update_sessions 복원
    for (const session of sessions) {
      await DB.prepare(`
        INSERT INTO update_sessions (
          session_id, started_at, completed_at, message_date, status
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        session.session_id,
        session.started_at,
        session.completed_at,
        session.message_date,
        session.status
      ).run();
    }

    const totalRows = rankings.length + messages.length + sessions.length;

    return {
      success: true,
      message: `복원 완료: rankings(${rankings.length}), messages(${messages.length}), sessions(${sessions.length})`,
      rowCount: totalRows
    };
  } catch (error) {
    console.error('Restore error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '복원 실패',
      rowCount: 0
    };
  }
}
