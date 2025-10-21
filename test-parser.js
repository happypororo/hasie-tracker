// 텔레그램 메시지 파싱 테스트

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
상품명 : DENIM STRAIGHT FIT DENIM PANTS [BLUE][BLACK]
링크 : https://m.wconcept.co.kr/Product/307112414`;

// 현재 파싱 로직
const categoryBlocks = testMessage.split(/(?=W컨셉 베스트\s+)/);
console.log('=== Category Blocks ===');
console.log('Total blocks:', categoryBlocks.length);
categoryBlocks.forEach((block, i) => {
  console.log(`\n--- Block ${i} ---`);
  console.log(block.substring(0, 100));
});

// 각 카테고리 블록에서 제품 블록 추출
console.log('\n\n=== Product Blocks ===');
categoryBlocks.forEach((catBlock, catIdx) => {
  const categoryMatch = catBlock.match(/W컨셉 베스트\s+(.+?)(?:\n|$)/i);
  if (categoryMatch) {
    const category = categoryMatch[1].trim();
    console.log(`\nCategory: ${category}`);
    
    const productBlocks = catBlock.split(/(?=브랜드\s*:\s*하시에)/g);
    console.log(`Product blocks: ${productBlocks.length}`);
    
    productBlocks.forEach((block, idx) => {
      if (block.includes('브랜드 : 하시에') || block.includes('브랜드: 하시에')) {
        const rankMatch = block.match(/순위\s*:\s*(\d+)/);
        const productNameMatch = block.match(/상품명\s*:\s*(.+?)(?:\n|$)/);
        const linkMatch = block.match(/링크\s*:\s*(https?:\/\/[^\s]+)/);
        
        if (rankMatch && productNameMatch && linkMatch) {
          console.log(`  ${rankMatch[1]}위: ${productNameMatch[1].substring(0, 30)}...`);
        }
      }
    });
  }
});
