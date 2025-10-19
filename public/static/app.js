// API 기본 URL
const API_BASE = '/api';

// 전역 상태
let categories = [];
let chart = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadLatestRankings();
  loadCrawlLogs();
  initChart();
});

// ============================================
// 카테고리 관리
// ============================================

async function loadCategories() {
  try {
    const response = await axios.get(`${API_BASE}/categories`);
    categories = response.data.data;
    
    renderCategories();
    updateCategorySelect();
  } catch (error) {
    console.error('Failed to load categories:', error);
    showError('카테고리 로드 실패');
  }
}

function renderCategories() {
  const container = document.getElementById('categories-list');
  
  if (categories.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-inbox text-4xl mb-2"></i>
        <p>등록된 카테고리가 없습니다</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">작업</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        ${categories.map(cat => `
          <tr>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="text-sm font-medium text-gray-900">${cat.name}</div>
            </td>
            <td class="px-6 py-4">
              <div class="text-sm text-gray-500 truncate max-w-md" title="${cat.url}">
                ${cat.url}
              </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs rounded-full ${cat.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${cat.active ? '활성' : '비활성'}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
              <button onclick="crawlCategory(${cat.id})" class="text-blue-600 hover:text-blue-900 mr-3" title="크롤링">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button onclick="toggleCategory(${cat.id}, ${cat.active})" class="text-yellow-600 hover:text-yellow-900 mr-3" title="${cat.active ? '비활성화' : '활성화'}">
                <i class="fas fa-${cat.active ? 'pause' : 'play'}"></i>
              </button>
              <button onclick="deleteCategory(${cat.id})" class="text-red-600 hover:text-red-900" title="삭제">
                <i class="fas fa-trash"></i>
              </button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function updateCategorySelect() {
  const select = document.getElementById('chart-category');
  select.innerHTML = '<option value="">카테고리 선택...</option>' +
    categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
}

function showAddCategory() {
  document.getElementById('add-category-modal').classList.remove('hidden');
}

function hideAddCategory() {
  document.getElementById('add-category-modal').classList.add('hidden');
  document.getElementById('new-category-name').value = '';
  document.getElementById('new-category-url').value = '';
}

async function addCategory() {
  const name = document.getElementById('new-category-name').value.trim();
  const url = document.getElementById('new-category-url').value.trim();

  if (!name || !url) {
    alert('이름과 URL을 모두 입력해주세요');
    return;
  }

  try {
    await axios.post(`${API_BASE}/categories`, { name, url });
    hideAddCategory();
    loadCategories();
    showSuccess('카테고리가 추가되었습니다');
  } catch (error) {
    console.error('Failed to add category:', error);
    showError('카테고리 추가 실패');
  }
}

async function toggleCategory(id, currentActive) {
  try {
    await axios.put(`${API_BASE}/categories/${id}`, {
      active: currentActive ? 0 : 1
    });
    loadCategories();
    showSuccess(currentActive ? '카테고리가 비활성화되었습니다' : '카테고리가 활성화되었습니다');
  } catch (error) {
    console.error('Failed to toggle category:', error);
    showError('카테고리 상태 변경 실패');
  }
}

async function deleteCategory(id) {
  if (!confirm('정말 이 카테고리를 삭제하시겠습니까?')) {
    return;
  }

  try {
    await axios.delete(`${API_BASE}/categories/${id}`);
    loadCategories();
    showSuccess('카테고리가 삭제되었습니다');
  } catch (error) {
    console.error('Failed to delete category:', error);
    showError('카테고리 삭제 실패');
  }
}

// ============================================
// 크롤링
// ============================================

async function crawlCategory(id) {
  const btn = event.target.closest('button');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;

  try {
    const response = await axios.post(`${API_BASE}/crawl/${id}`);
    showSuccess(response.data.message || '크롤링 완료');
    loadLatestRankings();
    loadCrawlLogs();
  } catch (error) {
    console.error('Failed to crawl:', error);
    showError('크롤링 실패: ' + (error.response?.data?.error || error.message));
  } finally {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

async function crawlAll() {
  const btn = event.target;
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>크롤링 중...';
  btn.disabled = true;

  try {
    const response = await axios.post(`${API_BASE}/crawl/all`);
    showSuccess(response.data.message || '전체 크롤링 완료');
    loadLatestRankings();
    loadCrawlLogs();
  } catch (error) {
    console.error('Failed to crawl all:', error);
    showError('크롤링 실패: ' + (error.response?.data?.error || error.message));
  } finally {
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }
}

// ============================================
// 순위 표시
// ============================================

async function loadLatestRankings() {
  try {
    const response = await axios.get(`${API_BASE}/rankings/hasie/latest`);
    const rankings = response.data.data;
    
    renderLatestRankings(rankings);
  } catch (error) {
    console.error('Failed to load latest rankings:', error);
    document.getElementById('latest-rankings').innerHTML = `
      <div class="text-center py-8 col-span-full text-red-600">
        <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
        <p>순위 정보를 불러올 수 없습니다</p>
      </div>
    `;
  }
}

function renderLatestRankings(rankings) {
  const container = document.getElementById('latest-rankings');
  
  if (rankings.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 col-span-full text-gray-500">
        <i class="fas fa-search text-4xl mb-2"></i>
        <p>아직 크롤링된 데이터가 없습니다</p>
        <button onclick="crawlAll()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          지금 크롤링하기
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = rankings.map(r => {
    const rankClass = r.rank_position <= 10 ? 'bg-yellow-100 text-yellow-800' :
                      r.rank_position <= 30 ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800';
    
    return `
      <div class="bg-white rounded-lg shadow p-4 border-l-4 ${r.rank_position <= 10 ? 'border-yellow-400' : 'border-gray-300'}">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-medium text-gray-900">${r.category_name}</h3>
          <span class="px-3 py-1 text-2xl font-bold ${rankClass} rounded-lg">
            ${r.rank_position}위
          </span>
        </div>
        <p class="text-sm text-gray-500">
          <i class="fas fa-clock mr-1"></i>
          ${formatDate(r.crawled_at)}
        </p>
      </div>
    `;
  }).join('');
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
        label: '하시에 순위',
        data: [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
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
            text: '순위'
          }
        },
        x: {
          title: {
            display: true,
            text: '시간'
          }
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
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
  const categoryId = document.getElementById('chart-category').value;
  
  if (!categoryId) {
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update();
    return;
  }

  try {
    const response = await axios.get(`${API_BASE}/rankings/hasie/history?categoryId=${categoryId}&limit=30`);
    const history = response.data.data.reverse(); // 시간순 정렬

    chart.data.labels = history.map(h => formatDate(h.crawled_at));
    chart.data.datasets[0].data = history.map(h => h.rank_position);
    chart.update();
  } catch (error) {
    console.error('Failed to update chart:', error);
    showError('차트 업데이트 실패');
  }
}

// ============================================
// 로그
// ============================================

async function loadCrawlLogs() {
  try {
    const response = await axios.get(`${API_BASE}/logs?limit=20`);
    const logs = response.data.data;
    
    renderCrawlLogs(logs);
  } catch (error) {
    console.error('Failed to load logs:', error);
    document.getElementById('crawl-logs').innerHTML = `
      <div class="text-center py-8 text-red-600">
        <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
        <p>로그를 불러올 수 없습니다</p>
      </div>
    `;
  }
}

function renderCrawlLogs(logs) {
  const container = document.getElementById('crawl-logs');
  
  if (logs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-inbox text-4xl mb-2"></i>
        <p>크롤링 로그가 없습니다</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">시간</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">카테고리</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">에러</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        ${logs.map(log => `
          <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              ${formatDate(log.crawled_at)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
              ${log.category_name || '-'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="px-2 py-1 text-xs rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                ${log.status === 'success' ? '성공' : '실패'}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-red-600">
              ${log.error_message || '-'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ============================================
// 유틸리티
// ============================================

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  // 1시간 이내
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}분 전`;
  }
  
  // 24시간 이내
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}시간 전`;
  }
  
  // 그 외
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showSuccess(message) {
  // 간단한 토스트 알림 (실제로는 toast 라이브러리 사용 권장)
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function showError(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
  toast.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i>${message}`;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
