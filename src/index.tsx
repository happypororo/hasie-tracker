import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import type { Env, Category, Ranking, CrawlResult, ApiResponse } from './types';
import { scrapeWconcept, findHasieRank } from './scraper';

const app = new Hono<{ Bindings: Env }>();

// CORS 설정
app.use('/api/*', cors());

// 정적 파일 제공
app.use('/static/*', serveStatic({ root: './public' }));

// ============================================
// API 라우트
// ============================================

/**
 * GET /api/categories - 모든 카테고리 조회
 */
app.get('/api/categories', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE active = 1 ORDER BY id'
    ).all<Category>();

    return c.json<ApiResponse<Category[]>>({
      success: true,
      data: results,
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/categories - 새 카테고리 추가
 */
app.post('/api/categories', async (c) => {
  try {
    const { name, url } = await c.req.json<{ name: string; url: string }>();

    if (!name || !url) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: 'Name and URL are required',
        },
        400
      );
    }

    const result = await c.env.DB.prepare(
      'INSERT INTO categories (name, url) VALUES (?, ?)'
    )
      .bind(name, url)
      .run();

    return c.json<ApiResponse>({
      success: true,
      message: 'Category added successfully',
      data: { id: result.meta.last_row_id },
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * PUT /api/categories/:id - 카테고리 수정
 */
app.put('/api/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const { name, url, active } = await c.req.json<{
      name?: string;
      url?: string;
      active?: number;
    }>();

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (url !== undefined) {
      updates.push('url = ?');
      values.push(url);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active);
    }

    if (updates.length === 0) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: 'No fields to update',
        },
        400
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await c.env.DB.prepare(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`
    )
      .bind(...values)
      .run();

    return c.json<ApiResponse>({
      success: true,
      message: 'Category updated successfully',
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * DELETE /api/categories/:id - 카테고리 삭제
 */
app.delete('/api/categories/:id', async (c) => {
  try {
    const id = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM categories WHERE id = ?')
      .bind(id)
      .run();

    return c.json<ApiResponse>({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/crawl/:categoryId - 특정 카테고리 크롤링 (수동)
 */
app.post('/api/crawl/:categoryId', async (c) => {
  try {
    const categoryId = parseInt(c.req.param('categoryId'));

    // 카테고리 정보 조회
    const category = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE id = ? AND active = 1'
    )
      .bind(categoryId)
      .first<Category>();

    if (!category) {
      return c.json<ApiResponse>(
        {
          success: false,
          error: 'Category not found or inactive',
        },
        404
      );
    }

    // 크롤링 실행
    const brands = await scrapeWconcept(category.url, c.env);
    const hasieRank = findHasieRank(brands);

    // 결과 저장
    const crawledAt = new Date().toISOString();

    // 순위 기록 저장
    for (const brand of brands) {
      await c.env.DB.prepare(
        'INSERT INTO rankings (category_id, brand_name, rank_position, crawled_at) VALUES (?, ?, ?, ?)'
      )
        .bind(categoryId, brand.name, brand.rank, crawledAt)
        .run();
    }

    // 크롤링 로그 저장
    await c.env.DB.prepare(
      'INSERT INTO crawl_logs (category_id, status, crawled_at) VALUES (?, ?, ?)'
    )
      .bind(categoryId, 'success', crawledAt)
      .run();

    const result: CrawlResult = {
      category_id: categoryId,
      category_name: category.name,
      url: category.url,
      brands: brands,
      hasie_rank: hasieRank,
      crawled_at: crawledAt,
    };

    return c.json<ApiResponse<CrawlResult>>({
      success: true,
      data: result,
      message: hasieRank
        ? `하시에는 ${hasieRank}위입니다`
        : '하시에를 찾을 수 없습니다',
    });
  } catch (error) {
    // 실패 로그 저장
    const categoryId = parseInt(c.req.param('categoryId'));
    await c.env.DB.prepare(
      'INSERT INTO crawl_logs (category_id, status, error_message, crawled_at) VALUES (?, ?, ?, ?)'
    )
      .bind(
        categoryId,
        'failed',
        error instanceof Error ? error.message : 'Unknown error',
        new Date().toISOString()
      )
      .run();

    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * POST /api/crawl/all - 모든 활성 카테고리 크롤링
 */
app.post('/api/crawl/all', async (c) => {
  try {
    const { results: categories } = await c.env.DB.prepare(
      'SELECT * FROM categories WHERE active = 1'
    ).all<Category>();

    const results: CrawlResult[] = [];

    for (const category of categories) {
      try {
        const brands = await scrapeWconcept(category.url, c.env);
        const hasieRank = findHasieRank(brands);
        const crawledAt = new Date().toISOString();

        // 순위 기록 저장
        for (const brand of brands) {
          await c.env.DB.prepare(
            'INSERT INTO rankings (category_id, brand_name, rank_position, crawled_at) VALUES (?, ?, ?, ?)'
          )
            .bind(category.id, brand.name, brand.rank, crawledAt)
            .run();
        }

        // 성공 로그
        await c.env.DB.prepare(
          'INSERT INTO crawl_logs (category_id, status, crawled_at) VALUES (?, ?, ?)'
        )
          .bind(category.id, 'success', crawledAt)
          .run();

        results.push({
          category_id: category.id,
          category_name: category.name,
          url: category.url,
          brands: brands,
          hasie_rank: hasieRank,
          crawled_at: crawledAt,
        });
      } catch (error) {
        // 실패 로그
        await c.env.DB.prepare(
          'INSERT INTO crawl_logs (category_id, status, error_message, crawled_at) VALUES (?, ?, ?, ?)'
        )
          .bind(
            category.id,
            'failed',
            error instanceof Error ? error.message : 'Unknown error',
            new Date().toISOString()
          )
          .run();
      }
    }

    return c.json<ApiResponse<CrawlResult[]>>({
      success: true,
      data: results,
      message: `${results.length}/${categories.length} 카테고리 크롤링 완료`,
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/rankings/:categoryId - 특정 카테고리의 순위 이력
 */
app.get('/api/rankings/:categoryId', async (c) => {
  try {
    const categoryId = c.req.param('categoryId');
    const limit = c.req.query('limit') || '100';

    const { results } = await c.env.DB.prepare(
      `SELECT * FROM rankings 
       WHERE category_id = ? 
       ORDER BY crawled_at DESC 
       LIMIT ?`
    )
      .bind(categoryId, parseInt(limit))
      .all<Ranking>();

    return c.json<ApiResponse<Ranking[]>>({
      success: true,
      data: results,
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/rankings/hasie/latest - 하시에의 최신 순위 (모든 카테고리)
 */
app.get('/api/rankings/hasie/latest', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT 
         r.*,
         c.name as category_name,
         c.url as category_url
       FROM rankings r
       JOIN categories c ON r.category_id = c.id
       WHERE r.brand_name LIKE '%하시에%'
       AND r.crawled_at IN (
         SELECT MAX(crawled_at) 
         FROM rankings 
         WHERE category_id = r.category_id
       )
       ORDER BY r.rank_position`
    ).all();

    return c.json<ApiResponse>({
      success: true,
      data: results,
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/rankings/hasie/history - 하시에 순위 변동 이력
 */
app.get('/api/rankings/hasie/history', async (c) => {
  try {
    const categoryId = c.req.query('categoryId');
    const limit = c.req.query('limit') || '50';

    let query = `
      SELECT 
        r.*,
        c.name as category_name
      FROM rankings r
      JOIN categories c ON r.category_id = c.id
      WHERE r.brand_name LIKE '%하시에%'
    `;

    const params: any[] = [];

    if (categoryId) {
      query += ' AND r.category_id = ?';
      params.push(parseInt(categoryId));
    }

    query += ' ORDER BY r.crawled_at DESC LIMIT ?';
    params.push(parseInt(limit));

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json<ApiResponse>({
      success: true,
      data: results,
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

/**
 * GET /api/logs - 크롤링 로그 조회
 */
app.get('/api/logs', async (c) => {
  try {
    const limit = c.req.query('limit') || '50';

    const { results } = await c.env.DB.prepare(
      `SELECT 
         l.*,
         c.name as category_name
       FROM crawl_logs l
       LEFT JOIN categories c ON l.category_id = c.id
       ORDER BY l.crawled_at DESC
       LIMIT ?`
    )
      .bind(parseInt(limit))
      .all();

    return c.json<ApiResponse>({
      success: true,
      data: results,
    });
  } catch (error) {
    return c.json<ApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});

// ============================================
// 프론트엔드
// ============================================

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>W컨셉 순위 추적 시스템</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen">
            <!-- Header -->
            <header class="bg-white shadow-sm border-b">
                <div class="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
                    <div class="flex items-center justify-between">
                        <h1 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-chart-line mr-2 text-blue-600"></i>
                            W컨셉 하시에 순위 추적
                        </h1>
                        <div class="flex gap-2">
                            <button onclick="crawlAll()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                <i class="fas fa-sync-alt mr-2"></i>전체 크롤링
                            </button>
                            <button onclick="showAddCategory()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                                <i class="fas fa-plus mr-2"></i>카테고리 추가
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <!-- Main Content -->
            <main class="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
                <!-- 최신 순위 현황 -->
                <section class="mb-8">
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-trophy mr-2 text-yellow-500"></i>
                        하시에 최신 순위
                    </h2>
                    <div id="latest-rankings" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div class="text-center py-8 col-span-full">
                            <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
                            <p class="mt-4 text-gray-600">순위 정보를 불러오는 중...</p>
                        </div>
                    </div>
                </section>

                <!-- 순위 변동 차트 -->
                <section class="mb-8 bg-white rounded-lg shadow p-6">
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-chart-area mr-2 text-purple-600"></i>
                        순위 변동 추이
                    </h2>
                    <div class="mb-4">
                        <select id="chart-category" onchange="updateChart()" class="px-4 py-2 border rounded-lg">
                            <option value="">카테고리 선택...</option>
                        </select>
                    </div>
                    <canvas id="ranking-chart" height="100"></canvas>
                </section>

                <!-- 카테고리 관리 -->
                <section class="mb-8">
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-list mr-2 text-green-600"></i>
                        카테고리 관리
                    </h2>
                    <div id="categories-list" class="bg-white rounded-lg shadow overflow-hidden">
                        <div class="text-center py-8">
                            <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
                        </div>
                    </div>
                </section>

                <!-- 크롤링 로그 -->
                <section>
                    <h2 class="text-xl font-bold text-gray-900 mb-4">
                        <i class="fas fa-history mr-2 text-gray-600"></i>
                        크롤링 로그
                    </h2>
                    <div id="crawl-logs" class="bg-white rounded-lg shadow overflow-hidden">
                        <div class="text-center py-8">
                            <i class="fas fa-spinner fa-spin text-4xl text-gray-400"></i>
                        </div>
                    </div>
                </section>
            </main>
        </div>

        <!-- 모달 (카테고리 추가) -->
        <div id="add-category-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-lg font-bold mb-4">카테고리 추가</h3>
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">카테고리 이름</label>
                        <input id="new-category-name" type="text" class="w-full px-3 py-2 border rounded-lg" placeholder="예: 슬랙스">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
                        <input id="new-category-url" type="text" class="w-full px-3 py-2 border rounded-lg" placeholder="https://display.wconcept.co.kr/...">
                    </div>
                </div>
                <div class="mt-6 flex gap-2 justify-end">
                    <button onclick="hideAddCategory()" class="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                        취소
                    </button>
                    <button onclick="addCategory()" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        추가
                    </button>
                </div>
            </div>
        </div>

        <script src="/static/app.js"></script>
    </body>
    </html>
  `);
});

export default app;
