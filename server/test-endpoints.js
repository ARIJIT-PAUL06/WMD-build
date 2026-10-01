async function runTests() {
  console.log('Testing Endpoints...');
  try {
    const res1 = await fetch('http://localhost:3001/api/air-quality?city=Delhi%20(DTU%20/%20Bawana)');
    const d1 = await res1.json();
    console.log('✅ 1. Air Quality endpoint:', d1.success ? 'PASSED' : 'FAILED', '| City:', d1.data?.city, '| AQI:', d1.data?.aqi);

    const res2 = await fetch('http://localhost:3001/api/history?city=Delhi%20(DTU%20/%20Bawana)');
    const d2 = await res2.json();
    console.log('✅ 2. DynamoDB history endpoint:', d2.success ? 'PASSED' : 'FAILED', '| Records count:', d2.data?.length);

    const res3 = await fetch('http://localhost:3001/api/sensor-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: 'esp32-dtu-01',
        city: 'Delhi (DTU / Bawana)',
        aqi: 310,
        pm25: 180,
        pm10: 290
      }),
    });
    const d3 = await res3.json();
    console.log('✅ 3. IoT Core ingest endpoint:', d3.success ? 'PASSED' : 'FAILED', '| Message:', d3.message);
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

runTests();
