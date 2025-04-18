export const config = {
    api: {
      bodyParser: false,
    },
  };
  
  import fs from "fs";
  import path from "path";
  import formidable from "formidable";
  
  // 在 Vercel 上只保留 1 小时，用于临时读取 URL
  const uploadDir = path.join("/tmp");
  
  export default async function handler(req, res) {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
  
    const form = new formidable.IncomingForm({ uploadDir, keepExtensions: true });
  
    form.parse(req, (err, fields, files) => {
      if (err) {
        console.error("Form error", err);
        return res.status(500).json({ error: "Upload failed" });
      }
  
      const file = files.file;
      if (!file || !file[0]) {
        return res.status(400).json({ error: "No file uploaded" });
      }
  
      const filePath = file[0].filepath;
      const fileUrl = `${req.headers.origin}/api/audio-file?path=${encodeURIComponent(filePath)}`;
  
      return res.status(200).json({ url: fileUrl });
    });
  }