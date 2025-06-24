export function supportsWebkitDirectory() {
    const input = document.createElement('input');
    return 'webkitdirectory' in input;
  }