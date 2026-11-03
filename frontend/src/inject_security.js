const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const dir = 'c:/fotographiya-blog/frontend/src';

walkDir(dir, function(filePath) {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    if (content.includes('<video') || content.includes('<audio')) {
      let originalContent = content;
      
      // Replace <video 
      content = content.replace(/<video /g, '<video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} ');
      content = content.replace(/<video\n/g, '<video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}\n');
      content = content.replace(/<video>/g, '<video controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}>');
      
      // Replace <audio 
      content = content.replace(/<audio /g, '<audio controlsList="nodownload" onContextMenu={(e) => e.preventDefault()} ');
      content = content.replace(/<audio\n/g, '<audio controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}\n');
      content = content.replace(/<audio>/g, '<audio controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}>');

      // Prevent double injections if it was run twice
      content = content.replace(/controlsList="nodownload" onContextMenu={\(e\) => e.preventDefault\(\)} controlsList="nodownload" onContextMenu={\(e\) => e.preventDefault\(\)}/g, 'controlsList="nodownload" onContextMenu={(e) => e.preventDefault()}');

      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated ${filePath}`);
      }
    }
  }
});
