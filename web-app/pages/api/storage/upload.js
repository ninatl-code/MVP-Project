import { supabase } from '../../../lib/supabaseClient';

/**
 * Upload file to Supabase Storage
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { 
      bucket = 'uploads',
      path,
      file_base64,
      file_name,
      content_type,
      user_id,
    } = req.body;

    if (!file_base64 || !file_name || !user_id) {
      return res.status(400).json({ 
        error: 'file_base64, file_name, et user_id requis' 
      });
    }

    // Decode base64
    const buffer = Buffer.from(file_base64, 'base64');

    // Generate unique path
    const timestamp = Date.now();
    const extension = file_name.split('.').pop();
    const uniqueName = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const fullPath = path ? `${path}/${uniqueName}` : `${user_id}/${uniqueName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fullPath, buffer, {
        contentType: content_type || 'application/octet-stream',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    res.status(200).json({
      success: true,
      path: data.path,
      url: urlData.publicUrl,
      bucket,
    });

  } catch (err) {
    console.error('Erreur upload:', err);
    res.status(500).json({ error: err.message });
  }
}

// Increase body size limit for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
