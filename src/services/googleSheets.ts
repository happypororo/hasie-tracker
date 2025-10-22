/**
 * Google Sheets 백업/복원 서비스
 * 
 * JWT 방식으로 Google Sheets API 인증
 * Service Account를 사용하여 안전하게 접근
 */

interface GoogleServiceAccount {
  client_email: string;
  private_key: string;
}

interface SheetRow {
  [key: string]: string | number | null;
}

/**
 * JWT 토큰 생성 (Google OAuth 2.0)
 */
async function createJWT(serviceAccount: GoogleServiceAccount): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // Base64 URL 인코딩
  const base64UrlEncode = (obj: any) => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const headerEncoded = base64UrlEncode(header);
  const payloadEncoded = base64UrlEncode(payload);
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // RS256 서명 생성
  const privateKey = serviceAccount.private_key;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${signatureEncoded}`;
}

/**
 * PEM 형식의 private key를 ArrayBuffer로 변환
 */
function pemToBinary(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Access Token 가져오기
 */
async function getAccessToken(serviceAccount: GoogleServiceAccount): Promise<string> {
  const jwt = await createJWT(serviceAccount);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

/**
 * Google Sheets에 데이터 쓰기
 */
export async function writeToSheet(
  spreadsheetId: string,
  sheetName: string,
  data: SheetRow[],
  serviceAccount: GoogleServiceAccount
): Promise<void> {
  const accessToken = await getAccessToken(serviceAccount);

  // 헤더 추출 (첫 번째 행의 키들)
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  
  // 데이터를 2D 배열로 변환
  const values = [
    headers, // 헤더 행
    ...data.map(row => headers.map(header => row[header] ?? ''))
  ];

  // 기존 데이터 모두 삭제
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  // 새 데이터 쓰기
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to write to sheet: ${error}`);
  }
}

/**
 * Google Sheets에서 데이터 읽기
 */
export async function readFromSheet(
  spreadsheetId: string,
  sheetName: string,
  serviceAccount: GoogleServiceAccount
): Promise<SheetRow[]> {
  const accessToken = await getAccessToken(serviceAccount);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to read from sheet: ${error}`);
  }

  const data = await response.json() as { values?: string[][] };
  const values = data.values || [];

  if (values.length === 0) {
    return [];
  }

  // 첫 번째 행을 헤더로 사용
  const headers = values[0];
  
  // 나머지 행을 객체 배열로 변환
  return values.slice(1).map(row => {
    const obj: SheetRow = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || null;
    });
    return obj;
  });
}

/**
 * 시트가 존재하는지 확인하고, 없으면 생성
 */
export async function ensureSheetExists(
  spreadsheetId: string,
  sheetName: string,
  serviceAccount: GoogleServiceAccount
): Promise<void> {
  const accessToken = await getAccessToken(serviceAccount);

  // 스프레드시트 정보 가져오기
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get spreadsheet info: ${response.statusText}`);
  }

  const spreadsheet = await response.json() as { sheets: Array<{ properties: { title: string } }> };
  const sheetExists = spreadsheet.sheets.some(sheet => sheet.properties.title === sheetName);

  if (!sheetExists) {
    // 시트 생성
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: {
                title: sheetName
              }
            }
          }]
        })
      }
    );
  }
}
