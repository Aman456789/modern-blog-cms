import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const MediaSchema = new mongoose.Schema(
  {
    kind: { type: String, required: true },
    url: { type: String, required: true },
  },
  { strict: false }
);

const Media = mongoose.model('Media', MediaSchema);

function getFileType(url) {
  if (!url) return 'IMAGE';
  const ext = url.split('.').pop().toLowerCase();
  if (['mp4', 'webm', 'ogg'].includes(ext)) return 'VIDEO';
  if (['mp3', 'wav', 'mpeg', 'aac', 'm4a'].includes(ext)) return 'AUDIO';
  if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'DOCUMENT';
  return 'IMAGE';
}

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected. Scanning media records...');
  
  const items = await Media.find();
  let updatedCount = 0;
  
  for (const item of items) {
    const correctKind = getFileType(item.url);
    if (item.kind !== correctKind) {
      console.log(`Updating ${item.url} from ${item.kind} to ${correctKind}`);
      item.kind = correctKind;
      await item.save();
      updatedCount++;
    }
  }
  
  console.log(`Finished. Updated ${updatedCount} records.`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
