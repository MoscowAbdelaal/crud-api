const ollama = require('ollama');

// Change this to 'tinyllama' if you have low RAM
const MODEL = 'llama3.2';

async function enrichWithAI(description, title) {
    if (!description || description.length < 10) {
        return { category: 'Unknown', summary: 'No description available' };
    }

    try {
        const prompt = `
You are a book classifier. Given the title and description below, output ONLY valid JSON with:
- "category": one word (e.g. Fiction, Science, History, Fantasy, Romance, Mystery, Biography, Self-Help, Technology, Philosophy, Poetry, Travel, Business, Health, Art, Cooking, Education, Psychology, Politics)
- "summary": a 2-3 sentence summary

Title: ${title}
Description: ${description.slice(0, 800)}

JSON:`;

        const response = await ollama.chat({
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            stream: false
        });

        const text = response.message.content.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                category: parsed.category || 'Unknown',
                summary: parsed.summary || description.slice(0, 150)
            };
        }

        return { category: 'Unknown', summary: description.slice(0, 150) };
    } catch (error) {
        console.error('AI enrichment error:', error.message);
        return { category: 'Unknown', summary: description ? description.slice(0, 150) : '' };
    }
}

module.exports = { enrichWithAI };
