import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { parseMultipleCategoryRankings } from './parser'

type Env = {
  DB: D1Database;
  TELEGRAM_BOT_TOKEN?: string;
}

const app = new Hono<{ Bindings: Env }>()

// CORS 설정
app.use('/api/*', cors())

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }))

// ============================================
// 텔레그램 웹훅 엔드포인트
// ============================================

/**
 * 수동 메시지 입력 (복사/붙여넣기)
 * POST /api/hasie/import
 */
app.post('/api/hasie/import', async (c) => {
  try {
    const { messageText, messageDate } = await c.req.json();
    const { DB } = c.env;
    
    if (!messageText) {
      return c.json({ success: false, error: '메시지를 입력해주세요' }, 400);
    }
    
    // 메시지 시간 (없으면 현재 시간 사용)
    const msgDate = messageDate || new Date().toISOString();
    
    // [시작] 메시지 처리
    if (messageText.trim() === '[시작]') {
      const sessionId = `session_${Date.now()}`;
      await DB.prepare(`
        INSERT INTO update_sessions (session_id, started_at, message_date, status)
        VALUES (?, datetime('now'), ?, 'in_progress')
      `).bind(sessionId, msgDate).run();
      
      return c.json({ 
        success: true, 
        message: '업데이트 세션 시작',
        session_id: sessionId
      });
    }
    
    // [끝] 메시지 처리
    if (messageText.trim() === '[끝]') {
      // 가장 최근의 진행 중인 세션 찾기
      const session = await DB.prepare(`
        SELECT session_id FROM update_sessions
        WHERE status = 'in_progress'
        ORDER BY started_at DESC
        LIMIT 1
      `).first();
      
      if (!session) {
        return c.json({ 
          success: false, 
          error: '진행 중인 업데이트 세션이 없습니다'
        }, 400);
      }
      
      const sessionId = session.session_id;
      
      // OUT Rank 처리: 이번 세션에 업데이트된 카테고리에서 없는 제품들만 OUT으로
      // 1. 이번 세션에서 업데이트된 카테고리 목록 가져오기
      const { results: sessionCategories } = await DB.prepare(`
        SELECT DISTINCT category
        FROM hasie_rankings
        WHERE update_session_id = ?
      `).bind(sessionId).all();
      
      const categories = sessionCategories.map((c: any) => c.category);
      
      if (categories.length > 0) {
        // 2. 카테고리별로 OUT 처리
        for (const category of categories) {
          // 해당 카테고리의 이번 세션 제품 목록 (정상 순위만)
          const { results: sessionProducts } = await DB.prepare(`
            SELECT DISTINCT product_link
            FROM hasie_rankings
            WHERE update_session_id = ? AND category = ? AND out_rank = 0
          `).bind(sessionId, category).all();
          
          const sessionProductLinks = sessionProducts.map((p: any) => p.product_link);
          
          if (sessionProductLinks.length > 0) {
            const placeholders = sessionProductLinks.map(() => '?').join(',');
            
            // 같은 카테고리에서 이번 세션에 없는 제품만 OUT으로
            await DB.prepare(`
              INSERT OR IGNORE INTO hasie_rankings (category, rank, product_name, product_link, out_rank, created_at, message_date, update_session_id)
              SELECT h1.category, 201, h1.product_name, h1.product_link, 1, datetime('now'), ?, ?
              FROM hasie_rankings h1
              INNER JOIN (
                SELECT product_link, MAX(created_at) as max_date
                FROM hasie_rankings
                GROUP BY product_link
              ) h2 ON h1.product_link = h2.product_link AND h1.created_at = h2.max_date
              WHERE h1.out_rank = 0
                AND h1.rank != 201
                AND h1.category = ?
                AND h1.product_link NOT IN (${placeholders})
                AND h1.product_link NOT IN (
                  SELECT product_link
                  FROM hasie_rankings
                  WHERE out_rank = 1
                    AND update_session_id = ?
                )
            `).bind(msgDate, sessionId, category, sessionId, ...sessionProductLinks).run();
          }
        }
      }
      
      // 세션 완료 표시
      await DB.prepare(`
        UPDATE update_sessions
        SET completed_at = datetime('now'), status = 'completed'
        WHERE session_id = ?
      `).bind(sessionId).run();
      
      return c.json({ 
        success: true, 
        message: '업데이트 세션 완료 및 OUT Rank 처리 완료',
        session_id: sessionId
      });
    }
    
    // 일반 순위 메시지 파싱
    const rankings = parseMultipleCategoryRankings(messageText);
    
    if (rankings.length === 0) {
      return c.json({ 
        success: false, 
        error: '순위 데이터를 찾을 수 없습니다. 메시지 형식을 확인해주세요.'
      }, 400);
    }
    
    // 현재 진행 중인 세션 ID 가져오기
    const session = await DB.prepare(`
      SELECT session_id FROM update_sessions
      WHERE status = 'in_progress'
      ORDER BY started_at DESC
      LIMIT 1
    `).first();
    
    const sessionId = session ? session.session_id : `session_${Date.now()}`;
    
    // 세션이 없으면 자동 생성
    if (!session) {
      await DB.prepare(`
        INSERT INTO update_sessions (session_id, started_at, message_date, status)
        VALUES (?, datetime('now'), ?, 'in_progress')
      `).bind(sessionId, msgDate).run();
    }
    
    // 이번에 등장한 제품들의 링크 목록
    const currentProductLinks = rankings.map(r => r.productLink);
    
    // 카테고리별로 그룹화
    const categoriesInMessage = [...new Set(rankings.map(r => r.category))];
    
    // OUT Rank 처리는 [끝] 메시지에서만 수행
    const batch = [];
    
    // 메시지 로그 저장
    const messageId = Date.now();
    batch.push(
      DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count, message_date) VALUES (?, ?, ?, ?)'
      ).bind(messageId, messageText, rankings.length, msgDate)
    );
    
    // 새로운 순위 데이터 저장 (out_rank = 0, 순위권 내, update_session_id 포함)
    for (const ranking of rankings) {
      batch.push(
        DB.prepare(
          'INSERT INTO hasie_rankings (category, rank, product_name, product_link, out_rank, message_date, update_session_id) VALUES (?, ?, ?, ?, 0, ?, ?)'
        ).bind(ranking.category, ranking.rank, ranking.productName, ranking.productLink, msgDate, sessionId)
      );
    }
    
    await DB.batch(batch);
    
    return c.json({
      success: true,
      message: '순위 데이터가 저장되었습니다',
      parsedCount: rankings.length,
      categories: [...new Set(rankings.map(r => r.category))]
    });
    
  } catch (error: any) {
    console.error('Import error:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 텔레그램 봇 웹훅 수신
 * POST /api/telegram/webhook
 */
app.post('/api/telegram/webhook', async (c) => {
  try {
    const update = await c.req.json();
    const { DB } = c.env;
    
    // 메시지가 있는지 확인
    if (!update.message || !update.message.text) {
      return c.json({ success: true, message: 'No text message' }, 200);
    }
    
    const messageId = update.message.message_id;
    const messageText = update.message.text.trim();
    const messageDate = update.message.date 
      ? new Date(update.message.date * 1000).toISOString() 
      : new Date().toISOString();
    
    // 이미 처리된 메시지인지 확인
    const existingMessage = await DB.prepare(
      'SELECT id FROM telegram_messages WHERE message_id = ?'
    ).bind(messageId).first();
    
    if (existingMessage) {
      return c.json({ success: true, message: 'Already processed' }, 200);
    }
    
    // [시작] 메시지 처리
    if (messageText === '[시작]') {
      const sessionId = `session_${Date.now()}`;
      await DB.prepare(`
        INSERT INTO update_sessions (session_id, started_at, message_date, status)
        VALUES (?, datetime('now'), ?, 'in_progress')
      `).bind(sessionId, messageDate).run();
      
      // 메시지 로그 저장
      await DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count, message_date) VALUES (?, ?, ?, ?)'
      ).bind(messageId, messageText, 0, messageDate).run();
      
      return c.json({ 
        success: true, 
        message: '업데이트 세션 시작',
        session_id: sessionId
      }, 200);
    }
    
    // [끝] 메시지 처리
    if (messageText === '[끝]') {
      const session = await DB.prepare(`
        SELECT session_id FROM update_sessions
        WHERE status = 'in_progress'
        ORDER BY started_at DESC
        LIMIT 1
      `).first();
      
      if (!session) {
        return c.json({ 
          success: true, 
          message: '진행 중인 업데이트 세션이 없습니다'
        }, 200);
      }
      
      const sessionId = session.session_id;
      
      // OUT Rank 처리: 카테고리별로 처리
      const { results: sessionCategories } = await DB.prepare(`
        SELECT DISTINCT category
        FROM hasie_rankings
        WHERE update_session_id = ?
      `).bind(sessionId).all();
      
      const categories = sessionCategories.map((c: any) => c.category);
      
      if (categories.length > 0) {
        for (const category of categories) {
          const { results: sessionProducts } = await DB.prepare(`
            SELECT DISTINCT product_link
            FROM hasie_rankings
            WHERE update_session_id = ? AND category = ? AND out_rank = 0
          `).bind(sessionId, category).all();
          
          const sessionProductLinks = sessionProducts.map((p: any) => p.product_link);
          
          if (sessionProductLinks.length > 0) {
            const placeholders = sessionProductLinks.map(() => '?').join(',');
            
            await DB.prepare(`
              INSERT OR IGNORE INTO hasie_rankings (category, rank, product_name, product_link, out_rank, created_at, message_date, update_session_id)
              SELECT h1.category, 201, h1.product_name, h1.product_link, 1, datetime('now'), ?, ?
              FROM hasie_rankings h1
              INNER JOIN (
                SELECT product_link, MAX(created_at) as max_date
                FROM hasie_rankings
                GROUP BY product_link
              ) h2 ON h1.product_link = h2.product_link AND h1.created_at = h2.max_date
              WHERE h1.out_rank = 0
                AND h1.rank != 201
                AND h1.category = ?
                AND h1.product_link NOT IN (${placeholders})
                AND h1.product_link NOT IN (
                  SELECT product_link
                  FROM hasie_rankings
                  WHERE out_rank = 1
                    AND update_session_id = ?
                )
            `).bind(messageDate, sessionId, category, sessionId, ...sessionProductLinks).run();
          }
        }
      }
      
      // 세션 완료 표시
      await DB.prepare(`
        UPDATE update_sessions
        SET completed_at = datetime('now'), status = 'completed'
        WHERE session_id = ?
      `).bind(sessionId).run();
      
      // 메시지 로그 저장
      await DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count, message_date) VALUES (?, ?, ?, ?)'
      ).bind(messageId, messageText, 0, messageDate).run();
      
      return c.json({ 
        success: true, 
        message: '업데이트 세션 완료 및 OUT Rank 처리 완료',
        session_id: sessionId
      }, 200);
    }
    
    // 일반 순위 메시지 파싱
    const rankings = parseMultipleCategoryRankings(messageText);
    
    if (rankings.length === 0) {
      // 파싱 실패해도 메시지 로그는 저장
      await DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count, message_date) VALUES (?, ?, ?, ?)'
      ).bind(messageId, messageText, 0, messageDate).run();
      
      return c.json({ 
        success: true, 
        message: 'No rankings found',
        parsedCount: 0
      }, 200);
    }
    
    // 현재 진행 중인 세션 ID 가져오기
    const session = await DB.prepare(`
      SELECT session_id FROM update_sessions
      WHERE status = 'in_progress'
      ORDER BY started_at DESC
      LIMIT 1
    `).first();
    
    const sessionId = session ? session.session_id : `session_${Date.now()}`;
    
    // 세션이 없으면 자동 생성
    if (!session) {
      await DB.prepare(`
        INSERT INTO update_sessions (session_id, started_at, message_date, status)
        VALUES (?, datetime('now'), ?, 'in_progress')
      `).bind(sessionId, messageDate).run();
    }
    
    const batch = [];
    
    // 메시지 로그 저장
    batch.push(
      DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count, message_date) VALUES (?, ?, ?, ?)'
      ).bind(messageId, messageText, rankings.length, messageDate)
    );
    
    // 새로운 순위 데이터 저장 (update_session_id 포함)
    for (const ranking of rankings) {
      batch.push(
        DB.prepare(
          'INSERT INTO hasie_rankings (category, rank, product_name, product_link, out_rank, message_date, update_session_id) VALUES (?, ?, ?, ?, 0, ?, ?)'
        ).bind(ranking.category, ranking.rank, ranking.productName, ranking.productLink, messageDate, sessionId)
      );
    }
    
    await DB.batch(batch);
    
    return c.json({
      success: true,
      message: 'Rankings saved successfully',
      parsedCount: rankings.length,
      categories: categoriesInMessage
    }, 200);
    
  } catch (error: any) {
    console.error('Webhook error:', error);
    return c.json({ 
      success: true, 
      message: 'Error processed',
      error: error.message 
    }, 200);
  }
});

/**
 * 데이터베이스 초기화
 * DELETE /api/hasie/reset
 */
app.delete('/api/hasie/reset', async (c) => {
  try {
    const { DB } = c.env;
    
    // 모든 데이터 삭제
    await DB.batch([
      DB.prepare('DELETE FROM hasie_rankings'),
      DB.prepare('DELETE FROM telegram_messages')
    ]);
    
    return c.json({
      success: true,
      message: '모든 데이터가 삭제되었습니다'
    });
    
  } catch (error: any) {
    console.error('Reset error:', error);
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// ============================================
// 순위 데이터 조회 API
// ============================================

/**
 * 최신 순위 조회 (각 제품의 최신 순위만, 순위권 내)
 * GET /api/hasie/latest?category=아우터
 */
app.get('/api/hasie/latest', async (c) => {
  try {
    const { DB } = c.env;
    const category = c.req.query('category');
    
    // 각 제품의 최신 순위만 가져오기 (가장 최근 레코드가 out_rank = 0인 것만)
    let query = `
      SELECT 
        h1.id,
        h1.category,
        h1.rank,
        h1.product_name,
        h1.product_link,
        h1.created_at
      FROM hasie_rankings h1
      INNER JOIN (
        SELECT product_link, MAX(created_at) as max_date
        FROM hasie_rankings
        ${category ? 'WHERE category = ?' : ''}
        GROUP BY product_link
      ) h2 ON h1.product_link = h2.product_link AND h1.created_at = h2.max_date
      WHERE h1.out_rank = 0
      ORDER BY h1.rank ASC
    `;
    
    const params: any[] = [];
    if (category) {
      params.push(category);
    }
    
    const stmt = DB.prepare(query);
    const { results } = await stmt.bind(...params).all();
    
    return c.json({
      success: true,
      count: results.length,
      rankings: results
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * Out Rank 조회 (순위권 이탈 제품)
 * GET /api/hasie/out-rank?category=아우터
 */
app.get('/api/hasie/out-rank', async (c) => {
  try {
    const { DB } = c.env;
    const category = c.req.query('category');
    
    // 최신 기록이 OUT인 제품만 가져오기 (최신순위로 복귀한 제품 제외)
    let query = `
      SELECT 
        h1.id,
        h1.category,
        h1.rank as last_rank,
        h1.product_name,
        h1.product_link,
        h1.created_at as out_rank_date
      FROM hasie_rankings h1
      INNER JOIN (
        SELECT product_link, MAX(created_at) as max_date
        FROM hasie_rankings
        GROUP BY product_link
      ) h2 ON h1.product_link = h2.product_link AND h1.created_at = h2.max_date
      WHERE h1.out_rank = 1
      ${category ? 'AND h1.category = ?' : ''}
      ORDER BY h1.created_at DESC
    `;
    
    const params: any[] = [];
    if (category) {
      params.push(category);
    }
    
    const stmt = DB.prepare(query);
    const { results } = await stmt.bind(...params).all();
    
    return c.json({
      success: true,
      count: results.length,
      out_rankings: results
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 카테고리별 순위 통계
 * GET /api/hasie/stats
 */
app.get('/api/hasie/stats', async (c) => {
  try {
    const { DB } = c.env;
    
    const { results } = await DB.prepare(`
      SELECT 
        category,
        COUNT(*) as total_count,
        MIN(rank) as best_rank,
        AVG(rank) as avg_rank,
        MAX(message_date) as last_message_date
      FROM hasie_rankings
      WHERE out_rank = 0
      GROUP BY category
      ORDER BY category
    `).all();
    
    // 전체 마지막 업데이트 시간
    const lastUpdate = await DB.prepare(`
      SELECT MAX(message_date) as last_message_date
      FROM hasie_rankings
      WHERE out_rank = 0
    `).first();
    
    return c.json({
      success: true,
      stats: results,
      last_update: lastUpdate?.last_message_date
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 순위 변동 추이 (시계열 데이터)
 * GET /api/hasie/trends?category=아우터&days=7
 */
app.get('/api/hasie/trends', async (c) => {
  try {
    const { DB } = c.env;
    const category = c.req.query('category');
    const days = parseInt(c.req.query('days') || '7', 10);
    
    if (!category) {
      return c.json({ 
        success: false, 
        error: 'Category parameter is required' 
      }, 400);
    }
    
    const { results } = await DB.prepare(`
      SELECT 
        product_name,
        rank,
        created_at,
        DATE(created_at) as date
      FROM hasie_rankings
      WHERE category = ?
        AND created_at >= datetime('now', '-' || ? || ' days')
      ORDER BY created_at ASC, rank ASC
    `).bind(category, days).all();
    
    return c.json({
      success: true,
      category,
      days,
      count: results.length,
      trends: results
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 전체 카테고리 목록
 * GET /api/hasie/categories
 */
app.get('/api/hasie/categories', async (c) => {
  try {
    const { DB } = c.env;
    
    const { results } = await DB.prepare(`
      SELECT DISTINCT category
      FROM hasie_rankings
      ORDER BY category
    `).all();
    
    return c.json({
      success: true,
      categories: results.map((r: any) => r.category)
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 제품별 순위 변동 추이
 * GET /api/hasie/product-trends?product_link=https://...
 */
app.get('/api/hasie/product-trends', async (c) => {
  try {
    const { DB } = c.env;
    const productLink = c.req.query('product_link');
    
    if (!productLink) {
      return c.json({ 
        success: false, 
        error: 'product_link parameter is required' 
      }, 400);
    }
    
    // 같은 분의 레코드 중 최신 것만 선택 (중복 제거)
    const { results } = await DB.prepare(`
      SELECT 
        h1.id,
        h1.category,
        h1.rank,
        h1.product_name,
        h1.product_link,
        h1.out_rank,
        h1.created_at
      FROM hasie_rankings h1
      INNER JOIN (
        SELECT 
          MAX(id) as max_id,
          strftime('%Y-%m-%d %H:%M', created_at) as time_minute
        FROM hasie_rankings
        WHERE product_link = ?
        GROUP BY strftime('%Y-%m-%d %H:%M', created_at)
      ) h2 ON h1.id = h2.max_id
      ORDER BY h1.created_at ASC
    `).bind(productLink).all();
    
    if (results.length === 0) {
      return c.json({
        success: false,
        error: 'Product not found'
      }, 404);
    }
    
    // 순위 변동 계산
    const trends = results.map((item: any, index: number) => {
      let change = 0;
      let changeType = 'new';
      
      // Out Rank인 경우 순위를 201로 표시
      let displayRank = item.rank;
      if (item.out_rank === 1) {
        displayRank = 201;
      }
      
      if (index > 0) {
        const prevItem = results[index - 1] as any;
        const prevRank = prevItem.out_rank === 1 ? 201 : prevItem.rank;
        change = prevRank - displayRank; // 양수면 순위 상승, 음수면 하락
        
        if (change > 0) {
          changeType = 'up';
        } else if (change < 0) {
          changeType = 'down';
        } else {
          changeType = 'stable';
        }
      }
      
      return {
        ...item,
        rank: displayRank, // 차트에 표시될 순위 (Out Rank = 201)
        original_rank: item.rank, // 원래 순위 값
        rank_change: change,
        change_type: changeType
      };
    });
    
    // 순위권 내 순위만으로 최고/최저 계산
    const inRankResults = results.filter((r: any) => r.out_rank === 0);
    const lastResult = results[results.length - 1] as any;
    
    return c.json({
      success: true,
      product_name: results[0].product_name,
      category: results[0].category,
      current_rank: lastResult.out_rank === 1 ? 201 : lastResult.rank,
      best_rank: inRankResults.length > 0 ? Math.min(...inRankResults.map((r: any) => r.rank)) : 201,
      worst_rank: Math.max(...results.map((r: any) => r.out_rank === 1 ? 201 : r.rank)),
      total_records: results.length,
      trends
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 최신 순위에 순위 변동 정보 포함 (각 제품의 최신 순위만, 순위권 내)
 * GET /api/hasie/latest-with-changes?category=아우터
 */
app.get('/api/hasie/latest-with-changes', async (c) => {
  try {
    const { DB } = c.env;
    const category = c.req.query('category');
    
    // 각 제품의 최신 순위만 가져오기 (가장 최근 레코드가 out_rank = 0인 것만)
    let query = `
      SELECT 
        h1.id,
        h1.category,
        h1.rank,
        h1.product_name,
        h1.product_link,
        h1.created_at,
        h1.out_rank
      FROM hasie_rankings h1
      INNER JOIN (
        SELECT product_link, MAX(created_at) as max_date
        FROM hasie_rankings
        ${category ? 'WHERE category = ?' : ''}
        GROUP BY product_link
      ) h2 ON h1.product_link = h2.product_link AND h1.created_at = h2.max_date
      WHERE h1.out_rank = 0
      ORDER BY h1.rank ASC
    `;
    
    const params: any[] = [];
    if (category) {
      params.push(category);
    }
    
    const stmt = DB.prepare(query);
    const { results } = await stmt.bind(...params).all();
    
    // 각 제품의 바로 이전 순위 조회
    const rankingsWithChanges = await Promise.all(
      results.map(async (item: any) => {
        // 바로 이전 순위 조회 (out_rank = 0인 이전 데이터만)
        const prevRankingResult = await DB.prepare(`
          SELECT rank
          FROM hasie_rankings
          WHERE product_link = ?
            AND created_at < ?
            AND out_rank = 0
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(item.product_link, item.created_at).first();
        
        let rankChange = 0;
        let changeType = 'new';
        
        if (prevRankingResult) {
          const prevRank = prevRankingResult.rank as number;
          rankChange = prevRank - item.rank; // 양수면 상승, 음수면 하락
          
          if (rankChange > 0) {
            changeType = 'up';
          } else if (rankChange < 0) {
            changeType = 'down';
          } else {
            changeType = 'stable';
          }
        }
        
        return {
          ...item,
          rank_change: rankChange,
          change_type: changeType,
          prev_rank: prevRankingResult ? prevRankingResult.rank : null
        };
      })
    );
    
    return c.json({
      success: true,
      count: rankingsWithChanges.length,
      rankings: rankingsWithChanges
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 전체 제품 순위 추이 Export (CSV)
 * GET /api/hasie/export/all
 */
app.get('/api/hasie/export/all', async (c) => {
  try {
    const { DB } = c.env;
    const category = c.req.query('category');
    
    // 모든 제품의 순위 히스토리 조회
    let query = `
      SELECT 
        category,
        rank,
        product_name,
        product_link,
        out_rank,
        created_at,
        message_date
      FROM hasie_rankings
      ${category ? 'WHERE category = ?' : ''}
      ORDER BY message_date DESC, rank ASC
    `;
    
    const params: any[] = [];
    if (category) {
      params.push(category);
    }
    
    const stmt = DB.prepare(query);
    const { results } = await stmt.bind(...params).all();
    
    // CSV 생성
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '카테고리,순위,상품명,상품링크,순위상태,기록시간,메시지시간\n';
    
    results.forEach((row: any) => {
      const status = row.out_rank === 1 ? 'OUT' : '순위권';
      csv += `"${row.category}",${row.rank},"${row.product_name.replace(/"/g, '""')}","${row.product_link}",${status},"${row.created_at}","${row.message_date}"\n`;
    });
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="hasie-rankings-all-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

/**
 * 개별 제품 순위 추이 Export (CSV)
 * GET /api/hasie/export/product?product_link=https://...
 */
app.get('/api/hasie/export/product', async (c) => {
  try {
    const { DB } = c.env;
    const productLink = c.req.query('product_link');
    
    if (!productLink) {
      return c.json({ 
        success: false, 
        error: 'product_link parameter is required' 
      }, 400);
    }
    
    // 제품 정보 조회
    const productInfo = await DB.prepare(`
      SELECT product_name, category
      FROM hasie_rankings
      WHERE product_link = ?
      LIMIT 1
    `).bind(productLink).first();
    
    if (!productInfo) {
      return c.json({ 
        success: false, 
        error: 'Product not found' 
      }, 404);
    }
    
    // 제품 순위 히스토리 조회
    const { results } = await DB.prepare(`
      SELECT 
        rank,
        out_rank,
        created_at,
        message_date
      FROM hasie_rankings
      WHERE product_link = ?
      ORDER BY created_at ASC
    `).bind(productLink).all();
    
    // CSV 생성
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += `상품명: ${productInfo.product_name}\n`;
    csv += `카테고리: ${productInfo.category}\n`;
    csv += `링크: ${productLink}\n`;
    csv += '\n';
    csv += '순위,순위상태,기록시간,메시지시간\n';
    
    results.forEach((row: any) => {
      const status = row.out_rank === 1 ? 'OUT' : '순위권';
      csv += `${row.rank},${status},"${row.created_at}","${row.message_date}"\n`;
    });
    
    const fileName = `hasie-product-${productInfo.product_name.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}-${new Date().toISOString().slice(0, 10)}.csv`;
    
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
    
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: error.message 
    }, 500);
  }
});

// ============================================
// 홈페이지
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>하시에 순위 트래커</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        </style>
    </head>
    <body class="bg-white min-h-screen">
        <div class="max-w-7xl mx-auto px-4 py-6">
            <!-- 헤더 -->
            <div class="border-b border-gray-200 pb-6 mb-6">
                <div class="flex items-start justify-between">
                    <div>
                        <h1 class="text-3xl font-bold text-black mb-2">하시에 순위 트래커</h1>
                        <p class="text-gray-500 text-sm">W컨셉 베스트 순위 실시간 모니터링</p>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-gray-400">마지막 업데이트</div>
                        <div id="lastUpdate" class="text-sm font-semibold text-black mt-1">-</div>
                    </div>
                </div>
            </div>
            
            <!-- 통계 카드 -->
            <div id="stats" class="grid grid-cols-3 gap-4 mb-6">
                <div class="border border-gray-200 p-4">
                    <div class="text-2xl font-bold text-black" id="totalCategories">-</div>
                    <div class="text-gray-500 text-xs mt-1">추적 카테고리</div>
                </div>
                <div class="border border-gray-200 p-4">
                    <div class="text-2xl font-bold text-black" id="totalRankings">-</div>
                    <div class="text-gray-500 text-xs mt-1">추적 제품수</div>
                </div>
                <div class="border border-gray-200 p-4">
                    <div class="text-2xl font-bold text-black" id="bestRank">-</div>
                    <div class="text-gray-500 text-xs mt-1">최고 순위</div>
                </div>
            </div>
            
            <!-- 실시간 연동 버튼 -->
            <div class="border border-gray-200 p-4 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <div class="text-sm font-semibold text-gray-700">실시간 연동</div>
                    <div class="flex gap-2">
                        <button onclick="exportAllData()" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition">
                            <i class="fas fa-download mr-1"></i>전체 Export
                        </button>
                        <button onclick="showImportModal()" class="px-4 py-2 bg-black text-white text-sm hover:bg-gray-800 transition">
                            메시지 입력
                        </button>
                        <button onclick="resetDatabase()" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 transition">
                            초기화
                        </button>
                    </div>
                </div>
                <div class="text-xs text-gray-500">
                    텔레그램 채널의 메시지를 복사해서 붙여넣으세요
                </div>
            </div>
            
            <!-- 카테고리 선택 -->
            <div class="border border-gray-200 p-4 mb-6">
                <div class="text-sm font-semibold text-gray-700 mb-3">카테고리 필터</div>
                <div id="categoryButtons" class="flex flex-wrap gap-2">
                    <button onclick="loadRankings()" class="px-3 py-1.5 text-sm bg-black text-white hover:bg-gray-800 transition">
                        전체
                    </button>
                </div>
            </div>
            
            <!-- 순위 탭 -->
            <div class="border border-gray-200">
                <!-- 탭 헤더 -->
                <div class="border-b border-gray-200 px-4 py-3 flex items-center gap-4">
                    <button onclick="switchTab('latest')" id="tabLatest" class="text-lg font-bold text-black border-b-2 border-black pb-1">
                        최신 순위
                    </button>
                    <button onclick="switchTab('outrank')" id="tabOutrank" class="text-lg font-bold text-gray-400 hover:text-black pb-1">
                        Out Rank
                    </button>
                </div>
                
                <!-- 최신 순위 탭 -->
                <div id="rankingsTab" class="divide-y divide-gray-200">
                    <p class="text-gray-500 text-center py-8 text-sm">로딩 중...</p>
                </div>
                
                <!-- Out Rank 탭 (숨김) -->
                <div id="outrankTab" class="divide-y divide-gray-200 hidden">
                    <p class="text-gray-500 text-center py-8 text-sm">로딩 중...</p>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
        <script src="/static/app.js?v=${Date.now()}"></script>
    </body>
    </html>
  `)
})

export default app
