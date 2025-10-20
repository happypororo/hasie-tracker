// 하시에 순위 트래커 - 심플 흑백 버전

let currentCategory = null;
let currentTab = 'latest'; // 'latest' 또는 'outrank'

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadCategories();
  loadRankings();
  
  // 5분마다 자동 새로고침
  setInterval(() => {
    loadStats();
    if (currentTab === 'latest') {
      loadRankings(currentCategory);
    } else {
      loadOutRank(currentCategory);
    }
  }, 5 * 60 * 1000);
});

// 탭 전환
function switchTab(tab) {
  currentTab = tab;
  
  // 탭 버튼 스타일 변경
  if (tab === 'latest') {
    document.getElementById('tabLatest').className = 'text-lg font-bold text-black border-b-2 border-black pb-1';
    document.getElementById('tabOutrank').className = 'text-lg font-bold text-gray-400 hover:text-black pb-1';
    document.getElementById('rankingsTab').classList.remove('hidden');
    document.getElementById('outrankTab').classList.add('hidden');
    loadRankings(currentCategory);
  } else {
    document.getElementById('tabLatest').className = 'text-lg font-bold text-gray-400 hover:text-black pb-1';
    document.getElementById('tabOutrank').className = 'text-lg font-bold text-black border-b-2 border-black pb-1';
    document.getElementById('rankingsTab').classList.add('hidden');
    document.getElementById('outrankTab').classList.remove('hidden');
    loadOutRank(currentCategory);
  }
}

// 통계 데이터 로드
async function loadStats() {
  try {
    const response = await axios.get('/api/hasie/stats');
    
    if (response.data.success) {
      const stats = response.data.stats;
      
      document.getElementById('totalCategories').textContent = stats.length;
      
      const totalRankings = stats.reduce((sum, s) => sum + s.total_count, 0);
      document.getElementById('totalRankings').textContent = totalRankings;
      
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
      
      categories.forEach(category => {
        const button = document.createElement('button');
        button.textContent = category;
        button.className = 'px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-100 transition';
        button.onclick = () => loadRankings(category);
        container.appendChild(button);
      });
    }
  } catch (error) {
    console.error('카테고리 로드 실패:', error);
  }
}

// 순위 데이터 로드 (최신 순위만, 순위 변동 정보 포함)
async function loadRankings(category = null) {
  try {
    currentCategory = category;
    
    let url = '/api/hasie/latest-with-changes';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    
    const response = await axios.get(url);
    
    if (response.data.success) {
      displayRankings(response.data.rankings);
    }
  } catch (error) {
    console.error('순위 로드 실패:', error);
    document.getElementById('rankingsTab').innerHTML = `
      <p class="text-red-600 text-center py-8 text-sm">데이터를 불러오는데 실패했습니다.</p>
    `;
  }
}

// Out Rank 데이터 로드
async function loadOutRank(category = null) {
  try {
    currentCategory = category;
    
    let url = '/api/hasie/out-rank';
    if (category) {
      url += `?category=${encodeURIComponent(category)}`;
    }
    
    const response = await axios.get(url);
    
    if (response.data.success) {
      displayOutRank(response.data.out_rankings);
    }
  } catch (error) {
    console.error('Out Rank 로드 실패:', error);
    document.getElementById('outrankTab').innerHTML = `
      <p class="text-red-600 text-center py-8 text-sm">데이터를 불러오는데 실패했습니다.</p>
    `;
  }
}

// Out Rank 데이터 표시
function displayOutRank(outRankings) {
  const container = document.getElementById('outrankTab');
  
  if (outRankings.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500 text-center py-8 text-sm">순위권 이탈 제품이 없습니다.</p>
    `;
    return;
  }
  
  // 카테고리별로 그룹화
  const groupedByCategory = {};
  outRankings.forEach(item => {
    if (!groupedByCategory[item.category]) {
      groupedByCategory[item.category] = [];
    }
    groupedByCategory[item.category].push(item);
  });
  
  // HTML 생성
  let html = '';
  
  for (const [category, items] of Object.entries(groupedByCategory)) {
    html += `
      <div class="p-4 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-black">${category}</h3>
          <span class="text-xs text-gray-500">${items.length}개</span>
        </div>
      </div>
    `;
    
    items.forEach(item => {
      html += `
        <div class="p-4 hover:bg-gray-50 transition">
          <div class="flex items-start gap-4">
            <!-- 마지막 순위 -->
            <div class="flex-shrink-0 w-16 text-center">
              <div class="text-2xl font-bold text-gray-400">${item.last_rank}</div>
              <div class="text-xs text-gray-400">위</div>
            </div>
            
            <!-- Out 표시 -->
            <div class="flex-shrink-0 w-16 text-center pt-1">
              <span class="text-xs font-bold text-red-600">OUT</span>
            </div>
            
            <!-- 상품 정보 -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-gray-600 mb-2 line-clamp-2">
                ${escapeHtml(item.product_name)}
              </h4>
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <a href="${item.product_link}" 
                   target="_blank" 
                   class="hover:text-black transition">
                  상품 보기 →
                </a>
                <button onclick="showProductTrends('${escapeHtml(item.product_link)}', '${escapeHtml(item.product_name)}')"
                        class="hover:text-black transition">
                  동향 차트
                </button>
                <span>이탈: ${formatDate(item.out_rank_date)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }
  
  container.innerHTML = html;
}

// 순위 데이터 표시 (심플 테이블 스타일)
function displayRankings(rankings) {
  const container = document.getElementById('rankingsTab');
  
  if (rankings.length === 0) {
    container.innerHTML = `
      <p class="text-gray-500 text-center py-8 text-sm">순위 데이터가 없습니다.</p>
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
  
  // HTML 생성 (테이블 형태)
  let html = '';
  
  for (const [category, items] of Object.entries(groupedByCategory)) {
    html += `
      <div class="p-4 bg-gray-50 border-b border-gray-200">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-black">${category}</h3>
          <span class="text-xs text-gray-500">${items.length}개</span>
        </div>
      </div>
    `;
    
    items.forEach(item => {
      const changeIndicator = getRankChangeIndicator(item.rank_change, item.change_type);
      
      html += `
        <div class="p-4 hover:bg-gray-50 transition">
          <div class="flex items-start gap-4">
            <!-- 순위 -->
            <div class="flex-shrink-0 w-16 text-center">
              <div class="text-2xl font-bold text-black">${item.rank}</div>
              <div class="text-xs text-gray-400">위</div>
            </div>
            
            <!-- 순위 변동 -->
            <div class="flex-shrink-0 w-16 text-center pt-1">
              ${changeIndicator}
            </div>
            
            <!-- 상품 정보 -->
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-black mb-2 line-clamp-2">
                ${escapeHtml(item.product_name)}
              </h4>
              <div class="flex items-center gap-3 text-xs text-gray-500">
                <a href="${item.product_link}" 
                   target="_blank" 
                   class="hover:text-black transition">
                  상품 보기 →
                </a>
                <button onclick="showProductTrends('${escapeHtml(item.product_link)}', '${escapeHtml(item.product_name)}')"
                        class="hover:text-black transition">
                  동향 차트
                </button>
                <span>${formatDate(item.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      `;
    });
  }
  
  container.innerHTML = html;
}

// 순위 변동 표시 (심플 +/- 스타일)
function getRankChangeIndicator(change, changeType) {
  if (changeType === 'new') {
    return '<span class="text-xs font-bold text-black">NEW</span>';
  } else if (changeType === 'up') {
    return `<span class="text-xs font-bold text-black">+${change}</span>`;
  } else if (changeType === 'down') {
    return `<span class="text-xs font-bold text-black">${change}</span>`;
  } else if (changeType === 'stable') {
    return '<span class="text-xs text-gray-400">-</span>';
  }
  return '';
}

// 제품 상세 동향 모달 (심플 흑백 스타일)
async function showProductTrends(productLink, productName) {
  try {
    const response = await axios.get(`/api/hasie/product-trends?product_link=${encodeURIComponent(productLink)}`);
    
    if (response.data.success) {
      const data = response.data;
      
      const modalHtml = `
        <div id="trendsModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeModal(event)">
          <div class="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto" onclick="event.stopPropagation()">
            <!-- 헤더 -->
            <div class="border-b border-gray-200 p-6">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h2 class="text-xl font-bold text-black mb-2">${escapeHtml(productName)}</h2>
                  <div class="flex items-center gap-4 text-xs text-gray-500">
                    <span>${data.category}</span>
                    <span>현재 ${data.current_rank}위</span>
                    <span>최고 ${data.best_rank}위</span>
                    <span>${data.total_records}회 기록</span>
                  </div>
                </div>
                <button onclick="document.getElementById('trendsModal').remove()" 
                        class="text-gray-400 hover:text-black text-xl">
                  ✕
                </button>
              </div>
            </div>
            
            <!-- 차트 -->
            <div class="p-6 border-b border-gray-200">
              <canvas id="trendsChart" height="80"></canvas>
            </div>
            
            <!-- 순위 이력 -->
            <div class="p-6">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-gray-200">
                    <th class="text-left py-2 px-3 font-semibold text-black">날짜</th>
                    <th class="text-center py-2 px-3 font-semibold text-black">순위</th>
                    <th class="text-center py-2 px-3 font-semibold text-black">변동</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.trends.map(trend => `
                    <tr class="border-b border-gray-100">
                      <td class="py-2 px-3 text-gray-600">${formatDate(trend.created_at)}</td>
                      <td class="text-center py-2 px-3 font-semibold">${trend.rank}위</td>
                      <td class="text-center py-2 px-3">${getRankChangeIndicator(trend.rank_change, trend.change_type)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
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

// Chart.js - 심플 흑백 스타일
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
        borderColor: '#000000',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#000000',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2
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
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 10,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return context.parsed.y + '위';
            }
          }
        }
      },
      scales: {
        y: {
          reverse: true,
          beginAtZero: false,
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: '#000',
            callback: function(value) {
              return value + '위';
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#000'
          }
        }
      }
    }
  });
}

// 날짜 포맷
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return '방금';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}일 전`;
  
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric'
  });
}

// HTML 이스케이프
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 실시간 연동 모달 표시
function showImportModal() {
  const modalHtml = `
    <div id="importModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick="closeImportModal(event)">
      <div class="bg-white max-w-2xl w-full" onclick="event.stopPropagation()">
        <!-- 헤더 -->
        <div class="border-b border-gray-200 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-black">실시간 연동</h3>
            <button onclick="document.getElementById('importModal').remove()" 
                    class="text-gray-400 hover:text-black text-xl">
              ✕
            </button>
          </div>
        </div>
        
        <!-- 내용 -->
        <div class="p-4">
          <div class="mb-4">
            <label class="block text-sm font-semibold text-black mb-2">
              텔레그램 메시지 붙여넣기
            </label>
            <textarea 
              id="messageInput" 
              rows="12" 
              class="w-full border border-gray-300 p-3 text-sm font-mono focus:outline-none focus:border-black"
              placeholder="W컨셉 베스트 아우터

브랜드 : 하시에
순위 : 9
상품명 : CASHMERE COLLAR LIGHT DOWN JACKET
링크 : https://m.wconcept.co.kr/Product/303596201

..."
            ></textarea>
          </div>
          
          <div class="text-xs text-gray-500 mb-4">
            💡 텔레그램 채널에서 메시지를 복사해서 위에 붙여넣으세요
          </div>
          
          <!-- 버튼 -->
          <div class="flex gap-2">
            <button 
              onclick="importMessage()" 
              class="flex-1 px-4 py-2.5 bg-black text-white text-sm hover:bg-gray-800 transition"
              id="importButton">
              저장하기
            </button>
            <button 
              onclick="document.getElementById('importModal').remove()" 
              class="px-4 py-2.5 border border-gray-300 text-sm hover:bg-gray-100 transition">
              취소
            </button>
          </div>
          
          <!-- 결과 메시지 -->
          <div id="importResult" class="mt-4 hidden"></div>
        </div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('messageInput').focus();
}

// 모달 닫기
function closeImportModal(event) {
  if (event.target.id === 'importModal') {
    document.getElementById('importModal').remove();
  }
}

// 메시지 임포트 처리
async function importMessage() {
  const messageText = document.getElementById('messageInput').value.trim();
  const button = document.getElementById('importButton');
  const resultDiv = document.getElementById('importResult');
  
  if (!messageText) {
    showImportResult('메시지를 입력해주세요', 'error');
    return;
  }
  
  // 버튼 비활성화
  button.disabled = true;
  button.textContent = '처리 중...';
  resultDiv.classList.add('hidden');
  
  try {
    const response = await axios.post('/api/hasie/import', {
      messageText: messageText
    });
    
    if (response.data.success) {
      showImportResult(
        `✓ ${response.data.parsedCount}개 상품이 저장되었습니다 (${response.data.categories.join(', ')})`,
        'success'
      );
      
      // 2초 후 모달 닫고 데이터 새로고침
      setTimeout(() => {
        document.getElementById('importModal').remove();
        loadStats();
        loadRankings(currentCategory);
      }, 2000);
    } else {
      showImportResult('✗ ' + response.data.error, 'error');
    }
  } catch (error) {
    console.error('Import error:', error);
    showImportResult('✗ 데이터 저장에 실패했습니다', 'error');
  } finally {
    button.disabled = false;
    button.textContent = '저장하기';
  }
}

// 결과 메시지 표시
function showImportResult(message, type) {
  const resultDiv = document.getElementById('importResult');
  resultDiv.classList.remove('hidden');
  
  if (type === 'success') {
    resultDiv.className = 'mt-4 p-3 bg-green-50 border border-green-200 text-green-800 text-sm';
  } else {
    resultDiv.className = 'mt-4 p-3 bg-red-50 border border-red-200 text-red-800 text-sm';
  }
  
  resultDiv.textContent = message;
}
