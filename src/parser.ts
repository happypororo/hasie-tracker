// 텔레그램 메시지 파싱 로직

export interface HasieRanking {
  category: string;
  rank: number;
  productName: string;
  productLink: string;
}

/**
 * 텔레그램 메시지에서 하시에 순위 정보 추출
 * 
 * 메시지 형식:
 * W컨셉 베스트 아우터
 * 
 * 브랜드 : 하시에
 * 순위 : 9
 * 상품명 : (5차 리오더) CASHMERE COLLAR LIGHT DOWN JACKET [IVORY][BLACK]
 * 링크 : https://m.wconcept.co.kr/Product/303596201
 */
export function parseHasieRankings(message: string): HasieRanking[] {
  const rankings: HasieRanking[] = [];
  
  // 카테고리 추출 (예: "W컨셉 베스트 아우터" -> "아우터")
  const categoryMatch = message.match(/W컨셉 베스트\s+(.+?)(?:\n|$)/i);
  if (!categoryMatch) {
    return rankings;
  }
  
  const category = categoryMatch[1].trim();
  
  // 각 상품 블록 추출 (브랜드부터 링크까지)
  const productBlocks = message.split(/(?=브랜드\s*:\s*하시에)/g);
  
  for (const block of productBlocks) {
    // 하시에 브랜드만 처리
    if (!block.includes('브랜드 : 하시에') && !block.includes('브랜드: 하시에')) {
      continue;
    }
    
    // 순위 추출
    const rankMatch = block.match(/순위\s*:\s*(\d+)/);
    if (!rankMatch) continue;
    const rank = parseInt(rankMatch[1], 10);
    
    // 상품명 추출
    const productNameMatch = block.match(/상품명\s*:\s*(.+?)(?:\n|$)/);
    if (!productNameMatch) continue;
    const productName = productNameMatch[1].trim();
    
    // 링크 추출
    const linkMatch = block.match(/링크\s*:\s*(https?:\/\/[^\s]+)/);
    if (!linkMatch) continue;
    const productLink = linkMatch[1].trim();
    
    rankings.push({
      category,
      rank,
      productName,
      productLink
    });
  }
  
  return rankings;
}

/**
 * 메시지에서 모든 카테고리의 순위 추출 (여러 카테고리가 포함된 경우)
 */
export function parseMultipleCategoryRankings(message: string): HasieRanking[] {
  const allRankings: HasieRanking[] = [];
  
  // 카테고리별로 메시지 분할 (예: "W컨셉 베스트 아우터", "W컨셉 베스트 셔츠")
  const categoryBlocks = message.split(/(?=W컨셉 베스트\s+)/);
  
  for (const block of categoryBlocks) {
    const rankings = parseHasieRankings(block);
    allRankings.push(...rankings);
  }
  
  return allRankings;
}
