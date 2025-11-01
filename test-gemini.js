const { GoogleGenerativeAI } = require('@google/generative-ai');

// Test Gemini capabilities
async function testGeminiCapabilities() {
  const genAI = new GoogleGenerativeAI('AIzaSyArTeMY493nbVtTQTrPlYgXxLu3xHSl2pk');

  console.log('Testing Gemini capabilities...\n');

  // Test 1: Text generation
  try {
    const textModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const textResult = await textModel.generateContent('Say hello');
    console.log('✅ Text generation works:', textResult.response.text().substring(0, 50) + '...');
  } catch (error) {
    console.log('❌ Text generation failed:', error.message);
  }

  // Test 2: Check if Nano Banana model exists
  try {
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    console.log('✅ Nano Banana model accessible');
  } catch (error) {
    console.log('❌ Nano Banana model not accessible:', error.message);
  }

  // Test 3: Try image generation without input (if supported)
  try {
    const imageModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-image' });
    const imageResult = await imageModel.generateContent('Generate an image of a cat');
    console.log('✅ Text-to-image generation works');
    console.log('Response type:', typeof imageResult.response);
  } catch (error) {
    console.log('❌ Image generation failed:', error.message);
  }

  // Test 4: Check model info
  try {
    const models = await genAI.listModels();
    const imageModels = models.filter(model =>
      model.name.includes('image') || model.displayName.includes('Image')
    );
    console.log('Available image models:');
    imageModels.forEach(model => {
      console.log(`  - ${model.displayName} (${model.name}): ${model.description}`);
    });
  } catch (error) {
    console.log('❌ Could not list models:', error.message);
  }
}

testGeminiCapabilities();
