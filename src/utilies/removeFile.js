import fs from 'fs'
// Function to delete file from disk
export const deleteFileFromDisk = (filePath) => {
    const correctedPath = filePath.replace('\\src\\modules\\lecture', '');
    console.log(correctedPath);
    
    fs.unlink(correctedPath, (err) => {
        if (err) {
            console.error(`Error removing file: ${err}`);
        } else {
            console.log(`File deleted successfully: ${filePath}`);
        }
    });
};