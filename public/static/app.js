// 초간단 하시에 트래커 JavaScript

const API_BASE = '/api/hasie';
let chart = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadLatestRankings();
  loadCategories();
  initChart();
});

// ============================================
// 모달 관리
// ============================================

function showImportModal() {
  document.getElementById('import-modal').classList.remove('hidden');
  document.getElementById('telegram-message').focus();
}

function hideImportModal() {
  document.getElementById('import-modal').classList.add('hidden');
  document.getElementById('telegram-message').value = '';
}

// ============================================
// 메시지 가져오기
// ============================================

async function importMessage() {
  const message = document.getElementById('telegram-message').value;

  if (!message.trim()) {
    alert('메시지를 입력해주세요!');
    return;
  }

  try {
    const response = await axios.post(`${API_BASE}/import`, { message });

    if (response.data.success) {
      alert(`✅ ${response.data.message}`);
      hideImportModal();
      
      // 화면 새로고침
      loadLatestRankings();
      loadCategories();
    } else {
      alert(`❌ ${response.data.error}`);
    }
  } catch (error) {
    console.error('Import error:', error);
    alert('❌ 가져오기 실패: ' + (error.response?.data?.error || error.message));
  }
}

// ============================================
// 최신 순위 로드
// ============================================

async function loadLatestRankings() {
  try {
    const response = await axios.get(`${API_BASE}/latest`);
    const rankings = response.data.data;

    if (!rankings || rankings.length === 0) {
      document.getElementById('latest-rankings').innerHTML = `
        <div class="text-center py-12 col-span-full">
          <i class="fas fa-inbox text-gray-300 text-6xl mb-4"></i>
          <p class="text-gray-500">아직 순위 데이터가 없습니다</p>
          <p class="text-gray-400 text-sm mt-2">텔레그램 메시지를 붙여넣어주세요</p>
        </div>
      `;
      return;
    }

    // 카테고리별 그룹화
    const byCategory = {};
    rankings.forEach(r => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = [];
      }
      byCategory[r.category].push(r);
    });

    // 카드 렌더링
    let html = '';
    for (const [category, items] of Object.entries(byCategory)) {
      items.sort((a, b) => a.rank - b.rank);
      
      html += `
        <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
          <div class="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3">
            <h3 class="text-white font-bold text-lg">${category}</h3>
            <p class="text-purple-100 text-sm">${items.length}개 상품</p>
          </div>
          <div class="p-4 space-y-3">
            ${items.map(item => {
              const productId = item.product_link.match(/Product\\/?(\\d+)/)?.[1] || '';
              return `
              <a href="${item.product_link}" target="_blank" class="block group">
                <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-purple-200">
                  <div class="flex-shrink-0 relative">
                    <div class="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex flex-col items-center justify-center text-white shadow-lg overflow-hidden group-hover:scale-105 transition-transform">
                      <div class="text-xs opacity-90 font-medium mb-1">하시에</div>
                      <div class="text-3xl font-bold">${item.rank}</div>
                      <div class="text-xs opacity-90 mt-1">순위</div>
                      ${productId ? `<div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-30 text-white text-[10px] text-center py-0.5">#${productId}</div>` : ''}
                    </div>
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-2">
                      <span class="text-xs text-gray-500">
                        <i class="far fa-clock mr-1"></i>${formatDate(item.created_at)}
                      </span>
                      <span class="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                        ${item.rank}위
                      </span>
                    </div>
                    <p class="text-sm font-semibold text-gray-900 line-clamp-2 mb-3 group-hover:text-purple-600 transition leading-snug">${item.product_name}</p>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center text-xs text-blue-600 group-hover:text-blue-700 font-medium">
                        <i class="fas fa-shopping-bag mr-1"></i>
                        <span>W컨셉에서 보기</span>
                      </div>
                      <i class="fas fa-arrow-right text-gray-400 group-hover:text-purple-500 group-hover:translate-x-1 transition"></i>
                    </div>
                  </div>
                </div>
              </a>
            `}).join('')}
          </div>
        </div>
      `;
    }

    document.getElementById('latest-rankings').innerHTML = html;
  } catch (error) {
    console.error('Failed to load rankings:', error);
    document.getElementById('latest-rankings').innerHTML = `
      <div class="text-center py-12 col-span-full">
        <i class="fas fa-exclamation-triangle text-red-400 text-6xl mb-4"></i>
        <p class="text-gray-500">순위를 불러올 수 없습니다</p>
      </div>
    `;
  }
}

// ============================================
// 카테고리 로드
// ============================================

async function loadCategories() {
  try {
    const response = await axios.get(`${API_BASE}/categories`);
    const categories = response.data.data;

    const select = document.getElementById('chart-category');
    select.innerHTML = '<option value="">카테고리 선택...</option>' +
      categories.map(c => `<option value="${c.category}">${c.category}</option>`).join('');
  } catch (error) {
    console.error('Failed to load categories:', error);
  }
}

// ============================================
// 차트
// ============================================

function initChart() {
  const ctx = document.getElementById('ranking-chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: '순위',
        data: [],
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          title: {
            display: true,
            text: '순위 (낮을수록 좋음)'
          }
        },
        x: {
          title: {
            display: true,
            text: '날짜'
          }
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function(context) {
              return `순위: ${context.parsed.y}위`;
            }
          }
        }
      }
    }
  });
}

async function updateChart() {
  const category = document.getElementById('chart-category').value;

  if (!category) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    return;
  }

  try {
    const response = await axios.get(`${API_BASE}/history/${encodeURIComponent(category)}?limit=30`);
    const history = response.data.data;

    chart.data.labels = history.map(h => formatDate(h.created_at));
    chart.data.datasets[0].data = history.map(h => h.rank);
    chart.update();
  } catch (error) {
    console.error('Failed to update chart:', error);
  }
}

// ============================================
// 유틸리티
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}
