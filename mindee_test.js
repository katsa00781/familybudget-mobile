// Mindee API teszt script
const testMindeeAPI = async () => {
  const apiKey = '1df39aca04173a5be52ba8d0662ee99b';
  
  try {
    // Egyszerű teszt kép (base64)
    const testBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='; // 1x1 fehér pixel
    
    console.log('🧪 Mindee API teszt indítása...');
    console.log('📝 API kulcs:', apiKey.substring(0, 8) + '...');
    
    const response = await fetch(
      'https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: testBase64,
        }),
      }
    );

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Mindee API hiba:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ Mindee API válasz:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Hálózati hiba:', error);
  }
};

testMindeeAPI();
