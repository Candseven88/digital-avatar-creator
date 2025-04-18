export default async function handler(req, res) {
    const { url, method, body } = req.body;
    
    try {
      const response = await fetch(`https://api.d-id.com/${url}`, {
        method: method || 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.DID_API_KEY}`,
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