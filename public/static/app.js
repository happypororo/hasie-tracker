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

// 순위 데이터 로드
async function loadRankings(category = null) {
  try {
    currentCategory = category;
    
    let url = '/api/hasie/latest?limit=50';
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
      
      html += `
        <div class="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-5 border-l-4 ${rankColor}">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3">
              ${rankBadge}
              <div>
                <div class="text-2xl font-bold text-gray-800">${item.rank}위</div>
                <div class="text-xs text-gray-500">${formatDate(item.created_at)}</div>
              </div>
            </div>
          </div>
          
          <h4 class="text-sm font-semibold text-gray-800 mb-3 line-clamp-2 min-h-[40px]">
            ${escapeHtml(item.product_name)}
          </h4>
          
          <a href="${item.product_link}" 
             target="_blank" 
             class="inline-flex items-center text-sm text-purple-600 hover:text-purple-800 font-medium transition">
            상품 보기
            <i class="fas fa-external-link-alt ml-1 text-xs"></i>
          </a>
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
