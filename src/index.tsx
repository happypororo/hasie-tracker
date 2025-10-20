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
 * 텔레그램 봇 웹훅 수신
 * POST /api/telegram/webhook
 */
app.post('/api/telegram/webhook', async (c) => {
  try {
    const update = await c.req.json();
    const { DB } = c.env;
    
    // 메시지가 있는지 확인
    if (!update.message || !update.message.text) {
      return c.json({ success: false, error: 'No message text' }, 400);
    }
    
    const messageId = update.message.message_id;
    const messageText = update.message.text;
    
    // 이미 처리된 메시지인지 확인
    const existingMessage = await DB.prepare(
      'SELECT id FROM telegram_messages WHERE message_id = ?'
    ).bind(messageId).first();
    
    if (existingMessage) {
      return c.json({ success: false, error: 'Message already processed' }, 200);
    }
    
    // 메시지 파싱
    const rankings = parseMultipleCategoryRankings(messageText);
    
    if (rankings.length === 0) {
      // 파싱 실패해도 메시지 로그는 저장
      await DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count) VALUES (?, ?, ?)'
      ).bind(messageId, messageText, 0).run();
      
      return c.json({ 
        success: true, 
        message: 'No rankings found in message',
        parsedCount: 0
      });
    }
    
    // 트랜잭션으로 데이터 저장
    const batch = [];
    
    // 메시지 로그 저장
    batch.push(
      DB.prepare(
        'INSERT INTO telegram_messages (message_id, message_text, parsed_count) VALUES (?, ?, ?)'
      ).bind(messageId, messageText, rankings.length)
    );
    
    // 순위 데이터 저장
    for (const ranking of rankings) {
      batch.push(
        DB.prepare(
          'INSERT INTO hasie_rankings (category, rank, product_name, product_link) VALUES (?, ?, ?, ?)'
        ).bind(ranking.category, ranking.rank, ranking.productName, ranking.productLink)
      );
    }
    
    await DB.batch(batch);
    
    return c.json({
      success: true,
      message: 'Rankings saved successfully',
      parsedCount: rankings.length,
      rankings: rankings.map(r => ({
        category: r.category,
        rank: r.rank,
        productName: r.productName
      }))
    });
    
  } catch (error: any) {
    console.error('Webhook error:', error);
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
 * 최신 순위 조회
 * GET /api/hasie/latest?category=아우터&limit=10
 */
app.get('/api/hasie/latest', async (c) => {
  try {
    const { DB } = c.env;
    const category = c.req.query('category');
    const limit = parseInt(c.req.query('limit') || '50', 10);
    
    let query = `
      SELECT 
        id,
        category,
        rank,
        product_name,
        product_link,
        created_at
      FROM hasie_rankings
    `;
    
    const params: any[] = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY created_at DESC, rank ASC LIMIT ?';
    params.push(limit);
    
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
        MAX(created_at) as last_updated
      FROM hasie_rankings
      GROUP BY category
      ORDER BY category
    `).all();
    
    return c.json({
      success: true,
      stats: results
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
    </head>
    <body class="bg-gradient-to-br from-purple-50 to-blue-50 min-h-screen">
        <div class="container mx-auto px-4 py-8">
            <!-- 헤더 -->
            <div class="text-center mb-8">
                <h1 class="text-4xl font-bold text-purple-900 mb-2">
                    <i class="fas fa-chart-line mr-2"></i>
                    하시에 순위 트래커
                </h1>
                <p class="text-gray-600">W컨셉 베스트 순위 실시간 모니터링</p>
            </div>
            
            <!-- 통계 카드 -->
            <div id="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow-lg p-6 text-center">
                    <div class="text-3xl font-bold text-purple-600" id="totalCategories">-</div>
                    <div class="text-gray-600 mt-2">추적 카테고리</div>
                </div>
                <div class="bg-white rounded-lg shadow-lg p-6 text-center">
                    <div class="text-3xl font-bold text-blue-600" id="totalRankings">-</div>
                    <div class="text-gray-600 mt-2">총 순위 데이터</div>
                </div>
                <div class="bg-white rounded-lg shadow-lg p-6 text-center">
                    <div class="text-3xl font-bold text-green-600" id="bestRank">-</div>
                    <div class="text-gray-600 mt-2">최고 순위</div>
                </div>
            </div>
            
            <!-- 카테고리 선택 -->
            <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-filter mr-2"></i>
                    카테고리 필터
                </h2>
                <div id="categoryButtons" class="flex flex-wrap gap-2">
                    <button onclick="loadRankings()" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                        전체
                    </button>
                </div>
            </div>
            
            <!-- 최신 순위 -->
            <div class="bg-white rounded-lg shadow-lg p-6">
                <h2 class="text-2xl font-bold text-gray-800 mb-4">
                    <i class="fas fa-trophy mr-2"></i>
                    최신 순위
                </h2>
                <div id="rankings" class="space-y-4">
                    <p class="text-gray-500 text-center py-8">로딩 중...</p>
                </div>
            </div>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
