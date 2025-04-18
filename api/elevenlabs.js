export default async function handler(req, res) {
    const { url, method, body, voiceId } = req.body;
    
    let apiUrl = `https://api.elevenlabs.io/v1/${url}`;
    if (voiceId) {
      apiUrl = `https://api.elevenlabs.io/v1/${url}/${voiceId}`;
    }
    
    try {
      const response = await fetch(apiUrl, {
        method: method || 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }