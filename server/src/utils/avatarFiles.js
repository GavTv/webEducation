const fs = require('fs');
const path = require('path');

const uploadsRoot = path.join(__dirname, '../../public/uploads');

function resolveAvatarPath(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== 'string') return null;
  if (!avatarUrl.startsWith('/uploads/')) return null;

  const relative = avatarUrl.replace(/^\/uploads\//, '');
  const fullPath = path.join(uploadsRoot, relative);

  if (!fullPath.startsWith(uploadsRoot)) return null;

  return fullPath;
}

function avatarFileExists(avatarUrl) {
  const filePath = resolveAvatarPath(avatarUrl);
  if (!filePath) return false;

  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function deleteAvatarFile(avatarUrl) {
  const filePath = resolveAvatarPath(avatarUrl);
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.log('======== deleteAvatarFile =========');
    console.log(error.message);
  }
}

function sanitizeAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  return avatarFileExists(avatarUrl) ? avatarUrl : null;
}

module.exports = {
  avatarFileExists,
  deleteAvatarFile,
  sanitizeAvatarUrl,
};
