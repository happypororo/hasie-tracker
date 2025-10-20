// 하시에 순위 트래커 프론트엔드

let currentCategory = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadCategories();
  loadRankings();
  
  // 5분마다 자동 새로고침
  setInterval(() => {
    loadStats();
    loadRankings(currentCategory);
  }, 5 * 60 * 1000);
});

// 통계 데이터 로드
async function loadStats() {
  try {
    const response = await axios.get('/api/hasie/stats');
    
    if (response.data.success) {
      const stats = response.data.stats;
      
      // 총 카테고리 수
      document.getElementById('totalCategories').textContent = stats.length;
      
      // 총 순위 데이터 수
      const totalRankings = stats.reduce((sum, s) => sum + s.total_count, 0);
      document.getElementById('totalRankings').textContent = totalRankings;
      
      // 최고 순위
      const bestRank = Math.min(...stats.map(s => s.best_rank));
      document.getElementById('bestRank').textContent = `${bestRank}위`;
    }
  } catch (error) {
    console.error('통계 로드 실패:', error);
  }
}

// 카테고리 목록 로드
async function loadCategories() {
  try {
    const response = await axios.get('/api/hasie/categories');
    
    if (response.data.success) {
      const categories = response.data.categories;
      const container = document.getElementById('categoryButtons');
      
      // 전체 버튼은 이미 HTML에 있으므로, 카테고리 버튼만 추가
      categories.forEach(category => {
        const button = document.createElement('button');
        button.textContent = category;
        button.className = 'px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition';
        button.onclick = () => loadRankings(category);
        container.appendChild(button);
      });
    }
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
  }
}

// 순위 데이터 로드 (순위 변동 정보 포함)
async function loadRankings(category = null) {
  try {
    currentCategory = category;
    
    let url = '/api/hasie/latest-with-changes?limit=50';
    if (category) {
      url += `&category=${encodeURIComponent(category)}`;
    }
    
    const response = await axios.get(url);
    
    if (response.data.success) {
      displayRankings(response.data.rankings);
    }
  } catch (error) {
    console.error('순위 로드 실패:', error);
    document.getElementById('rankings').innerHTML = `
      <p class="text-red-500 text-center py-8">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        데이터를 불러오는데 실패했습니다.
      </p>
    `;
  }
}

// 순위 데이터 표시
function displayRankings(rankings) {
  const container = document.getElementById('rankings');
  
  if (rankings.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500 text-center py-8">
        <i class="fas fa-inbox mr-2"></i>
        순위 데이터가 없습니다.
      </p>
    `;
    return;
  }
  
  // 카테고리별로 그룹화
  const groupedByCategory = {};
  rankings.forEach(item => {
    if (!groupedByCategory[item.category]) {
      groupedByCategory[item.category] = [];
    }
    groupedByCategory[item.category].push(item);
  });
  
  // HTML 생성
  let html = '';
  
  for (const [category, items] of Object.entries(groupedByCategory)) {
    html += `
      <div class="mb-8">
        <h3 class="text-xl font-bold text-purple-900 mb-4 flex items-center">
          <span class="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-lg mr-2">
            ${category}
          </span>
          <span class="text-sm text-gray-500 font-normal">${items.length}개 상품</span>
        </h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    `;
    
    items.forEach(item => {
      const rankColor = getRankColor(item.rank);
      const rankBadge = getRankBadge(item.rank);
      const changeIndicator = getRankChangeIndicator(item.rank_change, item.change_type);
      
      html += `
        <div class="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border-l-4 ${rankColor}">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              ${rankBadge}
              <div>
                <div class="flex items-center gap-2">
                  <div class="text-2xl font-bold text-gray-800">${item.rank}위</div>
                  ${changeIndicator}
                </div>
                <div class="text-xs text-gray-500">${formatDate(item.created_at)}</div>
              </div>
            </div>
          </div>
          
          <h4 class="text-sm font-semibold text-gray-800 mb-3 line-clamp-2 min-h-[40px]">
            ${escapeHtml(item.product_name)}
          </h4>
          
          <div class="flex items-center justify-between">
            <a href="${item.product_link}" 
               target="_blank" 
               class="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium transition">
              상품 보기
              <i class="fas fa-external-link-alt ml-1 text-xs"></i>
            </a>
            
            <button onclick="showProductTrends('${escapeHtml(item.product_link)}', '${escapeHtml(item.product_name)}')"
                    class="text-xs text-gray-500 hover:text-gray-700 transition">
              <i class="fas fa-chart-line mr-1"></i>
              동향
            </button>
          </div>
        </div>
      `;
    });
    
    html += `
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

// 순위에 따른 색상 반환
function getRankColor(rank) {
  if (rank <= 10) return 'border-yellow-400';
  if (rank <= 30) return 'border-purple-400';
  if (rank <= 50) return 'border-blue-400';
  return 'border-gray-300';
}

// 순위 뱃지 반환
function getRankBadge(rank) {
  if (rank === 1) {
    return '<div class="text-3xl">🥇</div>';
  } else if (rank === 2) {
    return '<div class="text-3xl">🥈</div>';
  } else if (rank === 3) {
    return '<div class="text-3xl">🥉</div>';
  } else if (rank <= 10) {
    return '<div class="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-white font-bold text-sm">TOP</div>';
  } else if (rank <= 30) {
    return '<div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-sm">★</div>';
  } else {
    return '<div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold text-sm">•</div>';
  }
}

// 날짜 포맷
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // 초 단위 차이
  
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 순위 변동 표시
function getRankChangeIndicator(change, changeType) {
  if (changeType === 'new') {
    return '<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">NEW</span>';
  } else if (changeType === 'up') {
    return `<span class="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
      <i class="fas fa-arrow-up"></i> ${change}
    </span>`;
  } else if (changeType === 'down') {
    return `<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
      <i class="fas fa-arrow-down"></i> ${Math.abs(change)}
    </span>`;
  } else if (changeType === 'stable') {
    return '<span class="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full"><i class="fas fa-minus"></i></span>';
  }
  return '';
}

// 제품 상세 동향 모달 표시
async function showProductTrends(productLink, productName) {
  try {
    const response = await axios.get(`/api/hasie/product-trends?product_link=${encodeURIComponent(productLink)}`);
    
    if (response.data.success) {
      const data = response.data;
      
      // 모달 HTML 생성
      const modalHtml = `
        <div id="trendsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeModal(event)">
          <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
            <div class="p-6">
              <!-- 헤더 -->
              <div class="flex items-start justify-between mb-6">
                <div class="flex-1">
                  <h2 class="text-2xl font-bold text-gray-800 mb-2">${escapeHtml(productName)}</h2>
                  <div class="flex items-center gap-4 text-sm text-gray-600">
                    <span><i class="fas fa-tag mr-1"></i>${data.category}</span>
                    <span><i class="fas fa-trophy mr-1"></i>현재: ${data.current_rank}위</span>
                    <span><i class="fas fa-star mr-1"></i>최고: ${data.best_rank}위</span>
                    <span><i class="fas fa-chart-line mr-1"></i>기록: ${data.total_records}회</span>
                  </div>
                </div>
                <button onclick="document.getElementById('trendsModal').remove()" 
                        class="text-gray-400 hover:text-gray-600 transition">
                  <i class="fas fa-times text-2xl"></i>
                </button>
              </div>
              
              <!-- 차트 영역 -->
              <div class="mb-6">
                <canvas id="trendsChart" height="100"></canvas>
              </div>
              
              <!-- 순위 이력 테이블 -->
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="border-b-2 border-gray-200">
                      <th class="text-left py-3 px-4 font-semibold text-gray-700">날짜</th>
                      <th class="text-center py-3 px-4 font-semibold text-gray-700">순위</th>
                      <th class="text-center py-3 px-4 font-semibold text-gray-700">변동</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.trends.map(trend => `
                      <tr class="border-b border-gray-100 hover:bg-gray-50">
                        <td class="py-3 px-4">${formatDate(trend.created_at)}</td>
                        <td class="text-center py-3 px-4 font-semibold">${trend.rank}위</td>
                        <td class="text-center py-3 px-4">${getRankChangeIndicator(trend.rank_change, trend.change_type)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // 모달 추가
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      
      // Chart.js로 그래프 그리기
      drawTrendsChart(data.trends);
    }
  } catch (error) {
    console.error('동향 로드 실패:', error);
    alert('순위 동향을 불러오는데 실패했습니다.');
  }
}

// 모달 닫기
function closeModal(event) {
  if (event.target.id === 'trendsModal') {
    document.getElementById('trendsModal').remove();
  }
}

// Chart.js로 순위 변동 차트 그리기
function drawTrendsChart(trends) {
  const ctx = document.getElementById('trendsChart').getContext('2d');
  
  const labels = trends.map(t => formatDate(t.created_at));
  const data = trends.map(t => t.rank);
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '순위',
        data: data,
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(147, 51, 234)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          },
          callbacks: {
            label: function(context) {
              return '순위: ' + context.parsed.y + '위';
            }
          }
        }
      },
      scales: {
        y: {
          reverse: true, // 순위는 낮을수록 좋으므로 역순
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return value + '위';
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}
