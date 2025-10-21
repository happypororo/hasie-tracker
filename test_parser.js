// 파싱 테스트
const testMessage = `W컨셉 베스트 아우터

브랜드 : 하시에
순위 : 82
상품명 : LIGHT WEIGHT HOODED GOOSE DOWN COAT [BLACK]
링크 : https://m.wconcept.co.kr/Product/306157288

브랜드 : 하시에
순위 : 96
상품명 : (2차 리오더) HANDMADE CASHMERE DOUBLE COAT [3COLORS]
링크 : https://m.wconcept.co.kr/Product/303596346

W컨셉 베스트 데님

브랜드 : 하시에
순위 : 106
상품명 : SLIM STRAIGHT FIT DENIM PANTS [BLUE][BLACK]
링크 : https://m.wconcept.co.kr/Product/307124148`;

// 카테고리별 분할
const categoryBlocks = testMessage.split(/(?=W컨셉 베스트\s+)/);
console.log('카테고리 블록 개수:', categoryBlocks.length);
categoryBlocks.forEach((block, i) => {
  console.log(`블록 ${i} 길이:`, block.length, '- 시작:', block.substring(0, 20));
});

// 첫 번째 카테고리 (아우터) 파싱
const block1 = categoryBlocks[1];
console.log('\n=== 아우터 블록 ===');
console.log(block1);

const productBlocks = block1.split(/(?=브랜드\s*:\s*하시에)/g);
console.log('\n상품 블록 개수:', productBlocks.length);

productBlocks.forEach((block, i) => {
  console.log(`\n--- 상품 ${i} ---`);
  console.log('길이:', block.length);
  console.log('내용:', block.substring(0, 100));
  
  // 순위
  const rankMatch = block.match(/순위\s*:\s*(\d+)/);
  console.log('순위:', rankMatch ? rankMatch[1] : 'NOT FOUND');
  
  // 상품명
  const productNameMatch = block.match(/상품명\s*:\s*(.+?)(?:\n|$)/);
  console.log('상품명:', productNameMatch ? productNameMatch[1] : 'NOT FOUND');
  
  // 링크
  const linkMatch = block.match(/링크\s*:\s*(https?:\/\/[^\s]+)/);
  console.log('링크:', linkMatch ? linkMatch[1] : 'NOT FOUND');
});

// 데님 블록 (1개만)
console.log('\n\n=== 데님 블록 ===');
const block3 = categoryBlocks[2];
console.log(block3);

const denimBlocks = block3.split(/(?=브랜드\s*:\s*하시에)/g);
console.log('\n상품 블록 개수:', denimBlocks.length);
